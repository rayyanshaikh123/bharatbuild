const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

/* ---------------- GET APPROVED ATTENDANCE FOR WAGES ---------------- */
// Gets attendance records that are APPROVED but don't have a wage record yet
router.get("/unprocessed", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { project_id } = req.query;

    let query = `SELECT a.*, l.name as labour_name, l.phone as labour_phone, l.skill_type, p.name as project_name
                     FROM attendance a
                     JOIN labours l ON a.labour_id = l.id
                     JOIN projects p ON a.project_id = p.id
                     JOIN project_managers pm ON p.id = pm.project_id
                     LEFT JOIN wages w ON a.id = w.attendance_id
                     WHERE pm.manager_id = $1 AND pm.status = 'ACTIVE' 
                       AND a.status = 'APPROVED' 
                       AND w.id IS NULL`;

    const params = [managerId];
    if (project_id) {
      query += " AND a.project_id = $2";
      params.push(project_id);
    }

    const result = await pool.query(query, params);
    res.json({ attendance: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GENERATE WAGES ---------------- */
router.post("/generate", managerCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const managerId = req.user.id;
    const { wage_data } = req.body; // Array of { attendance_id }

    if (!Array.isArray(wage_data)) {
      return res.status(400).json({ error: "wage_data must be an array" });
    }

    await client.query("BEGIN");

    const createdWages = [];
    for (const item of wage_data) {
      const { attendance_id } = item;

      // Get attendance details with labour info
      const attRes = await client.query(
        `SELECT a.*, l.skill_type, l.categories[1] as category
         FROM attendance a 
         JOIN labours l ON a.labour_id = l.id
         JOIN project_managers pm ON a.project_id = pm.project_id
         WHERE a.id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
        [attendance_id, managerId],
      );

      if (attRes.rows.length === 0) continue;

      const att = attRes.rows[0];

      // Fetch hourly rate from wage_rates
      const rateRes = await client.query(
        `SELECT hourly_rate FROM wage_rates 
         WHERE project_id = $1 AND skill_type = $2 AND category = $3`,
        [att.project_id, att.skill_type, att.category],
      );

      if (rateRes.rows.length === 0) {
        // Skip this attendance if no rate configured
        continue;
      }

      const hourly_rate = rateRes.rows[0].hourly_rate;
      const total_amount = hourly_rate * (att.work_hours || 0);

      const wageRes = await client.query(
        `INSERT INTO wages (attendance_id, labour_id, project_id, wage_type, rate, total_amount, worked_hours, status)
         VALUES ($1, $2, $3, 'HOURLY', $4, $5, $6, 'PENDING')
         ON CONFLICT (attendance_id) DO NOTHING
         RETURNING *`,
        [
          attendance_id,
          att.labour_id,
          att.project_id,
          hourly_rate,
          total_amount,
          att.work_hours,
        ],
      );

      if (wageRes.rows.length > 0) {
        createdWages.push(wageRes.rows[0]);
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ wages: createdWages });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GET WAGE HISTORY ---------------- */
router.get("/history", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { project_id, status } = req.query;

    let query = `SELECT w.*, l.name as labour_name, p.name as project_name, a.attendance_date
                     FROM wages w
                     JOIN labours l ON w.labour_id = l.id
                     JOIN projects p ON w.project_id = p.id
                     JOIN project_managers pm ON p.id = pm.project_id
                     JOIN attendance a ON w.attendance_id = a.id
                     WHERE pm.manager_id = $1 AND pm.status = 'ACTIVE'`;

    let params = [managerId];

    if (project_id) {
      query += " AND w.project_id = $2";
      params.push(project_id);
    }

    if (status) {
      query += ` AND w.status = $${params.length + 1}`;
      params.push(status);
    }

    query += " ORDER BY w.created_at DESC";
    const result = await pool.query(query, params);
    res.json({ wages: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- APPROVE/REJECT WAGE ---------------- */
router.patch("/review/:id", managerCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const managerId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await client.query("BEGIN");

    const verifyRes = await client.query(
      `SELECT w.id, w.project_id, w.total_amount FROM wages w
             JOIN project_managers pm ON w.project_id = pm.project_id
             WHERE w.id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
      [id, managerId],
    );

    if (verifyRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Access denied" });
    }

    const { project_id, total_amount } = verifyRes.rows[0];

    const result = await client.query(
      `UPDATE wages SET status = $1, approved_by = $2, approved_at = NOW()
             WHERE id = $3 RETURNING *`,
      [status, managerId, id],
    );

    // If approved, update project investment
    if (status === "APPROVED") {
      await client.query(
        `UPDATE projects SET current_invested = current_invested + $1 WHERE id = $2`,
        [total_amount, project_id],
      );
    }

    await client.query("COMMIT");

    res.json({ wage: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
