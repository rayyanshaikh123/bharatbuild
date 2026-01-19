const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

router.get("/", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Initialize summary with default values
    const summary = {
      total_managers_approved: 0,
      total_managers_pending: 0,
      total_managers_rejected: 0,
      total_site_engineers_approved: 0,
      total_site_engineers_pending: 0,
      total_site_engineers_rejected: 0,
      total_projects: 0,
      total_projects_planned: 0,
      total_projects_active: 0,
      total_projects_completed: 0,
      total_projects_on_hold: 0,
      total_budget_planned: 0,
      total_budget_active: 0,
      total_budget_completed: 0,
    };

    // Get manager counts by status
    const managerCounts = await pool.query(
      `SELECT om.status, COUNT(*) as count
       FROM organization_managers om
       JOIN organizations o ON om.org_id = o.id
       WHERE o.owner_id = $1
       GROUP BY om.status`,
      [ownerId],
    );

    managerCounts.rows.forEach((row) => {
      if (row.status === "APPROVED")
        summary.total_managers_approved = parseInt(row.count);
      if (row.status === "PENDING")
        summary.total_managers_pending = parseInt(row.count);
      if (row.status === "REJECTED")
        summary.total_managers_rejected = parseInt(row.count);
    });

    // Get site engineer counts by status
    const engineerCounts = await pool.query(
      `SELECT ose.status, COUNT(*) as count
       FROM organization_site_engineers ose
       JOIN organizations o ON ose.org_id = o.id
       WHERE o.owner_id = $1
       GROUP BY ose.status`,
      [ownerId],
    );

    engineerCounts.rows.forEach((row) => {
      if (row.status === "APPROVED")
        summary.total_site_engineers_approved = parseInt(row.count);
      if (row.status === "PENDING")
        summary.total_site_engineers_pending = parseInt(row.count);
      if (row.status === "REJECTED")
        summary.total_site_engineers_rejected = parseInt(row.count);
    });

    // Get project counts by status
    const projectCounts = await pool.query(
      `SELECT p.status, COUNT(*) as count
       FROM projects p
       JOIN organizations o ON p.org_id = o.id
       WHERE o.owner_id = $1
       GROUP BY p.status`,
      [ownerId],
    );

    projectCounts.rows.forEach((row) => {
      summary.total_projects += parseInt(row.count);
      if (row.status === "PLANNED")
        summary.total_projects_planned = parseInt(row.count);
      if (row.status === "ACTIVE")
        summary.total_projects_active = parseInt(row.count);
      if (row.status === "COMPLETED")
        summary.total_projects_completed = parseInt(row.count);
      if (row.status === "ON_HOLD")
        summary.total_projects_on_hold = parseInt(row.count);
    });

    // Get budget totals by status
    const budgetTotals = await pool.query(
      `SELECT p.status, COALESCE(SUM(p.budget), 0) as total
       FROM projects p
       JOIN organizations o ON p.org_id = o.id
       WHERE o.owner_id = $1
       GROUP BY p.status`,
      [ownerId],
    );

    budgetTotals.rows.forEach((row) => {
      if (row.status === "PLANNED")
        summary.total_budget_planned = parseFloat(row.total);
      if (row.status === "ACTIVE")
        summary.total_budget_active = parseFloat(row.total);
      if (row.status === "COMPLETED")
        summary.total_budget_completed = parseFloat(row.total);
    });

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
