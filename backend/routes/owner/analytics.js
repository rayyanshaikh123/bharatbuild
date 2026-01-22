const express = require("express");
const router = express.Router();
const passport = require("passport");
const analyticsService = require("../../services/analytics.service");

// Middleware to ensure user is authenticated as owner
const ensureOwner = passport.authenticate("jwt", { session: false });

/**
 * GET /owner/analytics/overview
 * Get organization-wide analytics dashboard
 */
router.get("/overview", ensureOwner, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const overview = await analyticsService.getOwnerOverview(ownerId);
    res.json(overview);
  } catch (error) {
    console.error("[Owner Analytics] Overview error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/analytics/project/:projectId
 * Get detailed analytics for a specific project
 */
router.get("/project/:projectId", ensureOwner, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const analytics = await analyticsService.getOwnerProjectAnalytics(
      ownerId,
      projectId,
    );
    res.json(analytics);
  } catch (error) {
    console.error("[Owner Analytics] Project analytics error:", error.message);

    if (
      error.message.includes("not found") ||
      error.message.includes("unauthorized")
    ) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
