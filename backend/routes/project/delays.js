const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../../config/db");
const delayService = require("../../services/delay.service");

// Middleware
const ensureAuthenticated = passport.authenticate("jwt", { session: false });

/**
 * GET /project/:projectId/delays
 * Get all delayed plan items for a project
 * Authorization: Owner | Manager | Engineer (assigned to project)
 */
router.get("/:projectId/delays", ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const userId = req.user.id;
    const userType = req.user.type;

    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    // Authorization check
    const client = await pool.connect();
    try {
      let authorized = false;

      if (userType === "owner") {
        const result = await client.query(
          `
          SELECT 1 FROM projects p
          JOIN organizations o ON p.org_id = o.id
          WHERE p.id = $1 AND o.owner_id = $2
        `,
          [projectId, userId],
        );
        authorized = result.rows.length > 0;
      } else if (userType === "manager") {
        const result = await client.query(
          `
          SELECT 1 FROM project_managers
          WHERE project_id = $1 AND manager_id = $2 AND status = 'ACTIVE'
        `,
          [projectId, userId],
        );
        authorized = result.rows.length > 0;
      } else if (userType === "engineer") {
        const result = await client.query(
          `
          SELECT 1 FROM project_engineers
          WHERE project_id = $1 AND engineer_id = $2 AND status = 'ACTIVE'
        `,
          [projectId, userId],
        );
        authorized = result.rows.length > 0;
      }

      if (!authorized) {
        return res
          .status(403)
          .json({ error: "Unauthorized to view project delays" });
      }
    } finally {
      client.release();
    }

    const delays = await delayService.getProjectDelays(projectId);
    res.json({ delayed_items: delays });
  } catch (error) {
    console.error("[Project Delays] GET error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /project/plan-items/:id/status
 * Update plan item status (COMPLETED/DELAYED)
 * Authorization: Manager (ACTIVE on project) only
 */
router.patch(
  "/plan-items/:id/status",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const userId = req.user.id;
      const userType = req.user.type;

      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid plan item ID" });
      }

      // Only managers can update plan item status
      if (userType !== "manager") {
        return res
          .status(403)
          .json({ error: "Only managers can update plan item status" });
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
        userId,
        { status, completed_at, delay },
        req,
      );

      res.json(updatedItem);
    } catch (error) {
      console.error("[Plan Item Status] PATCH error:", error.message);

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
  },
);

module.exports = router;
