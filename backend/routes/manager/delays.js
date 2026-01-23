const express = require("express");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");
const pool = require("../../db");
const delayService = require("../../services/delay.service");

// Apply manager middleware to all routes
router.use(managerCheck);

/**
 * GET /manager/delays/project/:projectId
 * Get all delayed plan items for a project
 * Authorization: Manager (assigned projects only)
 */
router.get("/project/:projectId", async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const managerId = req.user.id;

    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    // Verify manager is ACTIVE on project
    const managerCheck = await pool.query(
      `SELECT 1 FROM project_managers
       WHERE project_id = $1 AND manager_id = $2 AND status = 'ACTIVE'`,
      [projectId, managerId],
    );

    if (managerCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Unauthorized to view project delays" });
    }

    const delays = await delayService.getProjectDelays(projectId);
    res.json({ delayed_items: delays });
  } catch (error) {
    console.error("[Manager Delays] GET error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /manager/delays/plan-items/:id/status
 * Update plan item status (COMPLETED/DELAYED)
 * Authorization: Manager (ACTIVE on project) only
 */
router.patch("/plan-items/:id/status", async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const managerId = req.user.id;

    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid plan item ID" });
    }

    // Validate request body
    const { status, completed_at, delay } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    if (!["PENDING", "COMPLETED", "DELAYED"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be PENDING, COMPLETED, or DELAYED",
      });
    }

    const updatedItem = await delayService.updatePlanItemStatus(
      itemId,
      managerId,
      { status, completed_at, delay },
      req,
    );

    res.json(updatedItem);
  } catch (error) {
    console.error("[Manager Plan Item Status] PATCH error:", error.message);

    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("required")
    ) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
