const pool = require("../db");
const { logAudit } = require("../util/auditLogger");

/**
 * Delay Service
 * Manages plan item delay tracking and status updates
 */

/**
 * Get all delayed plan items for a project
 * @param {number} projectId - Project ID
 * @returns {Array} Delayed plan items with details
 */
async function getProjectDelays(projectId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      SELECT 
        pi.id,
        pi.task_name,
        pi.period_start,
        pi.period_end,
        pi.completed_at,
        pi.status,
        pi.delay,
        CASE 
          WHEN pi.completed_at IS NOT NULL AND pi.completed_at > pi.period_end
          THEN EXTRACT(EPOCH FROM (pi.completed_at - pi.period_end))/(24*3600)
          ELSE 0
        END as delay_days
      FROM plan_items pi
      JOIN plans p ON pi.plan_id = p.id
      WHERE p.project_id = $1 AND pi.status = 'DELAYED'
      ORDER BY pi.period_end DESC
    `,
      [projectId],
    );

    return result.rows.map((item) => ({
      id: item.id,
      task_name: item.task_name,
      period_start: item.period_start,
      period_end: item.period_end,
      actual_end: item.completed_at,
      delay_days: parseFloat(item.delay_days.toFixed(2)),
      status: item.status,
      delay_info: item.delay || null,
    }));
  } finally {
    client.release();
  }
}

/**
 * Update plan item status with delay tracking
 * @param {number} itemId - Plan item ID
 * @param {number} managerId - Manager ID
 * @param {Object} data - { status, completed_at, delay: { referenced_dprs, delay_reason } }
 * @param {Object} req - Express request object (for audit)
 * @returns {Object} Updated plan item
 */
async function updatePlanItemStatus(itemId, managerId, data, req) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get current state
    const beforeResult = await client.query(
      "SELECT * FROM plan_items WHERE id = $1",
      [itemId],
    );

    if (beforeResult.rows.length === 0) {
      throw new Error("Plan item not found");
    }

    const beforeState = beforeResult.rows[0];

    // Verify manager is assigned to project
    const authCheck = await client.query(
      `
      SELECT 1 FROM project_managers
      WHERE project_id = $1 AND manager_id = $2 AND status = 'ACTIVE'
    `,
      [beforeState.project_id, managerId],
    );

    if (authCheck.rows.length === 0) {
      throw new Error("Unauthorized: Manager not assigned to project");
    }

    const { status, completed_at, delay } = data;

    // Auto-set completed_at if not provided and status is COMPLETED or DELAYED
    let finalCompletedAt = completed_at;
    if (!finalCompletedAt && (status === "COMPLETED" || status === "DELAYED")) {
      finalCompletedAt = new Date().toISOString();
    }

    // Validate delay info if status is DELAYED
    let delayInfo = null;
    if (status === "DELAYED") {
      if (!delay || !delay.delay_reason) {
        throw new Error("Delay reason is required for DELAYED status");
      }
      delayInfo = {
        referenced_dprs: delay.referenced_dprs || [],
        delay_reason: delay.delay_reason,
        reported_at: new Date().toISOString(),
        reported_by: managerId,
      };
    }

    // Update plan item
    const updateResult = await client.query(
      `
      UPDATE plan_items
      SET 
        status = $1,
        completed_at = $2,
        delay = $3
      WHERE id = $4
      RETURNING *
    `,
      [
        status,
        finalCompletedAt,
        delayInfo ? JSON.stringify(delayInfo) : null,
        itemId,
      ],
    );

    const afterState = updateResult.rows[0];

    // Audit log
    await logAudit({
      entityType: "plan_item",
      entityId: itemId,
      category: "PLAN",
      action: "UPDATE",
      before: beforeState,
      after: afterState,
      user: req.user,
      projectId: beforeState.project_id,
      client,
    });

    await client.query("COMMIT");

    // Calculate delay days if applicable
    let delayDays = 0;
    if (
      afterState.completed_at &&
      afterState.completed_at > afterState.period_end
    ) {
      delayDays =
        (new Date(afterState.completed_at) - new Date(afterState.period_end)) /
        (1000 * 60 * 60 * 24);
    }

    return {
      id: afterState.id,
      task_name: afterState.task_name,
      status: afterState.status,
      period_start: afterState.period_start,
      period_end: afterState.period_end,
      completed_at: afterState.completed_at,
      delay_days: parseFloat(delayDays.toFixed(2)),
      delay_info: afterState.delay,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate delay duration in days
 * @param {Date} plannedEnd - Planned end date
 * @param {Date} actualEnd - Actual end date
 * @returns {number} Delay in days
 */
function calculateDelayDuration(plannedEnd, actualEnd) {
  if (!actualEnd || actualEnd <= plannedEnd) {
    return 0;
  }
  const delayMs = new Date(actualEnd) - new Date(plannedEnd);
  return parseFloat((delayMs / (1000 * 60 * 60 * 24)).toFixed(2));
}

module.exports = {
  getProjectDelays,
  updatePlanItemStatus,
  calculateDelayDuration,
};
