const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const { verifyEngineerAccess } = require("../../util/engineerPermissions");
const { getISTDate } = require("../../util/dateUtils");

/* ---------------- GET WAGE QUEUE (PRESENT LABOURERS) ---------------- */
router.get("/queue", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId, date } = req.query;
    const reportDate = date || getISTDate();

    if (!projectId)
      return res.status(400).json({ error: "projectId is required" });

    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) return res.status(403).json({ error: access.error });

    // Get approved attendance records for which wages aren't set yet
    const result = await pool.query(
      `SELECT a.id as attendance_id, a.labour_id, l.name, l.phone, l.skill_type, w.rate, w.id as wage_id
             FROM attendance a
             JOIN labours l ON a.labour_id = l.id
             LEFT JOIN wages w ON a.id = w.attendance_id
             WHERE a.project_id = $1 
               AND a.attendance_date = $2 
               AND a.status = 'APPROVED'`,
      [projectId, reportDate],
    );

    res.json({ queue: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- SUBMIT WAGE RATE ---------------- */
router.post("/submit", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { attendanceId, labourId, projectId } = req.body;

    if (!attendanceId)
      return res.status(400).json({ error: "Missing required fields" });

    // Verify attendance exists and is approved
    const attCheck = await pool.query(
      `SELECT a.project_id, a.work_hours, l.skill_type, l.categories[1] as category
             FROM attendance a
             JOIN labours l ON a.labour_id = l.id
             WHERE a.id = $1 AND a.status = 'APPROVED'`,
      [attendanceId],
    );
    if (attCheck.rows.length === 0)
      return res.status(404).json({ error: "Approved attendance not found" });

    const { project_id, work_hours, skill_type, category } = attCheck.rows[0];

    const access = await verifyEngineerAccess(engineerId, project_id);
    if (!access.allowed) return res.status(403).json({ error: access.error });

    // Fetch hourly rate from wage_rates
    const rateRes = await pool.query(
      `SELECT hourly_rate FROM wage_rates 
             WHERE project_id = $1 AND skill_type = $2 AND category = $3`,
      [project_id, skill_type, category],
    );

    if (rateRes.rows.length === 0) {
      return res.status(400).json({
        error: "Wage rate not configured for this skill/category",
        skill_type,
        category,
      });
    }

    const hourly_rate = rateRes.rows[0].hourly_rate;
    const total_amount = hourly_rate * (work_hours || 0);

    const result = await pool.query(
      `INSERT INTO wages (attendance_id, labour_id, project_id, wage_type, rate, total_amount, worked_hours, status)
             VALUES ($1, $2, $3, 'HOURLY', $4, $5, $6, 'APPROVED')
             ON CONFLICT (attendance_id) 
             DO UPDATE SET rate = $4, total_amount = $5, worked_hours = $6, status = 'APPROVED'
             RETURNING *`,
      [
        attendanceId,
        labourId,
        projectId,
        hourly_rate,
        total_amount,
        work_hours,
      ],
    );

    res.json({ wage: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET WAGES FOR PROJECT ---------------- */
// View all wages for labours in engineer's projects
router.get("/", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId, status } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) return res.status(403).json({ error: access.error });

    let query = `
      SELECT w.*, 
             l.name as labour_name, 
             l.phone as labour_phone,
             l.skill_type,
             a.attendance_date,
             a.check_in_time,
             a.check_out_time,
             m.name as approved_by_name
      FROM wages w
      JOIN labours l ON w.labour_id = l.id
      JOIN attendance a ON w.attendance_id = a.id
      LEFT JOIN managers m ON w.approved_by = m.id
      WHERE w.project_id = $1
    `;

    const params = [projectId];

    if (status) {
      query += ` AND w.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY w.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ wages: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- MARK WAGE AS READY FOR PAYMENT ---------------- */
// Engineer marks that payment has been made to the labour
router.patch("/:id/ready-for-payment", engineerCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const engineerId = req.user.id;
    const { id } = req.params;

    await client.query("BEGIN");

    // Verify wage exists and engineer has access
    const wageCheck = await client.query(
      `SELECT w.*, p.id as project_id
       FROM wages w
       JOIN projects p ON w.project_id = p.id
       JOIN project_site_engineers pse ON p.id = pse.project_id
       WHERE w.id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [id, engineerId],
    );

    if (wageCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Wage not found or you do not have access to this project",
      });
    }

    const wage = wageCheck.rows[0];

    // Only APPROVED wages can be marked as ready for payment
    if (wage.status !== "APPROVED") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Only approved wages can be marked as ready for payment",
      });
    }

    // Mark as ready for payment
    const result = await client.query(
      `UPDATE wages 
       SET is_ready_for_payment = true
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    await client.query("COMMIT");

    res.json({
      message: "Wage marked as ready for payment",
      wage: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- MARK WAGE AS PAID ---------------- */
// Engineer confirms that payment has been completed
router.patch("/:id/mark-paid", engineerCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const engineerId = req.user.id;
    const { id } = req.params;

    await client.query("BEGIN");

    // Verify wage exists and engineer has access
    const wageCheck = await client.query(
      `SELECT w.*, p.id as project_id
       FROM wages w
       JOIN projects p ON w.project_id = p.id
       JOIN project_site_engineers pse ON p.id = pse.project_id
       WHERE w.id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [id, engineerId],
    );

    if (wageCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Wage not found or you do not have access to this project",
      });
    }

    const wage = wageCheck.rows[0];

    // Only APPROVED wages can be marked as paid
    if (wage.status !== "APPROVED") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Only approved wages can be marked as paid",
      });
    }

    // Already paid
    if (wage.paid_at) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "This wage has already been marked as paid",
      });
    }

    // Mark as paid
    const result = await client.query(
      `UPDATE wages 
       SET is_ready_for_payment = true, paid_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    await client.query("COMMIT");

    res.json({
      message: "Wage marked as paid",
      wage: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GET PAYMENT SUMMARY ---------------- */
// Get summary of wages by payment status
router.get("/payment-summary", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) return res.status(403).json({ error: access.error });

    const result = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
         COUNT(*) FILTER (WHERE status = 'APPROVED' AND NOT is_ready_for_payment) as approved_unpaid_count,
         COUNT(*) FILTER (WHERE status = 'APPROVED' AND is_ready_for_payment AND paid_at IS NULL) as ready_for_payment_count,
         COUNT(*) FILTER (WHERE paid_at IS NOT NULL) as paid_count,
         COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected_count,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'APPROVED' AND NOT is_ready_for_payment), 0) as approved_unpaid_amount,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'APPROVED' AND is_ready_for_payment AND paid_at IS NULL), 0) as ready_for_payment_amount,
         COALESCE(SUM(total_amount) FILTER (WHERE paid_at IS NOT NULL), 0) as paid_amount
       FROM wages
       WHERE project_id = $1`,
      [projectId],
    );

    res.json({ summary: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
