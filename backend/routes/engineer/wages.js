const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");

// Check if engineer is ACTIVE in project
async function engineerProjectStatusCheck(engineerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM project_site_engineers
     WHERE site_engineer_id = $1 
       AND project_id = $2 
       AND status = 'ACTIVE'`,
    [engineerId, projectId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- GET WAGE QUEUE (PRESENT LABOURERS) ---------------- */
router.get("/queue", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId, date } = req.query;
    const reportDate = date || new Date().toISOString().split("T")[0];

    if (!projectId)
      return res.status(400).json({ error: "projectId is required" });

    const isActive = await engineerProjectStatusCheck(engineerId, projectId);
    if (!isActive) return res.status(403).json({ error: "Access denied." });

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

    const isActive = await engineerProjectStatusCheck(engineerId, project_id);
    if (!isActive) return res.status(403).json({ error: "Access denied." });

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
             VALUES ($1, $2, $3, 'HOURLY', $4, $5, $6, 'PENDING')
             ON CONFLICT (attendance_id) 
             DO UPDATE SET rate = $4, total_amount = $5, worked_hours = $6, status = 'PENDING'
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

module.exports = router;
