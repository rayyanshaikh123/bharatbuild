const pool = require("../../../db");
const {
  checkIdempotency,
  applyAction,
} = require("../../../services/sync.service");

/**
 * Labour GraphQL Resolvers
 * Reuses existing business logic from services
 */

const labourResolvers = {
  // ========== QUERIES ==========

  /**
   * Get assigned jobs
   */
  jobs: async ({ page, limit }, context) => {
    const labourId = context.user.id;

    // Validate pagination
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM labour_jobs WHERE labour_id = $1`,
      [labourId],
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated jobs
    const result = await pool.query(
      `SELECT 
        lj.id,
        lj.project_id,
        p.name as project_name,
        lj.status,
        lj.assigned_at
       FROM labour_jobs lj
       JOIN projects p ON lj.project_id = p.id
       WHERE lj.labour_id = $1
       ORDER BY lj.assigned_at DESC
       LIMIT $2 OFFSET $3`,
      [labourId, limit, offset],
    );

    return {
      data: result.rows,
      page,
      limit,
      total,
      hasMore: offset + result.rows.length < total,
    };
  },

  /**
   * Get attendance history
   */
  attendance: async ({ page, limit }, context) => {
    const labourId = context.user.id;

    // Validate pagination
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM attendance WHERE labour_id = $1`,
      [labourId],
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated attendance
    const result = await pool.query(
      `SELECT 
        id,
        project_id,
        attendance_date,
        check_in_time,
        check_out_time,
        work_hours,
        status,
        source
       FROM attendance
       WHERE labour_id = $1
       ORDER BY attendance_date DESC
       LIMIT $2 OFFSET $3`,
      [labourId, limit, offset],
    );

    return {
      data: result.rows,
      page,
      limit,
      total,
      hasMore: offset + result.rows.length < total,
    };
  },

  // ========== MUTATIONS ==========

  /**
   * Check in to project
   */
  checkIn: async (
    { client_action_id, project_id, latitude, longitude, timestamp },
    context,
  ) => {
    const labourId = context.user.id;

    try {
      // Check idempotency
      const idempotencyCheck = await checkIdempotency(client_action_id);
      if (idempotencyCheck.isDuplicate) {
        return {
          success: true,
          attendance_id: idempotencyCheck.existingLog.entity_id,
          sync_status: "DUPLICATE",
          error: null,
        };
      }

      // Reuse sync service logic
      const action = {
        id: client_action_id,
        action_type: "CHECK_IN",
        entity_type: "ATTENDANCE",
        project_id,
        payload: { latitude, longitude, timestamp },
      };

      const result = await applyAction(action, labourId, "LABOUR");

      return {
        success: result.success,
        attendance_id: result.entityId,
        sync_status: result.success ? "APPLIED" : "REJECTED",
        error: result.error || null,
      };
    } catch (error) {
      console.error("[Labour GraphQL] Check-in error:", error.message);
      return {
        success: false,
        attendance_id: null,
        sync_status: "REJECTED",
        error: error.message,
      };
    }
  },

  /**
   * Check out from project
   */
  checkOut: async (
    { client_action_id, project_id, latitude, longitude, timestamp },
    context,
  ) => {
    const labourId = context.user.id;

    try {
      // Check idempotency
      const idempotencyCheck = await checkIdempotency(client_action_id);
      if (idempotencyCheck.isDuplicate) {
        // Get work hours from existing record
        const attendance = await pool.query(
          `SELECT work_hours FROM attendance WHERE id = $1`,
          [idempotencyCheck.existingLog.entity_id],
        );

        return {
          success: true,
          attendance_id: idempotencyCheck.existingLog.entity_id,
          work_hours: attendance.rows[0]?.work_hours || null,
          sync_status: "DUPLICATE",
          error: null,
        };
      }

      // Reuse sync service logic
      const action = {
        id: client_action_id,
        action_type: "CHECK_OUT",
        entity_type: "ATTENDANCE",
        project_id,
        payload: { latitude, longitude, timestamp },
      };

      const result = await applyAction(action, labourId, "LABOUR");

      // Get work hours if successful
      let workHours = null;
      if (result.success && result.entityId) {
        const attendance = await pool.query(
          `SELECT work_hours FROM attendance WHERE id = $1`,
          [result.entityId],
        );
        workHours = attendance.rows[0]?.work_hours || null;
      }

      return {
        success: result.success,
        attendance_id: result.entityId,
        work_hours: workHours,
        sync_status: result.success ? "APPLIED" : "REJECTED",
        error: result.error || null,
      };
    } catch (error) {
      console.error("[Labour GraphQL] Check-out error:", error.message);
      return {
        success: false,
        attendance_id: null,
        work_hours: null,
        sync_status: "REJECTED",
        error: error.message,
      };
    }
  },
};

module.exports = labourResolvers;
