const pool = require("../db");

/**
 * Reusable audit logging utility
 * Logs UPDATE and DELETE operations to audit_logs table
 *
 * @param {Object} params - Audit log parameters
 * @param {string} params.entityType - Type of entity (e.g., 'MATERIAL_REQUEST')
 * @param {string} params.entityId - UUID of the affected entity
 * @param {string} params.category - Category (DPR, MATERIAL_REQUEST, MATERIAL_BILL, ATTENDANCE, WAGES, PLAN_ITEM, PROJECT)
 * @param {string} params.action - Action type ('UPDATE' or 'DELETE')
 * @param {Object} params.before - State before the operation
 * @param {Object} params.after - State after the operation (null for DELETE)
 * @param {Object} params.user - User object with id and role
 * @param {string} params.projectId - Project UUID (optional)
 * @param {string} params.organizationId - Organization UUID (optional)
 * @param {Object} params.client - PostgreSQL client (for transactions) or null (will use pool)
 * @returns {Promise<void>}
 */
async function logAudit({
  entityType,
  entityId,
  category,
  action,
  before,
  after,
  user,
  projectId = null,
  organizationId = null,
  client = null,
}) {
  try {
    // Build change_summary
    const changeSummary = {
      action,
      before,
      after,
    };

    // For UPDATE, calculate changed fields
    if (action === "UPDATE" && before && after) {
      const changedFields = [];
      for (const key in after) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
          changedFields.push(key);
        }
      }
      changeSummary.changed_fields = changedFields;
    }

    const query = `
      INSERT INTO audit_logs (
        entity_type,
        entity_id,
        category,
        action,
        acted_by_id,
        acted_by_role,
        project_id,
        organization_id,
        change_summary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const values = [
      entityType,
      entityId,
      category,
      action,
      user.id,
      user.role,
      projectId,
      organizationId,
      JSON.stringify(changeSummary),
    ];

    // Use provided client (for transactions) or pool
    const executor = client || pool;
    await executor.query(query, values);
  } catch (error) {
    // Log error but don't block the main operation
    console.error("Audit log insertion failed:", error.message);
    console.error("Audit details:", {
      entityType,
      entityId,
      category,
      action,
      userId: user?.id,
      userRole: user?.role,
    });
  }
}

/**
 * Helper to derive organization_id from project_id
 * @param {string} projectId - Project UUID
 * @param {Object} client - PostgreSQL client (for transactions) or null
 * @returns {Promise<string|null>} Organization UUID or null
 */
async function getOrganizationIdFromProject(projectId, client = null) {
  try {
    const executor = client || pool;
    const result = await executor.query(
      "SELECT organization_id FROM projects WHERE id = $1",
      [projectId],
    );
    return result.rows[0]?.organization_id || null;
  } catch (error) {
    console.error("Failed to fetch organization_id:", error.message);
    return null;
  }
}

module.exports = {
  logAudit,
  getOrganizationIdFromProject,
};
