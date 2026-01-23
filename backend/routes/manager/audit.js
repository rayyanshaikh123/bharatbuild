const express = require("express");
const router = express.Router();
const auditService = require("../../services/audit.service");

// Middleware to ensure user is authenticated as manager
const ensureManager = require("../../middleware/managerCheck");

/**
 * GET /manager/audits
 * Get audit logs for assigned projects
 * Query params: project_id, category, start_date, end_date, page, limit
 */
router.get("/", ensureManager, async (req, res) => {
  try {
    const managerId = req.user.id;

    // Parse query parameters
    const filters = {
      project_id: req.query.project_id || null,
      category: req.query.category || null,
      start_date: req.query.start_date || undefined,
      end_date: req.query.end_date || undefined,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 50;

    const result = await auditService.getManagerAudits(managerId, filters);
    res.json(result);
  } catch (error) {
    console.error("[Manager Audits] Error:", error.message);

    if (error.message.includes("Unauthorized")) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
