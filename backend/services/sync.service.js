const pool = require("../db");
const { validateGeofence } = require("../util/geofence");

/**
 * Sync Service
 * Handles offline action synchronization with idempotency and audit logging
 */

/**
 * Validate action structure
 * @param {Object} action - Offline action
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateAction(action) {
  // Required fields
  if (!action.id) {
    return { valid: false, error: "Action ID is required" };
  }

  if (!action.action_type) {
    return { valid: false, error: "Action type is required" };
  }

  if (!action.entity_type) {
    return { valid: false, error: "Entity type is required" };
  }

  if (!action.project_id) {
    return { valid: false, error: "Project ID is required" };
  }

  if (!action.payload || typeof action.payload !== "object") {
    return { valid: false, error: "Payload is required and must be an object" };
  }

  // Valid action types
  const validActions = [
    "CHECK_IN",
    "CHECK_OUT",
    "CREATE_MATERIAL_REQUEST",
    "UPDATE_MATERIAL_REQUEST",
    "DELETE_MATERIAL_REQUEST",
    "CREATE_DPR",
    "MANUAL_ATTENDANCE",
    "TRACK",
  ];

  if (!validActions.includes(action.action_type)) {
    return {
      valid: false,
      error: `Invalid action type: ${action.action_type}`,
    };
  }

  // Valid entity types
  const validEntities = ["ATTENDANCE", "MATERIAL_REQUEST", "DPR"];
  if (!validEntities.includes(action.entity_type)) {
    return {
      valid: false,
      error: `Invalid entity type: ${action.entity_type}`,
    };
  }

  return { valid: true };
}

/**
 * Check authorization for action
 * @param {String} userId - User ID
 * @param {String} userRole - User role (LABOUR | SITE_ENGINEER)
 * @param {Object} action - Offline action
 * @returns {Object} { authorized: boolean, error?: string }
 */
async function checkAuthorization(userId, userRole, action) {
  try {
    const { action_type, project_id } = action;

    // Labour actions
    const labourActions = ["CHECK_IN", "CHECK_OUT"];
    if (labourActions.includes(action_type)) {
      if (userRole !== "LABOUR") {
        return {
          authorized: false,
          error: "Only labours can perform this action",
        };
      }

      // Check if labour exists
      const labourCheck = await pool.query(
        `SELECT id FROM labours WHERE id = $1::uuid`,
        [userId],
      );

      if (labourCheck.rows.length === 0) {
        return { authorized: false, error: "Labour not found" };
      }

      return { authorized: true };
    }

    // Site engineer actions
    const engineerActions = [
      "CREATE_MATERIAL_REQUEST",
      "UPDATE_MATERIAL_REQUEST",
      "DELETE_MATERIAL_REQUEST",
      "CREATE_DPR",
      "MANUAL_ATTENDANCE",
    ];

    if (engineerActions.includes(action_type)) {
      if (userRole !== "SITE_ENGINEER") {
        return {
          authorized: false,
          error: "Only site engineers can perform this action",
        };
      }

      // Check if engineer is ACTIVE in project
      const engineerCheck = await pool.query(
        `SELECT id FROM project_site_engineers 
         WHERE site_engineer_id = $1::uuid AND project_id = $2::uuid AND status = 'ACTIVE'`,
        [userId, project_id],
      );

      if (engineerCheck.rows.length === 0) {
        return {
          authorized: false,
          error: "Not an active engineer in this project",
        };
      }

      return { authorized: true };
    }

    return { authorized: false, error: "Unknown action type" };
  } catch (error) {
    console.error("[Sync Service] Authorization error:", error.message);
    return { authorized: false, error: "Authorization check failed" };
  }
}

/**
 * Check if action already processed (idempotency)
 * @param {String} actionId - Action ID
 * @returns {Object} { isDuplicate: boolean, existingLog?: object }
 */
async function checkIdempotency(actionId) {
  try {
    const result = await pool.query(
      `SELECT id, status, error_message, entity_id FROM sync_action_log WHERE id = $1::uuid`,
      [actionId],
    );

    if (result.rows.length > 0) {
      return {
        isDuplicate: true,
        existingLog: result.rows[0],
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error("[Sync Service] Idempotency check error:", error.message);
    return { isDuplicate: false };
  }
}

/**
 * Log sync action
 */
async function logSyncAction(
  client,
  actionId,
  userId,
  userRole,
  action,
  status,
  entityId,
  errorMessage,
  orgId,
) {
  await client.query(
    `INSERT INTO sync_action_log 
     (id, user_id, user_role, action_type, entity_type, entity_id, project_id, organization_id, payload, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      actionId,
      userId,
      userRole,
      action.action_type,
      action.entity_type,
      entityId,
      action.project_id,
      orgId,
      JSON.stringify(action.payload),
      status,
      errorMessage,
    ],
  );
}

/**
 * Log sync error
 */
async function logSyncError(client, actionId, userId, reason, payload) {
  await client.query(
    `INSERT INTO sync_errors (id, sync_action_id, user_id, reason, payload)
     VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
    [actionId, userId, reason, JSON.stringify(payload)],
  );
}

/**
 * Get organization ID from project
 */
async function getOrgIdFromProject(client, projectId) {
  const result = await client.query(
    `SELECT org_id FROM projects WHERE id = $1::uuid`,
    [projectId],
  );
  return result.rows.length > 0 ? result.rows[0].org_id : null;
}

/**
 * Handle CHECK_IN action
 */
async function handleCheckIn(client, action, userId) {
  const { project_id, payload } = action;
  const { latitude, longitude, timestamp } = payload;

  if (!latitude || !longitude || !timestamp) {
    throw new Error("Missing required fields: latitude, longitude, timestamp");
  }

  // Validate geofence (JSONB priority)
  const geofenceResult = await validateGeofence(
    client,
    project_id,
    latitude,
    longitude,
  );

  if (!geofenceResult.isValid) {
    throw new Error(
      `Outside geofence: ${geofenceResult.distance}m from allowed ${geofenceResult.allowedRadius}m`,
    );
  }

  // Check if already checked in today
  const attendanceDate = new Date(timestamp).toISOString().split("T")[0];
  const existing = await client.query(
    `SELECT id FROM attendance 
     WHERE labour_id = $1::uuid AND project_id = $2::uuid AND attendance_date = $3 AND check_in_time IS NOT NULL`,
    [userId, project_id, attendanceDate],
  );

  if (existing.rows.length > 0) {
    throw new Error("Already checked in for today");
  }

  // Insert attendance
  const result = await client.query(
    `INSERT INTO attendance (project_id, labour_id, attendance_date, check_in_time, source)
     VALUES ($1, $2, $3, $4, 'OFFLINE_SYNC')
     RETURNING id`,
    [project_id, userId, attendanceDate, timestamp],
  );

  return result.rows[0].id;
}

/**
 * Handle CHECK_OUT action
 */
async function handleCheckOut(client, action, userId) {
  const { project_id, payload } = action;
  const { latitude, longitude, timestamp } = payload;

  if (!latitude || !longitude || !timestamp) {
    throw new Error("Missing required fields: latitude, longitude, timestamp");
  }

  // Validate geofence
  const geofenceResult = await validateGeofence(
    client,
    project_id,
    latitude,
    longitude,
  );

  if (!geofenceResult.isValid) {
    throw new Error(
      `Outside geofence: ${geofenceResult.distance}m from allowed ${geofenceResult.allowedRadius}m`,
    );
  }

  // Find today's attendance
  const attendanceDate = new Date(timestamp).toISOString().split("T")[0];
  const attendance = await client.query(
    `SELECT id, check_in_time FROM attendance 
     WHERE labour_id = $1::uuid AND project_id = $2::uuid AND attendance_date = $3`,
    [userId, project_id, attendanceDate],
  );

  if (attendance.rows.length === 0) {
    throw new Error("No check-in found for today");
  }

  // Calculate work hours
  const checkInTime = new Date(attendance.rows[0].check_in_time);
  const checkOutTime = new Date(timestamp);
  const workHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);

  if (workHours < 0) {
    throw new Error("Check-out time cannot be before check-in time");
  }

  // Update attendance
  await client.query(
    `UPDATE attendance 
     SET check_out_time = $1, work_hours = $2, source = 'OFFLINE_SYNC'
     WHERE id = $3::uuid`,
    [timestamp, workHours, attendance.rows[0].id],
  );

  return attendance.rows[0].id;
}

/**
 * Handle CREATE_MATERIAL_REQUEST action
 */
async function handleCreateMaterialRequest(client, action, userId) {
  const { project_id, payload } = action;
  const { title, category, quantity, description } = payload;

  if (!title || !category || !quantity) {
    throw new Error("Missing required fields: title, category, quantity");
  }

  // Insert material request
  const result = await client.query(
    `INSERT INTO material_requests (project_id, site_engineer_id, title, category, quantity, description, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
     RETURNING id`,
    [project_id, userId, title, category, quantity, description || ""],
  );

  return result.rows[0].id;
}

/**
 * Handle UPDATE_MATERIAL_REQUEST action
 */
async function handleUpdateMaterialRequest(client, action, userId) {
  const { payload } = action;
  const { request_id, title, category, quantity, description } = payload;

  if (!request_id) {
    throw new Error("Missing required field: request_id");
  }

  // Check if request exists and is PENDING
  const requestCheck = await client.query(
    `SELECT id, status FROM material_requests 
     WHERE id = $1::uuid AND site_engineer_id = $2::uuid`,
    [request_id, userId],
  );

  if (requestCheck.rows.length === 0) {
    throw new Error("Material request not found or not owned by you");
  }

  if (requestCheck.rows[0].status !== "PENDING") {
    throw new Error("Can only update PENDING requests");
  }

  // Update request
  const updates = [];
  const values = [];
  let paramIdx = 1;

  if (title) {
    updates.push(`title = $${paramIdx++}`);
    values.push(title);
  }
  if (category) {
    updates.push(`category = $${paramIdx++}`);
    values.push(category);
  }
  if (quantity) {
    updates.push(`quantity = $${paramIdx++}`);
    values.push(quantity);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIdx++}`);
    values.push(description);
  }

  if (updates.length === 0) {
    throw new Error("No fields to update");
  }

  values.push(request_id);

  await client.query(
    `UPDATE material_requests SET ${updates.join(", ")} WHERE id = $${paramIdx}`,
    values,
  );

  return request_id;
}

/**
 * Handle DELETE_MATERIAL_REQUEST action
 */
async function handleDeleteMaterialRequest(client, action, userId) {
  const { payload } = action;
  const { request_id } = payload;

  if (!request_id) {
    throw new Error("Missing required field: request_id");
  }

  // Check if request exists and is PENDING
  const requestCheck = await client.query(
    `SELECT id, status FROM material_requests 
     WHERE id = $1::uuid AND site_engineer_id = $2::uuid`,
    [request_id, userId],
  );

  if (requestCheck.rows.length === 0) {
    throw new Error("Material request not found or not owned by you");
  }

  if (requestCheck.rows[0].status !== "PENDING") {
    throw new Error("Can only delete PENDING requests");
  }

  // Delete request
  await client.query(`DELETE FROM material_requests WHERE id = $1::uuid`, [
    request_id,
  ]);

  return request_id;
}

/**
 * Handle CREATE_DPR action
 */
async function handleCreateDPR(client, action, userId) {
  const { project_id, payload } = action;
  const {
    title,
    description,
    report_date,
    work_done,
    materials_used,
    manpower_deployed,
  } = payload;

  if (!title || !report_date) {
    throw new Error("Missing required fields: title, report_date");
  }

  // Insert DPR
  const result = await client.query(
    `INSERT INTO dprs (project_id, site_engineer_id, title, description, report_date, work_done, materials_used, manpower_deployed, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING id`,
    [
      project_id,
      userId,
      title,
      description || "",
      report_date,
      work_done || "",
      materials_used || "",
      manpower_deployed || "",
    ],
  );

  return result.rows[0].id;
}

/**
 * Handle MANUAL_ATTENDANCE action
 */
async function handleManualAttendance(client, action, userId) {
  const { project_id, payload } = action;
  const { labour_id, attendance_date, work_hours } = payload;

  if (!labour_id || !attendance_date || !work_hours) {
    throw new Error(
      "Missing required fields: labour_id, attendance_date, work_hours",
    );
  }

  // Check if attendance already exists
  const existing = await client.query(
    `SELECT id FROM attendance 
     WHERE labour_id = $1::uuid AND project_id = $2::uuid AND attendance_date = $3`,
    [labour_id, project_id, attendance_date],
  );

  if (existing.rows.length > 0) {
    throw new Error("Attendance already exists for this date");
  }

  // Insert manual attendance (auto-approved)
  const result = await client.query(
    `INSERT INTO attendance (project_id, labour_id, site_engineer_id, attendance_date, work_hours, status, approved_by, approved_at, source)
     VALUES ($1, $2, $3, $4, $5, 'APPROVED', $3, NOW(), 'OFFLINE_SYNC')
     RETURNING id`,
    [project_id, labour_id, userId, attendance_date, work_hours],
  );

  return result.rows[0].id;
}

/**
 * Handle TRACK action (Geofence monitoring)
 */
async function handleTrack(client, action, userId) {
  const { project_id, payload } = action;
  const { latitude, longitude, timestamp } = payload;

  if (latitude === undefined || longitude === undefined || !timestamp) {
    throw new Error("Missing required fields: latitude, longitude, timestamp");
  }

  // 1. Find active attendance
  const attendanceRes = await client.query(
    `SELECT a.*, p.org_id 
     FROM attendance a
     JOIN projects p ON a.project_id = p.id
     WHERE a.labour_id = $1::uuid AND a.project_id = $2::uuid 
     AND a.attendance_date = ($3::timestamp)::date
     ORDER BY a.id DESC LIMIT 1`,
    [userId, project_id, timestamp],
  );

  if (attendanceRes.rows.length === 0) {
    throw new Error("No active attendance session found for the given date");
  }

  const attendance = attendanceRes.rows[0];
  const orgId = attendance.org_id;
  const maxAllowedExits = attendance.max_allowed_exits || 3;

  // 2. Already blacklisted?
  const blacklistCheck = await client.query(
    `SELECT id FROM organization_blacklist 
     WHERE org_id = $1 AND labour_id = $2 
     AND created_at + interval '3 days' > NOW()`,
    [orgId, userId],
  );

  if (blacklistCheck.rows.length > 0) {
    throw new Error("Labour is currently blacklisted");
  }

  // 3. Validate Geofence
  const geofenceResult = await validateGeofence(
    client,
    project_id,
    latitude,
    longitude,
  );

  const isCurrentlyBreached = !geofenceResult.isValid;
  let entryExitCount = attendance.entry_exit_count || 0;

  // CASE 1: EXIT (Inside -> Outside)
  if (isCurrentlyBreached && !attendance.is_currently_breached) {
    const activeSessionRes = await client.query(
      `SELECT id, check_in_time FROM attendance_sessions 
       WHERE attendance_id = $1 AND check_out_time IS NULL
       ORDER BY check_in_time DESC LIMIT 1`,
      [attendance.id],
    );

    if (activeSessionRes.rows.length > 0) {
      const sessionId = activeSessionRes.rows[0].id;
      const checkInTime = activeSessionRes.rows[0].check_in_time;

      await client.query(
        `UPDATE attendance_sessions 
         SET check_out_time = $1,
             worked_minutes = EXTRACT(EPOCH FROM ($1::timestamp - check_in_time)) / 60
         WHERE id = $2`,
        [timestamp, sessionId],
      );
    }

    entryExitCount += 1;

    // Update total work hours
    const totalRes = await client.query(
      `SELECT SUM(worked_minutes) as total_minutes 
       FROM attendance_sessions 
       WHERE attendance_id = $1 AND check_out_time IS NOT NULL`,
      [attendance.id],
    );

    const work_hours = (totalRes.rows[0].total_minutes || 0) / 60;
    await client.query(`UPDATE attendance SET work_hours = $1 WHERE id = $2`, [
      work_hours,
      attendance.id,
    ]);

    // Blacklist if exceeded
    if (entryExitCount > maxAllowedExits) {
      await client.query(
        `INSERT INTO organization_blacklist (org_id, labour_id, reason)
         VALUES ($1, $2, $3)
         ON CONFLICT (org_id, labour_id) DO NOTHING`,
        [orgId, userId, "Exceeded maximum allowed exits"],
      );
    }
  }

  // CASE 2: RE-ENTRY (Outside -> Inside)
  if (!isCurrentlyBreached && attendance.is_currently_breached) {
    if (entryExitCount <= maxAllowedExits) {
      const activeSessionCheck = await client.query(
        `SELECT id FROM attendance_sessions 
         WHERE attendance_id = $1 AND check_out_time IS NULL`,
        [attendance.id],
      );

      if (activeSessionCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO attendance_sessions (attendance_id, check_in_time)
           VALUES ($1, $2)`,
          [attendance.id, timestamp],
        );
      }
    }
  }

  // 4. Update attendance state
  await client.query(
    `UPDATE attendance 
     SET last_known_lat = $1, 
         last_known_lng = $2, 
         is_currently_breached = $3,
         entry_exit_count = $4,
         last_event_at = $5
     WHERE id = $6`,
    [latitude, longitude, isCurrentlyBreached, entryExitCount, timestamp, attendance.id],
  );

  return attendance.id;
}

/**
 * Apply action (main orchestrator)
 * @param {Object} action - Offline action
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} { success: boolean, entityId?: uuid, error?: string }
 */
async function applyAction(action, userId, userRole) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orgId = await getOrgIdFromProject(client, action.project_id);
    let entityId = null;

    // Route to appropriate handler
    switch (action.action_type) {
      case "CHECK_IN":
        entityId = await handleCheckIn(client, action, userId);
        break;

      case "CHECK_OUT":
        entityId = await handleCheckOut(client, action, userId);
        break;

      case "CREATE_MATERIAL_REQUEST":
        entityId = await handleCreateMaterialRequest(client, action, userId);
        break;

      case "UPDATE_MATERIAL_REQUEST":
        entityId = await handleUpdateMaterialRequest(client, action, userId);
        break;

      case "DELETE_MATERIAL_REQUEST":
        entityId = await handleDeleteMaterialRequest(client, action, userId);
        break;

      case "CREATE_DPR":
        entityId = await handleCreateDPR(client, action, userId);
        break;

      case "MANUAL_ATTENDANCE":
        entityId = await handleManualAttendance(client, action, userId);
        break;

      case "TRACK":
        entityId = await handleTrack(client, action, userId);
        break;

      default:
        throw new Error(`Unsupported action type: ${action.action_type}`);
    }

    // Log success
    await logSyncAction(
      client,
      action.id,
      userId,
      userRole,
      action,
      "APPLIED",
      entityId,
      null,
      orgId,
    );

    await client.query("COMMIT");

    return { success: true, entityId };
  } catch (error) {
    await client.query("ROLLBACK");

    // Log error
    try {
      await client.query("BEGIN");
      await logSyncError(
        client,
        action.id,
        userId,
        error.message,
        action.payload,
      );
      const orgId = await getOrgIdFromProject(client, action.project_id);
      await logSyncAction(
        client,
        action.id,
        userId,
        userRole,
        action,
        "REJECTED",
        null,
        error.message,
        orgId,
      );
      await client.query("COMMIT");
    } catch (logError) {
      await client.query("ROLLBACK");
      console.error("[Sync Service] Failed to log error:", logError.message);
    }

    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

module.exports = {
  validateAction,
  checkAuthorization,
  checkIdempotency,
  applyAction,
  logSyncAction,
  logSyncError,
};
