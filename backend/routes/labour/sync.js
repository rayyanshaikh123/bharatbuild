const express = require("express");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");
const {
  validateAction,
  checkAuthorization,
  checkIdempotency,
  applyAction,
} = require("../../services/sync.service");

/**
 * POST /labour/sync
 * Sync offline actions from labour mobile app
 * Authorization: Labour only
 * Body: { actions: [...] }
 */
router.post("/", labourCheck, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate userRole is LABOUR
    if (userRole !== "LABOUR") {
      return res
        .status(403)
        .json({ error: "Only labour users can sync offline actions" });
    }

    const { actions } = req.body;

    if (!Array.isArray(actions)) {
      return res.status(400).json({ error: "Actions must be an array" });
    }

    if (actions.length === 0) {
      return res.json({ applied: [], rejected: [], skipped: [] });
    }

    const results = {
      applied: [],
      rejected: [],
      skipped: [],
    };

    // Process each action sequentially
    for (const action of actions) {
      try {
        // 1️⃣ Validate action envelope
        const validation = validateAction(action);
        if (!validation.valid) {
          results.rejected.push({
            action_id: action.id || "unknown",
            action_type: action.action_type || "unknown",
            error: validation.error,
          });
          continue;
        }

        // 2️⃣ Idempotency check
        const idempotencyCheck = await checkIdempotency(action.id);
        if (idempotencyCheck.isDuplicate) {
          results.skipped.push({
            action_id: action.id,
            action_type: action.action_type,
            reason: "Already processed",
            existing_entity_id: idempotencyCheck.existingLog.entity_id,
            status: idempotencyCheck.existingLog.status,
          });
          continue;
        }

        // 3️⃣ Authorization check
        const authCheck = await checkAuthorization(userId, userRole, action);
        if (!authCheck.authorized) {
          results.rejected.push({
            action_id: action.id,
            action_type: action.action_type,
            error: authCheck.error,
          });
          continue;
        }

        // 4️⃣ Apply action (handles transaction, logging, etc.)
        const applyResult = await applyAction(action, userId, userRole);

        if (applyResult.success) {
          results.applied.push({
            action_id: action.id,
            action_type: action.action_type,
            entity_id: applyResult.entityId,
          });
        } else {
          results.rejected.push({
            action_id: action.id,
            action_type: action.action_type,
            error: applyResult.error,
          });
        }
      } catch (error) {
        // Catch-all for unexpected errors
        console.error("[Labour Sync] Unexpected error:", error);
        results.rejected.push({
          action_id: action.id || "unknown",
          action_type: action.action_type || "unknown",
          error: "Internal server error: " + error.message,
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error("[Labour Sync] Route error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
