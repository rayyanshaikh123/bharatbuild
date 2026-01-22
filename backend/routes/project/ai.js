const express = require("express");
const router = express.Router();
const passport = require("passport");
const pool = require("../../config/db");
const aiService = require("../../services/ai.service");

// Middleware
const ensureAuthenticated = passport.authenticate("jwt", { session: false });

/**
 * POST /project/:projectId/ai/extract-materials
 * Extract materials from DPR text using AI
 * Authorization: Manager | Engineer (assigned to project)
 */
router.post(
  "/:projectId/ai/extract-materials",
  ensureAuthenticated,
  async (req, res) => {
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

        if (userType === "manager") {
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
            .json({
              error: "Unauthorized to use AI features for this project",
            });
        }
      } finally {
        client.release();
      }

      // Validate request body
      const { dpr_id, raw_text } = req.body;

      if (!raw_text) {
        return res.status(400).json({ error: "raw_text is required" });
      }

      // Extract materials using AI
      const extraction = await aiService.extractMaterialsFromDPR(raw_text);

      res.json({
        extracted_materials: extraction.materials,
        confidence: extraction.confidence,
        provider:
          extraction.provider || process.env.AI_PROVIDER || "placeholder",
        dpr_id: dpr_id || null,
        ledger_updated: false, // Future: auto-insert into ledger
      });
    } catch (error) {
      console.error("[AI Extract Materials] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },
);

/**
 * POST /project/:projectId/ai/delay-summary
 * Generate human-readable delay summary using AI
 * Authorization: Manager | Engineer (assigned to project)
 */
router.post(
  "/:projectId/ai/delay-summary",
  ensureAuthenticated,
  async (req, res) => {
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

        if (userType === "manager") {
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
            .json({
              error: "Unauthorized to use AI features for this project",
            });
        }
      } finally {
        client.release();
      }

      // Validate request body
      const { plan_item_id } = req.body;

      if (!plan_item_id) {
        return res.status(400).json({ error: "plan_item_id is required" });
      }

      // Generate delay summary
      const summary = await aiService.generateDelaySummary(
        projectId,
        plan_item_id,
      );

      res.json({
        summary: summary.summary,
        delay_days: summary.delay_days,
        referenced_dprs: summary.referenced_dprs,
        provider: process.env.AI_PROVIDER || "placeholder",
      });
    } catch (error) {
      console.error("[AI Delay Summary] Error:", error.message);

      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  },
);

module.exports = router;
