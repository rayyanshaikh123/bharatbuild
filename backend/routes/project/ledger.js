const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../../config/db");
const ledgerService = require("../../services/ledger.service");

// Middleware
const ensureAuthenticated = passport.authenticate("jwt", { session: false });

/**
 * GET /project/:projectId/ledger
 * Get project financial ledger
 * Authorization: Owner (all org projects) | Manager (assigned projects)
 * Query params: start_date, end_date, type, page, limit
 */
router.get("/:projectId/ledger", ensureAuthenticated, async (req, res) => {
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
        // Owner can see all projects in their organization
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
        // Manager can see assigned projects
        const result = await client.query(
          `
          SELECT 1 FROM project_managers
          WHERE project_id = $1 AND manager_id = $2 AND status = 'ACTIVE'
        `,
          [projectId, userId],
        );
        authorized = result.rows.length > 0;
      }

      if (!authorized) {
        return res
          .status(403)
          .json({ error: "Unauthorized to view this project ledger" });
      }
    } finally {
      client.release();
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
    console.error("[Project Ledger] GET error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /project/:projectId/ledger/adjust
 * Add manual ledger adjustment
 * Authorization: Manager (ACTIVE on project) only
 */
router.post(
  "/:projectId/ledger/adjust",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user.id;
      const userType = req.user.type;

      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Only managers can add adjustments
      if (userType !== "manager") {
        return res
          .status(403)
          .json({ error: "Only managers can add ledger adjustments" });
      }

      // Verify manager is ACTIVE on project
      const client = await pool.connect();
      try {
        const result = await client.query(
          `
        SELECT 1 FROM project_managers
        WHERE project_id = $1 AND manager_id = $2 AND status = 'ACTIVE'
      `,
          [projectId, userId],
        );

        if (result.rows.length === 0) {
          return res
            .status(403)
            .json({ error: "Unauthorized: Manager not assigned to project" });
        }
      } finally {
        client.release();
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
        userId,
        { date, description, amount, category, notes },
        req,
      );

      res.status(201).json(adjustment);
    } catch (error) {
      console.error("[Project Ledger] POST adjustment error:", error.message);

      if (error.message.includes("Invalid amount")) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  },
);

module.exports = router;
