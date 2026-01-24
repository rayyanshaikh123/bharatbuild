const express = require("express");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");

/**
 * POST /sync/labour
 * Labour-specific sync endpoint
 * Only accepts CHECK_IN and CHECK_OUT actions
 */
router.post("/", labourCheck, async (req, res) => {
  try {
    const { actions } = req.body;
    const labourId = req.user.id;

    // Validate request
    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({ error: "Actions array is required" });
    }

    // Filter and validate labour actions only
    const labourActions = ["CHECK_IN", "CHECK_OUT", "TRACK"];
    const validActions = [];
    const invalidActions = [];

    for (const action of actions) {
      if (!labourActions.includes(action.action_type)) {
        invalidActions.push({
          id: action.id,
          action_type: action.action_type,
          reason:
            "Invalid action type for labour. Only CHECK_IN and CHECK_OUT allowed.",
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

    // Forward to batch endpoint
    req.body.actions = validActions;
    const batchSync = require("./index");

    // Call batch handler
    const mockReq = {
      body: { actions: validActions },
      user: { id: labourId, role: "LABOUR" },
    };

    const mockRes = {
      json: (data) => {
        // Merge invalid actions into rejected
        data.rejected = [...data.rejected, ...invalidActions];
        data.summary.rejected_count = data.rejected.length;
        res.json(data);
      },
      status: (code) => ({
        json: (data) => res.status(code).json(data),
      }),
    };

    // Manually call batch logic
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

        const authCheck = await checkAuthorization(labourId, "LABOUR", action);
        if (!authCheck.authorized) {
          rejected.push({
            id: action.id,
            action_type: action.action_type,
            reason: authCheck.error,
          });
          continue;
        }

        const result = await applyAction(action, labourId, "LABOUR");

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
        console.error("[Labour Sync] Action processing error:", error.message);
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
    console.error("[Labour Sync] Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
