const express = require("express");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");
const pool = require("../../db");
const aiService = require("../../services/ai.service");

// Apply owner middleware to all routes
router.use(ownerCheck);

/**
 * POST /owner/ai/project/:projectId/extract-materials
 * Extract materials from DPR text using AI
 * Authorization: Owner (read-only, for visibility)
 */
router.post("/project/:projectId/extract-materials", async (req, res) => {
  try {
    const projectId = req.params.projectId;
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
        .json({ error: "Unauthorized to access this project" });
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
      provider: extraction.provider || process.env.AI_PROVIDER || "placeholder",
      dpr_id: dpr_id || null,
      ledger_updated: false,
    });
  } catch (error) {
    console.error("[Owner AI Extract Materials] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /owner/ai/project/:projectId/delay-summary
 * Generate human-readable delay summary using AI
 * Authorization: Owner (read-only, for visibility)
 */
router.post("/project/:projectId/delay-summary", async (req, res) => {
  try {
    const projectId = req.params.projectId;
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
        .json({ error: "Unauthorized to access this project" });
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
    console.error("[Owner AI Delay Summary] Error:", error.message);

    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
