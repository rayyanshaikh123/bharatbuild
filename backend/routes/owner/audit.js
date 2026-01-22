const express = require("express");
const router = express.Router();
const passport = require("passport");
const auditService = require("../../services/audit.service");

// Middleware to ensure user is authenticated as owner
const ensureOwner = passport.authenticate("jwt", { session: false });

/**
 * GET /owner/audits
 * Get audit logs for the organization
 * Query params: project_id, category, start_date, end_date, page, limit
 */
router.get("/", ensureOwner, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Parse query parameters
    const filters = {
      project_id: req.query.project_id ? parseInt(req.query.project_id) : null,
      category: req.query.category || null,
      start_date: req.query.start_date || undefined,
      end_date: req.query.end_date || undefined,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 50;

    const result = await auditService.getOwnerAudits(ownerId, filters);
    res.json(result);
  } catch (error) {
    console.error("[Owner Audits] Error:", error.message);

    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
