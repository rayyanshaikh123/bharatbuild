const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");

router.get("/", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;

    // Initialize summary with default values
    const summary = {
      total_projects_assigned: 0,
      total_projects_pending: 0,
      total_projects_rejected: 0,
    };

    // Get project counts by status
    const projectCounts = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM project_site_engineers
       WHERE site_engineer_id = $1
       GROUP BY status`,
      [engineerId],
    );

    projectCounts.rows.forEach((row) => {
      if (row.status === "APPROVED")
        summary.total_projects_assigned = parseInt(row.count);
      if (row.status === "PENDING")
        summary.total_projects_pending = parseInt(row.count);
      if (row.status === "REJECTED")
        summary.total_projects_rejected = parseInt(row.count);
    });

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
