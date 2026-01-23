const express = require("express");
const router = express.Router();
const {
  validateAction,
  checkAuthorization,
  checkIdempotency,
  applyAction,
} = require("../../services/sync.service");

/**
 * POST /sync/batch
 * Batch synchronization endpoint
 * Accepts array of offline actions and processes them sequentially
 */
router.post("/", async (req, res) => {
  try {
    const { actions } = req.body;
    const user = req.user;

    // Authentication required
    if (!user || !user.id || !user.role) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate request
    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({ error: "Actions array is required" });
    }

    if (actions.length === 0) {
      return res.status(400).json({ error: "Actions array cannot be empty" });
    }

    if (actions.length > 100) {
      return res.status(400).json({ error: "Maximum 100 actions per batch" });
    }

    const applied = [];
    const rejected = [];
    const skipped = [];

    // Process actions sequentially
    for (const action of actions) {
      try {
        // 1. Validate action structure
        const validation = validateAction(action);
        if (!validation.valid) {
          rejected.push({
            id: action.id,
            action_type: action.action_type,
            reason: validation.error,
          });
          continue;
        }

        // 2. Check idempotency
        const idempotencyCheck = await checkIdempotency(action.id);
        if (idempotencyCheck.isDuplicate) {
          skipped.push({
            id: action.id,
            action_type: action.action_type,
            status: idempotencyCheck.existingLog.status,
            reason: "Already processed",
          });
          continue;
        }

        // 3. Check authorization
        const authCheck = await checkAuthorization(user.id, user.role, action);
        if (!authCheck.authorized) {
          rejected.push({
            id: action.id,
            action_type: action.action_type,
            reason: authCheck.error,
          });
          continue;
        }

        // 4. Apply action
        const result = await applyAction(action, user.id, user.role);

        if (result.success) {
          applied.push(action.id);
        } else {
          rejected.push({
            id: action.id,
            action_type: action.action_type,
            reason: result.error,
          });
        }
      } catch (error) {
        console.error("[Sync Batch] Action processing error:", error.message);
        rejected.push({
          id: action.id,
          action_type: action.action_type,
          reason: "Internal processing error",
        });
      }
    }

    res.json({
      applied,
      rejected,
      skipped,
      summary: {
        total: actions.length,
        applied_count: applied.length,
        rejected_count: rejected.length,
        skipped_count: skipped.length,
      },
    });
  } catch (error) {
    console.error("[Sync Batch] Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
