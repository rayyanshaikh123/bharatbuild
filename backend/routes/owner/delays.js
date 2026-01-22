const express = require("express");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");
const pool = require("../../db");
const delayService = require("../../services/delay.service");

// Apply owner middleware to all routes
router.use(ownerCheck);

/**
 * GET /owner/delays/project/:projectId
 * Get all delayed plan items for a project (read-only)
 * Authorization: Owner (all org projects)
 */
router.get("/project/:projectId", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const ownerId = req.user.id;

    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    // Verify project belongs to owner's organization
    const projectCheck = await pool.query(
      `SELECT 1 FROM projects p
       JOIN organizations o ON p.org_id = o.id
       WHERE p.id = $1 AND o.owner_id = $2`,
      [projectId, ownerId],
    );

    if (projectCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Unauthorized to view project delays" });
    }

    const delays = await delayService.getProjectDelays(projectId);
    res.json({ delayed_items: delays });
  } catch (error) {
    console.error("[Owner Delays] GET error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
