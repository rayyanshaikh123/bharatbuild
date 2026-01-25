const express = require("express");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");
const pool = require("../../db");

// Apply owner middleware to all routes
router.use(ownerCheck);

/**
 * GET /owner/timeline/project/:projectId
 * Get project timeline with plan items ordered by start date and priority
 * Authorization: Owner (all org projects)
 */
router.get("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    // Verify project belongs to owner's organization
    const orgCheck = await pool.query(
      `SELECT p.id FROM projects p
       JOIN organizations o ON p.org_id = o.id
       WHERE p.id = $1 AND o.owner_id = $2`,
      [projectId, ownerId],
    );

    if (orgCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied to this project" });
    }

    // Get plan for the project
    const planResult = await pool.query(
      `SELECT id FROM plans WHERE project_id = $1`,
      [projectId],
    );

    if (planResult.rows.length === 0) {
      return res.json({
        project_id: projectId,
        overall_progress: 0,
        total_tasks: 0,
        completed_tasks: 0,
        pending_tasks: 0,
        delayed_tasks: 0,
        timeline: [],
      });
    }

    const planId = planResult.rows[0].id;

    // Get all plan items with delay calculation
    const now = new Date();
    const planItemsResult = await pool.query(
      `SELECT 
        id as plan_item_id,
        task_name,
        period_start,
        period_end,
        status,
        priority,
        completed_at,
        delay_info,
        CASE 
          WHEN status = 'COMPLETED' AND completed_at > period_end 
            THEN EXTRACT(DAY FROM (completed_at - period_end))
          WHEN status = 'DELAYED'
            THEN EXTRACT(DAY FROM (COALESCE(completed_at, $2::timestamp) - period_end))
          WHEN status != 'COMPLETED' AND $2::timestamp > period_end
            THEN EXTRACT(DAY FROM ($2::timestamp - period_end))
          ELSE 0
        END as delay_days
       FROM plan_items
       WHERE plan_id = $1
       ORDER BY period_start ASC, priority DESC, task_name ASC`,
      [planId, now],
    );

    // Calculate statistics
    const totalTasks = planItemsResult.rows.length;
    let completedTasks = 0;
    let pendingTasks = 0;
    let delayedTasks = 0;

    planItemsResult.rows.forEach((item) => {
      if (item.status === "COMPLETED") {
        completedTasks++;
      } else if (item.status === "DELAYED") {
        delayedTasks++;
      } else if (item.status === "PENDING" || item.status === "IN_PROGRESS") {
        pendingTasks++;
      }

      // Auto-detect delays for non-completed items past deadline
      if (item.status !== "COMPLETED" && new Date(item.period_end) < now) {
        if (item.status !== "DELAYED") {
          delayedTasks++;
          pendingTasks = Math.max(0, pendingTasks - 1);
        }
      }
    });

    const overallProgress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Format timeline items
    const timeline = planItemsResult.rows.map((item) => ({
      plan_item_id: item.plan_item_id,
      task_name: item.task_name,
      period_start: item.period_start,
      period_end: item.period_end,
      status: item.status,
      priority: item.priority,
      delay_days: Math.max(0, Math.round(parseFloat(item.delay_days) || 0)),
      delay_info: item.delay_info || null,
    }));

    res.json({
      project_id: projectId,
      overall_progress: overallProgress,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      pending_tasks: pendingTasks,
      delayed_tasks: delayedTasks,
      timeline,
    });
  } catch (err) {
    console.error("[Owner Timeline API] Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
