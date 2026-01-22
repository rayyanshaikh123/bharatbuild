const pool = require("../config/db");

/**
 * Analytics Service
 * Provides data aggregation and analytics for owner and manager dashboards
 */

/**
 * Get organization-wide analytics for owner
 * @param {number} ownerId - Owner's user ID
 * @returns {Object} Organization overview analytics
 */
async function getOwnerOverview(ownerId) {
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

    // Total projects and budget
    const projectStats = await client.query(
      `
      SELECT 
        COUNT(*) as total_projects,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(current_invested), 0) as total_current_invested
      FROM projects
      WHERE org_id = $1
    `,
      [orgId],
    );

    // Projects by status
    const statusBreakdown = await client.query(
      `
      SELECT status, COUNT(*) as count
      FROM projects
      WHERE org_id = $1
      GROUP BY status
    `,
      [orgId],
    );

    // Material costs (approved bills only)
    const materialCosts = await client.query(
      `
      SELECT COALESCE(SUM(total_amount), 0) as total_material_cost
      FROM material_bills mb
      JOIN projects p ON mb.project_id = p.id
      WHERE p.org_id = $1 AND mb.status = 'APPROVED'
    `,
      [orgId],
    );

    // Wages paid (approved wages only)
    const wagesPaid = await client.query(
      `
      SELECT COALESCE(SUM(total_amount), 0) as total_wages_paid
      FROM wages w
      JOIN projects p ON w.project_id = p.id
      WHERE p.org_id = $1 AND w.status = 'APPROVED'
    `,
      [orgId],
    );

    // Pending approvals
    const pendingMaterialRequests = await client.query(
      `
      SELECT COUNT(*) as count
      FROM material_requests mr
      JOIN projects p ON mr.project_id = p.id
      WHERE p.org_id = $1 AND mr.status = 'PENDING'
    `,
      [orgId],
    );

    const pendingMaterialBills = await client.query(
      `
      SELECT COUNT(*) as count
      FROM material_bills mb
      JOIN projects p ON mb.project_id = p.id
      WHERE p.org_id = $1 AND mb.status = 'PENDING'
    `,
      [orgId],
    );

    const pendingWages = await client.query(
      `
      SELECT COUNT(*) as count
      FROM wages w
      JOIN projects p ON w.project_id = p.id
      WHERE p.org_id = $1 AND w.status = 'PENDING'
    `,
      [orgId],
    );

    // Top 5 costliest projects
    const topProjects = await client.query(
      `
      SELECT 
        id,
        name,
        budget,
        current_invested,
        status
      FROM projects
      WHERE org_id = $1
      ORDER BY current_invested DESC
      LIMIT 5
    `,
      [orgId],
    );

    // Delayed projects count
    const delayedProjects = await client.query(
      `
      SELECT COUNT(DISTINCT p.id) as count
      FROM projects p
      JOIN plan_items pi ON pi.project_id = p.id
      WHERE p.org_id = $1 AND pi.status = 'DELAYED'
    `,
      [orgId],
    );

    // Format response
    const stats = projectStats.rows[0];
    const totalBudget = parseFloat(stats.total_budget);
    const totalInvested = parseFloat(stats.total_current_invested);

    return {
      total_projects: parseInt(stats.total_projects),
      projects_by_status: statusBreakdown.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      total_budget: totalBudget,
      total_current_invested: totalInvested,
      budget_utilization_percentage:
        totalBudget > 0
          ? parseFloat(((totalInvested / totalBudget) * 100).toFixed(2))
          : 0,
      total_material_cost: parseFloat(
        materialCosts.rows[0].total_material_cost,
      ),
      total_wages_paid: parseFloat(wagesPaid.rows[0].total_wages_paid),
      total_pending_approvals: {
        material_requests: parseInt(pendingMaterialRequests.rows[0].count),
        material_bills: parseInt(pendingMaterialBills.rows[0].count),
        wages: parseInt(pendingWages.rows[0].count),
      },
      top_5_costliest_projects: topProjects.rows.map((p) => ({
        id: p.id,
        name: p.name,
        budget: parseFloat(p.budget),
        current_invested: parseFloat(p.current_invested),
        status: p.status,
      })),
      delayed_projects_count: parseInt(delayedProjects.rows[0].count),
    };
  } finally {
    client.release();
  }
}

/**
 * Get detailed project analytics for owner
 * @param {number} ownerId - Owner's user ID
 * @param {number} projectId - Project ID
 * @returns {Object} Project analytics
 */
async function getOwnerProjectAnalytics(ownerId, projectId) {
  const client = await pool.connect();
  try {
    // Verify ownership
    const authCheck = await client.query(
      `
      SELECT p.* FROM projects p
      JOIN organizations o ON p.org_id = o.id
      WHERE p.id = $1 AND o.owner_id = $2
    `,
      [projectId, ownerId],
    );

    if (authCheck.rows.length === 0) {
      throw new Error("Project not found or unauthorized");
    }

    const project = authCheck.rows[0];

    // Material cost breakdown by category
    const materialBreakdown = await client.query(
      `
      SELECT 
        category,
        COALESCE(SUM(total_amount), 0) as total
      FROM material_bills
      WHERE project_id = $1 AND status = 'APPROVED'
      GROUP BY category
    `,
      [projectId],
    );

    // Wages cost breakdown by skill
    const wagesBreakdown = await client.query(
      `
      SELECT 
        l.skill,
        COALESCE(SUM(w.total_amount), 0) as total
      FROM wages w
      JOIN labours l ON w.labour_id = l.id
      WHERE w.project_id = $1 AND w.status = 'APPROVED'
      GROUP BY l.skill
    `,
      [projectId],
    );

    // Total wages
    const totalWages = await client.query(
      `
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM wages
      WHERE project_id = $1 AND status = 'APPROVED'
    `,
      [projectId],
    );

    // Attendance summary
    const attendanceSummary = await client.query(
      `
      SELECT 
        COALESCE(SUM(EXTRACT(EPOCH FROM (checkout_time - checkin_time))/3600), 0) as total_hours,
        COUNT(DISTINCT labour_id) as unique_labours
      FROM attendance
      WHERE project_id = $1 AND checkout_time IS NOT NULL
    `,
      [projectId],
    );

    // Plan progress
    const planProgress = await client.query(
      `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'DELAYED' THEN 1 END) as delayed
      FROM plan_items
      WHERE project_id = $1
    `,
      [projectId],
    );

    // Delay summary
    const delaySummary = await client.query(
      `
      SELECT 
        COUNT(*) as total_delayed_items,
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (completed_at - period_end))/(24*3600)
        ), 0) as total_delay_days
      FROM plan_items
      WHERE project_id = $1 AND status = 'DELAYED' AND completed_at IS NOT NULL
    `,
      [projectId],
    );

    // Audit activity count
    const auditCount = await client.query(
      `
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE project_id = $1
    `,
      [projectId],
    );

    // Format response
    const budget = parseFloat(project.budget);
    const invested = parseFloat(project.current_invested);
    const attendance = attendanceSummary.rows[0];
    const totalHours = parseFloat(attendance.total_hours);
    const uniqueLabours = parseInt(attendance.unique_labours);
    const plan = planProgress.rows[0];
    const totalItems = parseInt(plan.total_items);
    const completed = parseInt(plan.completed);
    const delay = delaySummary.rows[0];
    const delayedItems = parseInt(delay.total_delayed_items);
    const delayDays = parseFloat(delay.total_delay_days);

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        budget: budget,
        current_invested: invested,
      },
      budget_vs_invested: {
        budget: budget,
        invested: invested,
        remaining: budget - invested,
        utilization_percentage:
          budget > 0 ? parseFloat(((invested / budget) * 100).toFixed(2)) : 0,
      },
      material_cost_breakdown: materialBreakdown.rows.reduce((acc, row) => {
        acc[row.category] = parseFloat(row.total);
        return acc;
      }, {}),
      wages_cost_breakdown: {
        total: parseFloat(totalWages.rows[0].total),
        by_skill: wagesBreakdown.rows.reduce((acc, row) => {
          acc[row.skill] = parseFloat(row.total);
          return acc;
        }, {}),
      },
      attendance_summary: {
        total_hours: parseFloat(totalHours.toFixed(2)),
        unique_labours: uniqueLabours,
        avg_hours_per_labour:
          uniqueLabours > 0
            ? parseFloat((totalHours / uniqueLabours).toFixed(2))
            : 0,
      },
      plan_progress: {
        total_items: totalItems,
        completed: completed,
        pending: parseInt(plan.pending),
        delayed: parseInt(plan.delayed),
        completion_percentage:
          totalItems > 0
            ? parseFloat(((completed / totalItems) * 100).toFixed(2))
            : 0,
      },
      delay_summary: {
        total_delayed_items: delayedItems,
        total_delay_days: parseFloat(delayDays.toFixed(2)),
        avg_delay_per_item:
          delayedItems > 0
            ? parseFloat((delayDays / delayedItems).toFixed(2))
            : 0,
      },
      audit_activity_count: parseInt(auditCount.rows[0].count),
    };
  } finally {
    client.release();
  }
}

/**
 * Get manager's overview analytics
 * @param {number} managerId - Manager's user ID
 * @returns {Object} Manager overview analytics
 */
async function getManagerOverview(managerId) {
  const client = await pool.connect();
  try {
    // Get assigned projects (ACTIVE status only)
    const assignedProjects = await client.query(
      `
      SELECT p.*
      FROM projects p
      JOIN project_managers pm ON p.id = pm.project_id
      WHERE pm.manager_id = $1 AND pm.status = 'ACTIVE'
    `,
      [managerId],
    );

    const projectIds = assignedProjects.rows.map((p) => p.id);

    if (projectIds.length === 0) {
      return {
        assigned_projects_count: 0,
        projects_by_status: {},
        delayed_projects: 0,
        total_material_requests: { pending: 0, approved: 0 },
        total_bills: { pending: 0, approved: 0 },
        total_attendance_hours: 0,
        total_wages_pending: 0,
      };
    }

    // Projects by status
    const statusBreakdown = await client.query(
      `
      SELECT status, COUNT(*) as count
      FROM projects
      WHERE id = ANY($1)
      GROUP BY status
    `,
      [projectIds],
    );

    // Delayed projects
    const delayedProjects = await client.query(
      `
      SELECT COUNT(DISTINCT project_id) as count
      FROM plan_items
      WHERE project_id = ANY($1) AND status = 'DELAYED'
    `,
      [projectIds],
    );

    // Material requests
    const materialRequests = await client.query(
      `
      SELECT 
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved
      FROM material_requests
      WHERE project_id = ANY($1)
    `,
      [projectIds],
    );

    // Material bills
    const materialBills = await client.query(
      `
      SELECT 
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved
      FROM material_bills
      WHERE project_id = ANY($1)
    `,
      [projectIds],
    );

    // Attendance hours
    const attendanceHours = await client.query(
      `
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (checkout_time - checkin_time))/3600), 0) as total_hours
      FROM attendance
      WHERE project_id = ANY($1) AND checkout_time IS NOT NULL
    `,
      [projectIds],
    );

    // Pending wages
    const pendingWages = await client.query(
      `
      SELECT COUNT(*) as count
      FROM wages
      WHERE project_id = ANY($1) AND status = 'PENDING'
    `,
      [projectIds],
    );

    return {
      assigned_projects_count: assignedProjects.rows.length,
      projects_by_status: statusBreakdown.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      delayed_projects: parseInt(delayedProjects.rows[0].count),
      total_material_requests: {
        pending: parseInt(materialRequests.rows[0].pending),
        approved: parseInt(materialRequests.rows[0].approved),
      },
      total_bills: {
        pending: parseInt(materialBills.rows[0].pending),
        approved: parseInt(materialBills.rows[0].approved),
      },
      total_attendance_hours: parseFloat(
        attendanceHours.rows[0].total_hours.toFixed(2),
      ),
      total_wages_pending: parseInt(pendingWages.rows[0].count),
    };
  } finally {
    client.release();
  }
}

/**
 * Get detailed project analytics for manager
 * @param {number} managerId - Manager's user ID
 * @param {number} projectId - Project ID
 * @returns {Object} Project analytics
 */
async function getManagerProjectAnalytics(managerId, projectId) {
  const client = await pool.connect();
  try {
    // Verify manager is ACTIVE on project
    const authCheck = await client.query(
      `
      SELECT p.* FROM projects p
      JOIN project_managers pm ON p.id = pm.project_id
      WHERE p.id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'
    `,
      [projectId, managerId],
    );

    if (authCheck.rows.length === 0) {
      throw new Error("Project not found or unauthorized");
    }

    // Reuse owner project analytics logic (same data, different auth)
    // We'll call the same queries but skip org-wide context
    const project = authCheck.rows[0];

    // Material cost breakdown
    const materialBreakdown = await client.query(
      `
      SELECT 
        category,
        COALESCE(SUM(total_amount), 0) as total
      FROM material_bills
      WHERE project_id = $1 AND status = 'APPROVED'
      GROUP BY category
    `,
      [projectId],
    );

    // Wages breakdown
    const wagesBreakdown = await client.query(
      `
      SELECT 
        l.skill,
        COALESCE(SUM(w.total_amount), 0) as total
      FROM wages w
      JOIN labours l ON w.labour_id = l.id
      WHERE w.project_id = $1 AND w.status = 'APPROVED'
      GROUP BY l.skill
    `,
      [projectId],
    );

    const totalWages = await client.query(
      `
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM wages
      WHERE project_id = $1 AND status = 'APPROVED'
    `,
      [projectId],
    );

    // Attendance summary
    const attendanceSummary = await client.query(
      `
      SELECT 
        COALESCE(SUM(EXTRACT(EPOCH FROM (checkout_time - checkin_time))/3600), 0) as total_hours,
        COUNT(DISTINCT labour_id) as unique_labours
      FROM attendance
      WHERE project_id = $1 AND checkout_time IS NOT NULL
    `,
      [projectId],
    );

    // Plan progress
    const planProgress = await client.query(
      `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'DELAYED' THEN 1 END) as delayed
      FROM plan_items
      WHERE project_id = $1
    `,
      [projectId],
    );

    // Delay summary
    const delaySummary = await client.query(
      `
      SELECT 
        COUNT(*) as total_delayed_items,
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (completed_at - period_end))/(24*3600)
        ), 0) as total_delay_days
      FROM plan_items
      WHERE project_id = $1 AND status = 'DELAYED' AND completed_at IS NOT NULL
    `,
      [projectId],
    );

    // Audit count
    const auditCount = await client.query(
      `
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE project_id = $1
    `,
      [projectId],
    );

    // Format response (same as owner)
    const budget = parseFloat(project.budget);
    const invested = parseFloat(project.current_invested);
    const attendance = attendanceSummary.rows[0];
    const totalHours = parseFloat(attendance.total_hours);
    const uniqueLabours = parseInt(attendance.unique_labours);
    const plan = planProgress.rows[0];
    const totalItems = parseInt(plan.total_items);
    const completed = parseInt(plan.completed);
    const delay = delaySummary.rows[0];
    const delayedItems = parseInt(delay.total_delayed_items);
    const delayDays = parseFloat(delay.total_delay_days);

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        budget: budget,
        current_invested: invested,
      },
      budget_vs_invested: {
        budget: budget,
        invested: invested,
        remaining: budget - invested,
        utilization_percentage:
          budget > 0 ? parseFloat(((invested / budget) * 100).toFixed(2)) : 0,
      },
      material_cost_breakdown: materialBreakdown.rows.reduce((acc, row) => {
        acc[row.category] = parseFloat(row.total);
        return acc;
      }, {}),
      wages_cost_breakdown: {
        total: parseFloat(totalWages.rows[0].total),
        by_skill: wagesBreakdown.rows.reduce((acc, row) => {
          acc[row.skill] = parseFloat(row.total);
          return acc;
        }, {}),
      },
      attendance_summary: {
        total_hours: parseFloat(totalHours.toFixed(2)),
        unique_labours: uniqueLabours,
        avg_hours_per_labour:
          uniqueLabours > 0
            ? parseFloat((totalHours / uniqueLabours).toFixed(2))
            : 0,
      },
      plan_progress: {
        total_items: totalItems,
        completed: completed,
        pending: parseInt(plan.pending),
        delayed: parseInt(plan.delayed),
        completion_percentage:
          totalItems > 0
            ? parseFloat(((completed / totalItems) * 100).toFixed(2))
            : 0,
      },
      delay_summary: {
        total_delayed_items: delayedItems,
        total_delay_days: parseFloat(delayDays.toFixed(2)),
        avg_delay_per_item:
          delayedItems > 0
            ? parseFloat((delayDays / delayedItems).toFixed(2))
            : 0,
      },
      audit_activity_count: parseInt(auditCount.rows[0].count),
    };
  } finally {
    client.release();
  }
}

module.exports = {
  getOwnerOverview,
  getOwnerProjectAnalytics,
  getManagerOverview,
  getManagerProjectAnalytics,
};
