const pool = require("../../../db");
const {
  checkIdempotency,
  applyAction,
} = require("../../../services/sync.service");

/**
 * Engineer GraphQL Resolvers
 * Reuses existing business logic from services
 */

const engineerResolvers = {
  // ========== QUERIES ==========

  /**
   * Get material requests
   */
  materialRequests: async ({ project_id, page, limit }, context) => {
    const engineerId = context.user.id;

    // Validate pagination
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    const offset = (page - 1) * limit;

    // Verify engineer has access to project
    const accessCheck = await pool.query(
      `SELECT 1 FROM project_site_engineers 
       WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [engineerId, project_id],
    );

    if (accessCheck.rows.length === 0) {
      throw new Error("Unauthorized: Not an active engineer in this project");
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM material_requests 
       WHERE project_id = $1 AND site_engineer_id = $2`,
      [project_id, engineerId],
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated requests
    const result = await pool.query(
      `SELECT 
        id, project_id, title, category, quantity, status, created_at
       FROM material_requests
       WHERE project_id = $1 AND site_engineer_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [project_id, engineerId, limit, offset],
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
   * Get attendance records
   */
  attendance: async ({ project_id, page, limit }, context) => {
    const engineerId = context.user.id;

    // Validate pagination
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    const offset = (page - 1) * limit;

    // Verify engineer has access to project
    const accessCheck = await pool.query(
      `SELECT 1 FROM project_site_engineers 
       WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [engineerId, project_id],
    );

    if (accessCheck.rows.length === 0) {
      throw new Error("Unauthorized: Not an active engineer in this project");
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM attendance 
       WHERE project_id = $1 AND site_engineer_id = $2`,
      [project_id, engineerId],
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated attendance
    const result = await pool.query(
      `SELECT 
        id, project_id, labour_id, attendance_date, work_hours, status, source
       FROM attendance
       WHERE project_id = $1 AND site_engineer_id = $2
       ORDER BY attendance_date DESC
       LIMIT $3 OFFSET $4`,
      [project_id, engineerId, limit, offset],
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
   * Get wages
   */
  wages: async ({ project_id, page, limit }, context) => {
    const engineerId = context.user.id;

    // Validate pagination
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    const offset = (page - 1) * limit;

    // Verify engineer has access to project
    const accessCheck = await pool.query(
      `SELECT 1 FROM project_site_engineers 
       WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [engineerId, project_id],
    );

    if (accessCheck.rows.length === 0) {
      throw new Error("Unauthorized: Not an active engineer in this project");
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM wages 
       WHERE project_id = $1`,
      [project_id],
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated wages
    const result = await pool.query(
      `SELECT 
        id, project_id, labour_id, total_amount, status, created_at
       FROM wages
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [project_id, limit, offset],
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
   * Create material request
   */
  createMaterialRequest: async (
    { client_action_id, project_id, title, category, quantity, description },
    context,
  ) => {
    const engineerId = context.user.id;

    try {
      // Check idempotency
      const idempotencyCheck = await checkIdempotency(client_action_id);
      if (idempotencyCheck.isDuplicate) {
        return {
          success: true,
          request_id: idempotencyCheck.existingLog.entity_id,
          sync_status: "DUPLICATE",
          error: null,
        };
      }

      // Reuse sync service logic
      const action = {
        id: client_action_id,
        action_type: "CREATE_MATERIAL_REQUEST",
        entity_type: "MATERIAL_REQUEST",
        project_id,
        payload: { title, category, quantity, description },
      };

      const result = await applyAction(action, engineerId, "SITE_ENGINEER");

      return {
        success: result.success,
        request_id: result.entityId,
        sync_status: result.success ? "APPLIED" : "REJECTED",
        error: result.error || null,
      };
    } catch (error) {
      console.error(
        "[Engineer GraphQL] Create material request error:",
        error.message,
      );
      return {
        success: false,
        request_id: null,
        sync_status: "REJECTED",
        error: error.message,
      };
    }
  },

  /**
   * Update material request
   */
  updateMaterialRequest: async (
    { client_action_id, request_id, title, quantity, description },
    context,
  ) => {
    const engineerId = context.user.id;

    try {
      // Check idempotency
      const idempotencyCheck = await checkIdempotency(client_action_id);
      if (idempotencyCheck.isDuplicate) {
        return {
          success: true,
          request_id: idempotencyCheck.existingLog.entity_id,
          sync_status: "DUPLICATE",
          error: null,
        };
      }

      // Reuse sync service logic
      const action = {
        id: client_action_id,
        action_type: "UPDATE_MATERIAL_REQUEST",
        entity_type: "MATERIAL_REQUEST",
        project_id: null, // Will be fetched from request
        payload: { request_id, title, quantity, description },
      };

      const result = await applyAction(action, engineerId, "SITE_ENGINEER");

      return {
        success: result.success,
        request_id: result.entityId || request_id,
        sync_status: result.success ? "APPLIED" : "REJECTED",
        error: result.error || null,
      };
    } catch (error) {
      console.error(
        "[Engineer GraphQL] Update material request error:",
        error.message,
      );
      return {
        success: false,
        request_id: null,
        sync_status: "REJECTED",
        error: error.message,
      };
    }
  },

  /**
   * Delete material request
   */
  deleteMaterialRequest: async ({ client_action_id, request_id }, context) => {
    const engineerId = context.user.id;

    try {
      // Check idempotency
      const idempotencyCheck = await checkIdempotency(client_action_id);
      if (idempotencyCheck.isDuplicate) {
        return {
          success: true,
          sync_status: "DUPLICATE",
          error: null,
        };
      }

      // Reuse sync service logic
      const action = {
        id: client_action_id,
        action_type: "DELETE_MATERIAL_REQUEST",
        entity_type: "MATERIAL_REQUEST",
        project_id: null, // Will be fetched from request
        payload: { request_id },
      };

      const result = await applyAction(action, engineerId, "SITE_ENGINEER");

      return {
        success: result.success,
        sync_status: result.success ? "APPLIED" : "REJECTED",
        error: result.error || null,
      };
    } catch (error) {
      console.error(
        "[Engineer GraphQL] Delete material request error:",
        error.message,
      );
      return {
        success: false,
        sync_status: "REJECTED",
        error: error.message,
      };
    }
  },

  /**
   * Create manual attendance
   */
  createManualAttendance: async (
    { client_action_id, project_id, labour_id, attendance_date, work_hours },
    context,
  ) => {
    const engineerId = context.user.id;

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
        action_type: "MANUAL_ATTENDANCE",
        entity_type: "ATTENDANCE",
        project_id,
        payload: { labour_id, attendance_date, work_hours },
      };

      const result = await applyAction(action, engineerId, "SITE_ENGINEER");

      return {
        success: result.success,
        attendance_id: result.entityId,
        sync_status: result.success ? "APPLIED" : "REJECTED",
        error: result.error || null,
      };
    } catch (error) {
      console.error(
        "[Engineer GraphQL] Create manual attendance error:",
        error.message,
      );
      return {
        success: false,
        attendance_id: null,
        sync_status: "REJECTED",
        error: error.message,
      };
    }
  },
};

module.exports = engineerResolvers;
