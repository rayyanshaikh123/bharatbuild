const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

/* ---------------- GET ALL WAGES (READ-ONLY) ---------------- */
router.get("/", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { project_id, status } = req.query;

    let query = `SELECT w.*, l.name as labour_name, p.name as project_name, a.attendance_date,
                        e.name as engineer_name
                 FROM wages w
                 JOIN labours l ON w.labour_id = l.id
                 JOIN projects p ON w.project_id = p.id
                 JOIN organizations o ON p.org_id = o.id
                 JOIN attendance a ON w.attendance_id = a.id
                 LEFT JOIN site_engineers e ON a.site_engineer_id = e.id
                 WHERE o.owner_id = $1`;

    let params = [ownerId];

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

module.exports = router;
