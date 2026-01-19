const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

router.get("/", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;

    // Initialize summary with default values
    const summary = {
      total_site_engineers_approved: 0,
      total_site_engineers_pending: 0,
      total_site_engineers_rejected: 0,
      total_projects_assigned: 0,
      total_projects_created: 0,
      total_projects_planned: 0,
      total_projects_active: 0,
      total_projects_completed: 0,
      total_projects_on_hold: 0,
    };

    // Get site engineer counts by status (for approved organizations)
    const engineerCounts = await pool.query(
      `SELECT ose.status, COUNT(*) as count
       FROM organization_site_engineers ose
       JOIN organization_managers om ON ose.org_id = om.org_id
       WHERE om.manager_id = $1 AND om.status = 'APPROVED'
       GROUP BY ose.status`,
      [managerId],
    );

    engineerCounts.rows.forEach((row) => {
      if (row.status === "APPROVED")
        summary.total_site_engineers_approved = parseInt(row.count);
      if (row.status === "PENDING")
        summary.total_site_engineers_pending = parseInt(row.count);
      if (row.status === "REJECTED")
        summary.total_site_engineers_rejected = parseInt(row.count);
    });

    // Get total projects assigned (ACTIVE in project_managers)
    const assignedProjects = await pool.query(
      `SELECT COUNT(*) as count
       FROM project_managers
       WHERE manager_id = $1 AND status = 'ACTIVE'`,
      [managerId],
    );

    summary.total_projects_assigned = parseInt(
      assignedProjects.rows[0].count || 0,
    );

    // Get total projects created
    const createdProjects = await pool.query(
      `SELECT COUNT(*) as count
       FROM projects
       WHERE created_by = $1`,
      [managerId],
    );

    summary.total_projects_created = parseInt(
      createdProjects.rows[0].count || 0,
    );

    // Get project status counts (only for assigned projects)
    const projectStatusCounts = await pool.query(
      `SELECT p.status, COUNT(*) as count
       FROM projects p
       JOIN project_managers pm ON p.id = pm.project_id
       WHERE pm.manager_id = $1 AND pm.status = 'ACTIVE'
       GROUP BY p.status`,
      [managerId],
    );

    projectStatusCounts.rows.forEach((row) => {
      if (row.status === "PLANNED")
        summary.total_projects_planned = parseInt(row.count);
      if (row.status === "ACTIVE")
        summary.total_projects_active = parseInt(row.count);
      if (row.status === "COMPLETED")
        summary.total_projects_completed = parseInt(row.count);
      if (row.status === "ON_HOLD")
        summary.total_projects_on_hold = parseInt(row.count);
    });

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
