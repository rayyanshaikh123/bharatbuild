const express = require("express");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");

/**
 * POST /sync/engineer
 * Site Engineer-specific sync endpoint
 * Only accepts engineer actions (material requests, DPRs, manual attendance)
 */
router.post("/", engineerCheck, async (req, res) => {
  try {
    const { actions } = req.body;
    const engineerId = req.user.id;

    // Validate request
    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({ error: "Actions array is required" });
    }

    // Filter and validate engineer actions only
    const engineerActions = [
      "CREATE_MATERIAL_REQUEST",
      "UPDATE_MATERIAL_REQUEST",
      "DELETE_MATERIAL_REQUEST",
      "CREATE_DPR",
      "MANUAL_ATTENDANCE",
    ];

    const validActions = [];
    const invalidActions = [];

    for (const action of actions) {
      if (!engineerActions.includes(action.action_type)) {
        invalidActions.push({
          id: action.id,
          action_type: action.action_type,
          reason: "Invalid action type for site engineer.",
        });
      } else {
        validActions.push(action);
      }
    }

    // If no valid actions, return early
    if (validActions.length === 0) {
      return res.json({
        applied: [],
        rejected: invalidActions,
        skipped: [],
        summary: {
          total: actions.length,
          applied_count: 0,
          rejected_count: invalidActions.length,
          skipped_count: 0,
        },
      });
    }

    // Process valid actions
    const {
      validateAction,
      checkAuthorization,
      checkIdempotency,
      applyAction,
    } = require("../../services/sync.service");

    const applied = [];
    const rejected = [...invalidActions];
    const skipped = [];

    for (const action of validActions) {
      try {
        const validation = validateAction(action);
        if (!validation.valid) {
          rejected.push({
            id: action.id,
            action_type: action.action_type,
            reason: validation.error,
          });
          continue;
        }

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

        const authCheck = await checkAuthorization(
          engineerId,
          "SITE_ENGINEER",
          action,
        );
        if (!authCheck.authorized) {
          rejected.push({
            id: action.id,
            action_type: action.action_type,
            reason: authCheck.error,
          });
          continue;
        }

        const result = await applyAction(action, engineerId, "SITE_ENGINEER");

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
        console.error(
          "[Engineer Sync] Action processing error:",
          error.message,
        );
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
    console.error("[Engineer Sync] Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
