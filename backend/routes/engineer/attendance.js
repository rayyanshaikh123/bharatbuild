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
       AND status = 'APPROVED'`,
    [engineerId, projectId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- GET TODAY'S ATTENDANCE ---------------- */
router.get("/today", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId, date } = req.query;
    const reportDate = date || new Date().toISOString().split("T")[0];

    if (!projectId)
      return res.status(400).json({ error: "projectId is required" });

    const isActive = await engineerProjectStatusCheck(engineerId, projectId);
    if (!isActive) return res.status(403).json({ error: "Access denied." });

    const result = await pool.query(
      `SELECT a.*, l.name, l.phone, l.skill_type
       FROM attendance a
       JOIN labours l ON a.labour_id = l.id
       WHERE a.project_id = $1 AND a.attendance_date = $2`,
      [projectId, reportDate],
    );

    res.json({ attendance: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- MARK MANUAL ATTENDANCE ---------------- */
router.post("/mark", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { labourId, projectId, date, status } = req.body;
    const reportDate = date || new Date().toISOString().split("T")[0];

    const isActive = await engineerProjectStatusCheck(engineerId, projectId);
    if (!isActive) return res.status(403).json({ error: "Access denied." });

    const result = await pool.query(
      `INSERT INTO attendance (project_id, labour_id, site_engineer_id, attendance_date, status, approved_by, approved_at, is_manual)
       VALUES ($1, $2, $3, $4, $5, $3, NOW(), true)
       ON CONFLICT (project_id, labour_id, attendance_date) 
       DO UPDATE SET status = $5, approved_by = $3, approved_at = NOW(), is_manual = true
       RETURNING *`,
      [projectId, labourId, engineerId, reportDate, status],
    );

    res.json({ attendance: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- SEARCH LABOURER BY PHONE ---------------- */
router.get("/search-labour", engineerCheck, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "Phone is required" });

    const result = await pool.query(
      "SELECT id, name, phone, skill_type FROM labours WHERE phone = $1",
      [phone],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Labourer not found" });
    res.json({ labour: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
