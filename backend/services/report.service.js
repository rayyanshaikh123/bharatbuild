const pool = require("../db");
const { calculatePercentage } = require("../util/reportFilters");

/**
 * Report Service
 * Core business logic for generating reports
 */

/**
 * Get organization ID by owner ID
 */
async function getOrgIdByOwnerId(ownerId) {
  const result = await pool.query(
    `SELECT id FROM organizations WHERE owner_id = $1`,
    [ownerId],
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Get all project IDs for an organization
 */
async function getAllProjectIds(orgId) {
  const result = await pool.query(`SELECT id FROM projects WHERE org_id = $1`, [
    orgId,
  ]);
  return result.rows.map((row) => row.id);
}

/**
 * Get assigned project IDs for a manager
 */
async function getAssignedProjectIds(managerId) {
  const result = await pool.query(
    `SELECT project_id FROM project_managers 
     WHERE manager_id = $1 AND status = 'ACTIVE'`,
    [managerId],
  );
  return result.rows.map((row) => row.project_id);
}

/**
 * Financial Report
 * @param {String} userId - User ID
 * @param {String} userType - 'owner' or 'manager'
 * @param {Object} filters - Date and entity filters
 * @returns {Object} Financial report data
 */
async function getFinancialReport(userId, userType, filters) {
  let projectIds = [];
  let orgId = null;

  // Authorization: Get accessible projects
  if (userType === "owner") {
    orgId = await getOrgIdByOwnerId(userId);
    if (!orgId) throw new Error("Organization not found");
    projectIds = await getAllProjectIds(orgId);
  } else if (userType === "manager") {
    projectIds = await getAssignedProjectIds(userId);
  }

  if (projectIds.length === 0) {
    return {
      summary: {
        total_budget: 0,
        total_invested: 0,
        budget_utilization: 0,
        total_material_cost: 0,
        total_wages: 0,
        total_adjustments: 0,
      },
      breakdown: { by_project: [], by_category: {}, by_month: [] },
      projects: [],
    };
  }

  // Apply project filter if specified
  if (filters.project_id) {
    if (!projectIds.includes(filters.project_id)) {
      throw new Error("Unauthorized: Project not accessible");
    }
    projectIds = [filters.project_id];
  }

  // Summary: Budget and Investment
  const summaryResult = await pool.query(
    `SELECT 
      COALESCE(SUM(budget), 0) as total_budget,
      COALESCE(SUM(current_invested), 0) as total_invested
     FROM projects
     WHERE id = ANY($1::uuid[])`,
    [projectIds],
  );

  const summary = summaryResult.rows[0];

  // Material costs (approved bills within date range)
  const materialResult = await pool.query(
    `SELECT COALESCE(SUM(total_amount), 0) as total_material_cost
     FROM material_bills
     WHERE project_id = ANY($1::uuid[]) 
       AND status = 'APPROVED'
       AND reviewed_at >= $2 AND reviewed_at <= $3`,
    [projectIds, filters.start_date, filters.end_date],
  );

  // Wage costs (approved wages within date range)
  const wageResult = await pool.query(
    `SELECT COALESCE(SUM(total_amount), 0) as total_wages
     FROM wages
     WHERE project_id = ANY($1::uuid[]) 
       AND status = 'APPROVED'
       AND approved_at >= $2 AND approved_at <= $3`,
    [projectIds, filters.start_date, filters.end_date],
  );

  summary.total_material_cost = parseFloat(
    materialResult.rows[0].total_material_cost,
  );
  summary.total_wages = parseFloat(wageResult.rows[0].total_wages);
  summary.budget_utilization = calculatePercentage(
    parseFloat(summary.total_invested),
    parseFloat(summary.total_budget),
  );

  // Breakdown by project
  const projectBreakdown = await pool.query(
    `SELECT 
      p.id, p.name, p.budget, p.current_invested,
      COALESCE(mb.material_cost, 0) as material_cost,
      COALESCE(w.wage_cost, 0) as wage_cost
     FROM projects p
     LEFT JOIN (
       SELECT project_id, SUM(total_amount) as material_cost
       FROM material_bills
       WHERE status = 'APPROVED' AND reviewed_at >= $2 AND reviewed_at <= $3
       GROUP BY project_id
     ) mb ON p.id = mb.project_id
     LEFT JOIN (
       SELECT project_id, SUM(total_amount) as wage_cost
       FROM wages
       WHERE status = 'APPROVED' AND approved_at >= $2 AND approved_at <= $3
       GROUP BY project_id
     ) w ON p.id = w.project_id
     WHERE p.id = ANY($1::uuid[])
     ORDER BY p.current_invested DESC`,
    [projectIds, filters.start_date, filters.end_date],
  );

  // Breakdown by category (materials)
  const categoryBreakdown = await pool.query(
    `SELECT category, COALESCE(SUM(total_amount), 0) as total
     FROM material_bills
     WHERE project_id = ANY($1::uuid[]) 
       AND status = 'APPROVED'
       AND reviewed_at >= $2 AND reviewed_at <= $3
     GROUP BY category
     ORDER BY total DESC`,
    [projectIds, filters.start_date, filters.end_date],
  );

  const byCategory = {};
  categoryBreakdown.rows.forEach((row) => {
    byCategory[row.category] = parseFloat(row.total);
  });

  // Breakdown by month
  const monthBreakdown = await pool.query(
    `SELECT 
      DATE_TRUNC('month', reviewed_at) as month,
      COALESCE(SUM(total_amount), 0) as material_cost
     FROM material_bills
     WHERE project_id = ANY($1::uuid[]) 
       AND status = 'APPROVED'
       AND reviewed_at >= $2 AND reviewed_at <= $3
     GROUP BY month
     ORDER BY month`,
    [projectIds, filters.start_date, filters.end_date],
  );

  return {
    report_type: "financial",
    filters: {
      start_date: filters.start_date,
      end_date: filters.end_date,
      project_ids: projectIds,
    },
    summary: {
      total_budget: parseFloat(summary.total_budget),
      total_invested: parseFloat(summary.total_invested),
      budget_utilization: summary.budget_utilization,
      total_material_cost: summary.total_material_cost,
      total_wages: summary.total_wages,
    },
    breakdown: {
      by_project: projectBreakdown.rows,
      by_category: byCategory,
      by_month: monthBreakdown.rows,
    },
  };
}

/**
 * Project Progress Report
 * @param {String} userId - User ID
 * @param {String} userType - 'owner' or 'manager'
 * @param {Object} filters - Date and entity filters
 * @returns {Object} Progress report data
 */
async function getProjectProgressReport(userId, userType, filters) {
  let projectIds = [];

  // Authorization
  if (userType === "owner") {
    const orgId = await getOrgIdByOwnerId(userId);
    projectIds = await getAllProjectIds(orgId);
  } else if (userType === "manager") {
    projectIds = await getAssignedProjectIds(userId);
  }

  if (projectIds.length === 0) {
    return { summary: {}, projects: [], delayed_items: [] };
  }

  if (filters.project_id) {
    if (!projectIds.includes(filters.project_id)) {
      throw new Error("Unauthorized");
    }
    projectIds = [filters.project_id];
  }

  // Project status distribution
  const statusDist = await pool.query(
    `SELECT status, COUNT(*) as count
     FROM projects
     WHERE id = ANY($1::uuid[])
     GROUP BY status`,
    [projectIds],
  );

  // Plan items summary
  const planSummary = await pool.query(
    `SELECT 
      COUNT(*) as total_items,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'DELAYED' THEN 1 END) as delayed,
      COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress
     FROM plan_items pi
     JOIN plans p ON pi.plan_id = p.id
     WHERE p.project_id = ANY($1)`,
    [projectIds],
  );

  // Delayed items with details
  const delayedItems = await pool.query(
    `SELECT 
      pi.id, pi.task_name, pi.period_start, pi.period_end, pi.completed_at,
      pi.delay_info,
      p.project_id,
      proj.name as project_name,
      EXTRACT(DAY FROM (pi.completed_at - pi.period_end)) as delay_days
     FROM plan_items pi
     JOIN plans p ON pi.plan_id = p.id
     JOIN projects proj ON p.project_id = proj.id
     WHERE p.project_id = ANY($1::uuid[]) AND pi.status = 'DELAYED'
     ORDER BY delay_days DESC
     LIMIT 20`,
    [projectIds],
  );

  // DPR count
  const dprCount = await pool.query(
    `SELECT COUNT(*) as total_dprs
     FROM dprs
     WHERE project_id = ANY($1::uuid[])
       AND report_date >= $2 AND report_date <= $3`,
    [projectIds, filters.start_date, filters.end_date],
  );

  const planStats = planSummary.rows[0];
  const completionPercentage = calculatePercentage(
    parseInt(planStats.completed),
    parseInt(planStats.total_items),
  );

  return {
    report_type: "project_progress",
    filters: {
      start_date: filters.start_date,
      end_date: filters.end_date,
      project_ids: projectIds,
    },
    summary: {
      project_status_distribution: statusDist.rows,
      plan_items: {
        total: parseInt(planStats.total_items),
        completed: parseInt(planStats.completed),
        pending: parseInt(planStats.pending),
        delayed: parseInt(planStats.delayed),
        in_progress: parseInt(planStats.in_progress),
        completion_percentage: completionPercentage,
      },
      total_dprs: parseInt(dprCount.rows[0].total_dprs),
    },
    delayed_items: delayedItems.rows,
  };
}

/**
 * Attendance & Workforce Report
 * @param {String} userId - User ID
 * @param {String} userType - 'owner' or 'manager'
 * @param {Object} filters - Date and entity filters
 * @returns {Object} Attendance report data
 */
async function getAttendanceReport(userId, userType, filters) {
  let projectIds = [];

  if (userType === "owner") {
    const orgId = await getOrgIdByOwnerId(userId);
    projectIds = await getAllProjectIds(orgId);
  } else if (userType === "manager") {
    projectIds = await getAssignedProjectIds(userId);
  }

  if (projectIds.length === 0) {
    return { summary: {}, breakdown: {} };
  }

  if (filters.project_id) {
    if (!projectIds.includes(filters.project_id)) {
      throw new Error("Unauthorized");
    }
    projectIds = [filters.project_id];
  }

  // Total attendance hours
  const hoursResult = await pool.query(
    `SELECT 
      COALESCE(SUM(work_hours), 0) as total_hours,
      COUNT(DISTINCT labour_id) as unique_labours,
      COUNT(*) as total_attendance_records,
      COUNT(CASE WHEN site_engineer_id IS NULL THEN 1 END) as manual_entries
     FROM attendance
     WHERE project_id = ANY($1::uuid[])
       AND attendance_date >= $2 AND attendance_date <= $3`,
    [projectIds, filters.start_date, filters.end_date],
  );

  // Breakdown by project
  const projectBreakdown = await pool.query(
    `SELECT 
      p.id, p.name,
      COALESCE(SUM(a.work_hours), 0) as total_hours,
      COUNT(DISTINCT a.labour_id) as unique_labours
     FROM projects p
     LEFT JOIN attendance a ON p.id = a.project_id
       AND a.attendance_date >= $2 AND a.attendance_date <= $3
     WHERE p.id = ANY($1::uuid[])
     GROUP BY p.id, p.name
     ORDER BY total_hours DESC`,
    [projectIds, filters.start_date, filters.end_date],
  );

  // Top labours by hours
  const topLabours = await pool.query(
    `SELECT 
      l.id, l.name, l.skill_type,
      COALESCE(SUM(a.work_hours), 0) as total_hours,
      COUNT(*) as attendance_count
     FROM labours l
     JOIN attendance a ON l.id = a.labour_id
     WHERE a.project_id = ANY($1::uuid[])
       AND a.attendance_date >= $2 AND a.attendance_date <= $3
     GROUP BY l.id, l.name, l.skill_type
     ORDER BY total_hours DESC
     LIMIT 10`,
    [projectIds, filters.start_date, filters.end_date],
  );

  const stats = hoursResult.rows[0];

  return {
    report_type: "attendance",
    filters: {
      start_date: filters.start_date,
      end_date: filters.end_date,
      project_ids: projectIds,
    },
    summary: {
      total_hours: parseFloat(stats.total_hours),
      unique_labours: parseInt(stats.unique_labours),
      total_records: parseInt(stats.total_attendance_records),
      manual_entries: parseInt(stats.manual_entries),
      avg_hours_per_labour:
        stats.unique_labours > 0
          ? parseFloat(stats.total_hours) / parseInt(stats.unique_labours)
          : 0,
    },
    breakdown: {
      by_project: projectBreakdown.rows,
      top_labours: topLabours.rows,
    },
  };
}

/**
 * Material Report
 * @param {String} userId - User ID
 * @param {String} userType - 'owner' or 'manager'
 * @param {Object} filters - Date and entity filters
 * @returns {Object} Material report data
 */
async function getMaterialReport(userId, userType, filters) {
  let projectIds = [];

  if (userType === "owner") {
    const orgId = await getOrgIdByOwnerId(userId);
    projectIds = await getAllProjectIds(orgId);
  } else if (userType === "manager") {
    projectIds = await getAssignedProjectIds(userId);
  }

  if (projectIds.length === 0) {
    return { summary: {}, breakdown: {} };
  }

  if (filters.project_id) {
    if (!projectIds.includes(filters.project_id)) {
      throw new Error("Unauthorized");
    }
    projectIds = [filters.project_id];
  }

  // Material requests summary
  const requestsSummary = await pool.query(
    `SELECT 
      COUNT(*) as total_requests,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
     FROM material_requests
     WHERE project_id = ANY($1::uuid[])
       AND created_at >= $2 AND created_at <= $3`,
    [projectIds, filters.start_date, filters.end_date],
  );

  // Material bills summary
  const billsSummary = await pool.query(
    `SELECT 
      COUNT(*) as total_bills,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected,
      COUNT(CASE WHEN material_request_id IS NULL THEN 1 END) as orphan_bills,
      COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN total_amount ELSE 0 END), 0) as total_approved_amount
     FROM material_bills
     WHERE project_id = ANY($1::uuid[])
       AND created_at >= $2 AND created_at <= $3`,
    [projectIds, filters.start_date, filters.end_date],
  );

  // Category breakdown
  const categoryBreakdown = await pool.query(
    `SELECT 
      category,
      COUNT(*) as request_count,
      COALESCE(SUM(quantity), 0) as total_quantity
     FROM material_requests
     WHERE project_id = ANY($1::uuid[])
       AND created_at >= $2 AND created_at <= $3
     GROUP BY category
     ORDER BY request_count DESC`,
    [projectIds, filters.start_date, filters.end_date],
  );

  return {
    report_type: "materials",
    filters: {
      start_date: filters.start_date,
      end_date: filters.end_date,
      project_ids: projectIds,
    },
    summary: {
      requests: requestsSummary.rows[0],
      bills: billsSummary.rows[0],
    },
    breakdown: {
      by_category: categoryBreakdown.rows,
    },
  };
}

/**
 * Audit & Compliance Report
 * @param {String} userId - User ID
 * @param {String} userType - 'owner' or 'manager'
 * @param {Object} filters - Date and entity filters
 * @returns {Object} Audit report data
 */
async function getAuditReport(userId, userType, filters) {
  let projectIds = [];
  let orgId = null;

  if (userType === "owner") {
    orgId = await getOrgIdByOwnerId(userId);
    projectIds = await getAllProjectIds(orgId);
  } else if (userType === "manager") {
    projectIds = await getAssignedProjectIds(userId);
  }

  if (projectIds.length === 0) {
    return { summary: {}, breakdown: {}, recent_audits: [] };
  }

  if (filters.project_id) {
    if (!projectIds.includes(filters.project_id)) {
      throw new Error("Unauthorized");
    }
    projectIds = [filters.project_id];
  }

  // Build query based on user type
  let auditQuery, auditParams;

  if (userType === "owner" && orgId) {
    // Owner sees org-wide audits
    auditQuery = `
      SELECT 
        COUNT(*) as total_audits,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT category) as unique_categories
      FROM audit_logs
      WHERE organization_id = $1::uuid
        AND created_at >= $2 AND created_at <= $3
    `;
    auditParams = [orgId, filters.start_date, filters.end_date];
  } else {
    // Manager sees project-scoped audits
    auditQuery = `
      SELECT 
        COUNT(*) as total_audits,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT category) as unique_categories
      FROM audit_logs
      WHERE project_id = ANY($1)
        AND created_at >= $2 AND created_at <= $3
    `;
    auditParams = [projectIds, filters.start_date, filters.end_date];
  }

  const auditSummary = await pool.query(auditQuery, auditParams);

  // Breakdown by category
  const categoryBreakdown = await pool.query(
    `SELECT category, action, COUNT(*) as count
     FROM audit_logs
     WHERE project_id = ANY($1)
       AND created_at >= $2 AND created_at <= $3
     GROUP BY category, action
     ORDER BY count DESC`,
    [projectIds, filters.start_date, filters.end_date],
  );

  // Breakdown by user role
  const roleBreakdown = await pool.query(
    `SELECT acted_by_role, COUNT(*) as count
     FROM audit_logs
     WHERE project_id = ANY($1::uuid[])
       AND created_at >= $2 AND created_at <= $3
     GROUP BY acted_by_role
     ORDER BY count DESC`,
    [projectIds, filters.start_date, filters.end_date],
  );

  // Recent critical audits (financial changes)
  const criticalAudits = await pool.query(
    `SELECT 
      id, entity_type, entity_id, category, action,
      acted_by_role, created_at, change_summary
     FROM audit_logs
     WHERE project_id = ANY($1::uuid[])
       AND category IN ('MATERIAL_BILL', 'WAGES', 'LEDGER_ADJUSTMENT')
       AND created_at >= $2 AND created_at <= $3
     ORDER BY created_at DESC
     LIMIT 20`,
    [projectIds, filters.start_date, filters.end_date],
  );

  return {
    report_type: "audit",
    filters: {
      start_date: filters.start_date,
      end_date: filters.end_date,
      project_ids: projectIds,
    },
    summary: auditSummary.rows[0],
    breakdown: {
      by_category: categoryBreakdown.rows,
      by_role: roleBreakdown.rows,
    },
    recent_critical_audits: criticalAudits.rows,
  };
}

module.exports = {
  getFinancialReport,
  getProjectProgressReport,
  getAttendanceReport,
  getMaterialReport,
  getAuditReport,
};
