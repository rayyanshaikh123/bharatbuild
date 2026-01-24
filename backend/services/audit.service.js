const pool = require("../db");

/**
 * Audit Service
 * Provides role-aware audit log access
 */

/**
 * Get audit logs for owner (all org audits)
 * @param {string} ownerId - Owner's user ID
 * @param {Object} filters - { project_id, category, start_date, end_date, page, limit }
 * @returns {Object} Audit logs with pagination
 */
async function getOwnerAudits(ownerId, filters = {}) {
  const client = await pool.connect();
  try {
    // Get organization ID
    const orgResult = await client.query(
      "SELECT id FROM organizations WHERE owner_id = $1",
      [ownerId],
    );

    if (orgResult.rows.length === 0) {
      throw new Error("Organization not found for owner");
    }

    const orgId = orgResult.rows[0].id;

    const {
      project_id = null,
      category = null,
      start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end_date = new Date().toISOString().split("T")[0],
      page = 1,
      limit = 50,
    } = filters;

    const offset = (page - 1) * limit;

    // Build query
    const result = await client.query(
      `
      SELECT 
        al.*,
        p.name as project_name
      FROM audit_logs al
      LEFT JOIN projects p ON al.project_id = p.id
      WHERE al.organization_id = $1
        AND al.created_at::date BETWEEN $2 AND $3
        AND ($4::uuid IS NULL OR al.project_id = $4)
        AND ($5::text IS NULL OR al.category = $5)
      ORDER BY al.created_at DESC
      LIMIT $6 OFFSET $7
    `,
      [orgId, start_date, end_date, project_id, category, limit, offset],
    );

    // Get total count
    const countResult = await client.query(
      `
      SELECT COUNT(*) as total
      FROM audit_logs
      WHERE organization_id = $1
        AND created_at::date BETWEEN $2 AND $3
        AND ($4::uuid IS NULL OR project_id = $4)
        AND ($5::text IS NULL OR category = $5)
    `,
      [orgId, start_date, end_date, project_id, category],
    );

    const total = parseInt(countResult.rows[0].total);

    return {
      audits: result.rows.map(formatAuditLog),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        total_pages: Math.ceil(total / limit),
      },
      filters: {
        project_id: project_id,
        category: category,
        start_date: start_date,
        end_date: end_date,
      },
    };
  } finally {
    client.release();
  }
}

/**
 * Get audit logs for manager (assigned projects only)
 * @param {string} managerId - Manager's user ID
 * @param {Object} filters - { project_id, category, start_date, end_date, page, limit }
 * @returns {Object} Audit logs with pagination
 */
async function getManagerAudits(managerId, filters = {}) {
  const client = await pool.connect();
  try {
    // Get assigned project IDs
    const projectsResult = await client.query(
      `
      SELECT project_id
      FROM project_managers
      WHERE manager_id = $1 AND status = 'ACTIVE'
    `,
      [managerId],
    );

    const projectIds = projectsResult.rows.map((r) => r.project_id);

    if (projectIds.length === 0) {
      return {
        audits: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          total_pages: 0,
        },
        filters: filters,
      };
    }

    const {
      project_id = null,
      category = null,
      start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end_date = new Date().toISOString().split("T")[0],
      page = 1,
      limit = 50,
    } = filters;

    const offset = (page - 1) * limit;

    // Validate project_id if provided
    if (project_id && !projectIds.includes(project_id)) {
      throw new Error("Unauthorized: Project not assigned to manager");
    }

    // Build query
    const result = await client.query(
      `
      SELECT 
        al.*,
        p.name as project_name
      FROM audit_logs al
      LEFT JOIN projects p ON al.project_id = p.id
      WHERE al.project_id = ANY($1)
        AND al.created_at::date BETWEEN $2 AND $3
        AND ($4::uuid IS NULL OR al.project_id = $4)
        AND ($5::text IS NULL OR al.category = $5)
      ORDER BY al.created_at DESC
      LIMIT $6 OFFSET $7
    `,
      [projectIds, start_date, end_date, project_id, category, limit, offset],
    );

    // Get total count
    const countResult = await client.query(
      `
      SELECT COUNT(*) as total
      FROM audit_logs
      WHERE project_id = ANY($1)
        AND created_at::date BETWEEN $2 AND $3
        AND ($4::uuid IS NULL OR project_id = $4)
        AND ($5::text IS NULL OR category = $5)
    `,
      [projectIds, start_date, end_date, project_id, category],
    );

    const total = parseInt(countResult.rows[0].total);

    return {
      audits: result.rows.map(formatAuditLog),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        total_pages: Math.ceil(total / limit),
      },
      filters: {
        project_id: project_id,
        category: category,
        start_date: start_date,
        end_date: end_date,
      },
    };
  } finally {
    client.release();
  }
}

/**
 * Get audit logs for engineer (all project activity where they are assigned)
 */
async function getEngineerAudits(engineerId, filters = {}) {
  const client = await pool.connect();
  try {
    // Get projects where engineer is assigned
    const projectsResult = await client.query(
      `SELECT project_id FROM project_site_engineers WHERE site_engineer_id = $1`,
      [engineerId],
    );

    const projectIds = projectsResult.rows.map((r) => r.project_id);

    if (projectIds.length === 0) {
      return {
        audits: [],
        pagination: { page: 1, limit: 50, total: 0, total_pages: 0 },
        filters: filters,
      };
    }

    const {
      project_id = null,
      category = null,
      page = 1,
      limit = 50,
    } = filters;

    const offset = (page - 1) * limit;

    // Build query
    const result = await client.query(
      `
        SELECT 
          al.*,
          p.name as project_name
        FROM audit_logs al
        LEFT JOIN projects p ON al.project_id = p.id
        WHERE al.project_id = ANY($1)
          AND ($2::uuid IS NULL OR al.project_id = $2)
          AND ($3::text IS NULL OR al.category = $3)
        ORDER BY al.created_at DESC
        LIMIT $4 OFFSET $5
      `,
      [projectIds, project_id, category, limit, offset],
    );

    // Get total count
    const countResult = await client.query(
      `
        SELECT COUNT(*) as total
        FROM audit_logs
        WHERE project_id = ANY($1)
          AND ($2::uuid IS NULL OR project_id = $2)
          AND ($3::text IS NULL OR category = $3)
      `,
      [projectIds, project_id, category],
    );

    const total = parseInt(countResult.rows[0].total);

    return {
      audits: result.rows.map(formatAuditLog),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        total_pages: Math.ceil(total / limit),
      },
    };
  } finally {
    client.release();
  }
}

/**
 * Format audit log for response
 * @param {Object} log - Raw audit log from database
 * @returns {Object} Formatted audit log
 */
function formatAuditLog(log) {
  return {
    id: log.id,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    category: log.category,
    action: log.action,
    acted_by_id: log.acted_by_id,
    acted_by_role: log.acted_by_role,
    project_id: log.project_id,
    project_name: log.project_name,
    organization_id: log.organization_id,
    change_summary: log.change_summary,
    created_at: log.created_at,
  };
}

module.exports = {
  getOwnerAudits,
  getManagerAudits,
  getEngineerAudits,
};
