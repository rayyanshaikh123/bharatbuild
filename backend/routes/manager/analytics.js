const express = require("express");
const router = express.Router();
const passport = require("passport");
const analyticsService = require("../../services/analytics.service");

// Middleware to ensure user is authenticated as manager
const ensureManager = passport.authenticate("jwt", { session: false });

/**
 * GET /manager/analytics/overview
 * Get manager's overview of assigned projects
 */
router.get("/overview", ensureManager, async (req, res) => {
  try {
    const managerId = req.user.id;
    const overview = await analyticsService.getManagerOverview(managerId);
    res.json(overview);
  } catch (error) {
    console.error("[Manager Analytics] Overview error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /manager/analytics/project/:projectId
 * Get detailed analytics for a specific project (must be assigned)
 */
router.get("/project/:projectId", ensureManager, async (req, res) => {
  try {
    const managerId = req.user.id;
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const analytics = await analyticsService.getManagerProjectAnalytics(
      managerId,
      projectId,
    );
    res.json(analytics);
  } catch (error) {
    console.error(
      "[Manager Analytics] Project analytics error:",
      error.message,
    );

    if (
      error.message.includes("not found") ||
      error.message.includes("unauthorized")
    ) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
