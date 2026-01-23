const express = require("express");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");
const pool = require("../../db");
const ledgerService = require("../../services/ledger.service");

// Apply owner middleware to all routes
router.use(ownerCheck);

/**
 * GET /owner/ledger/project/:projectId
 * Get project financial ledger (read-only for owner)
 * Authorization: Owner (all org projects)
 * Query params: start_date, end_date, type, page, limit
 */
router.get("/project/:projectId", async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const ownerId = req.user.id;

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
        .json({ error: "Unauthorized to view this project ledger" });
    }

    // Parse filters
    const filters = {
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      type: req.query.type,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 200) filters.limit = 100;

    const ledger = await ledgerService.getProjectLedger(projectId, filters);
    res.json(ledger);
  } catch (error) {
    console.error("[Owner Ledger] GET error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
