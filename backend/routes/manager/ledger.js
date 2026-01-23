const express = require("express");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");
const pool = require("../../db");
const ledgerService = require("../../services/ledger.service");

// Apply manager middleware to all routes
router.use(managerCheck);

/**
 * GET /manager/ledger/project/:projectId
 * Get project financial ledger
 * Authorization: Manager (assigned projects only)
 * Query params: start_date, end_date, type, page, limit
 */
router.get("/project/:projectId", async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const managerId = req.user.id;

    // Verify manager is ACTIVE on project
    const managerCheck = await pool.query(
      `SELECT 1 FROM project_managers
       WHERE project_id = $1 AND manager_id = $2 AND status = 'ACTIVE'`,
      [projectId, managerId],
    );

    if (managerCheck.rows.length === 0) {
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
    console.error("[Manager Ledger] GET error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /manager/ledger/project/:projectId/adjust
 * Add manual ledger adjustment
 * Authorization: Manager (ACTIVE on project) only
 */
router.post("/project/:projectId/adjust", async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const managerId = req.user.id;

    // Verify manager is ACTIVE on project
    const managerCheck = await pool.query(
      `SELECT 1 FROM project_managers
       WHERE project_id = $1 AND manager_id = $2 AND status = 'ACTIVE'`,
      [projectId, managerId],
    );

    if (managerCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Manager not assigned to project" });
    }

    // Validate request body
    const { date, description, amount, category, notes } = req.body;

    if (!date || !description || amount === undefined) {
      return res.status(400).json({
        error: "Missing required fields: date, description, amount",
      });
    }

    const adjustment = await ledgerService.addLedgerAdjustment(
      projectId,
      managerId,
      { date, description, amount, category, notes },
      req,
    );

    res.status(201).json(adjustment);
  } catch (error) {
    console.error("[Manager Ledger] POST adjustment error:", error.message);

    if (error.message.includes("Invalid amount")) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
