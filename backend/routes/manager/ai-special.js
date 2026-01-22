const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");
const {
  analyzeDelayCauses,
  analyzeMaterialAnomalies,
  analyzeAuditPatterns,
  calculateProjectHealth,
} = require("../../services/aiInsights.service");

/**
 * Check if manager is ACTIVE in project or creator
 */
async function hasProjectAccess(managerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM project_managers
     WHERE project_id = $1 AND manager_id = $2 AND status = 'ACTIVE'
     UNION ALL
     SELECT COUNT(*) as count FROM projects
     WHERE id = $1 AND created_by = $2`,
    [projectId, managerId],
  );
  const totalCount = result.rows.reduce(
    (sum, row) => sum + parseInt(row.count),
    0,
  );
  return totalCount > 0;
}

/**
 * GET /manager/ai/delays/:projectId/analysis
 * Delay root cause analysis with AI insights
 */
router.get("/delays/:projectId/analysis", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;

    // Authorization
    const hasAccess = await hasProjectAccess(managerId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this project" });
    }

    // Get delayed plan items with DPR references
    const delayedItems = await pool.query(
      `SELECT 
        pi.id, pi.task_name, pi.period_start, pi.period_end, 
        pi.status, pi.completed_at, pi.delay,
        EXTRACT(DAY FROM (COALESCE(pi.completed_at, NOW()) - pi.period_end)) as delay_days,
        p.project_id
       FROM plan_items pi
       JOIN plans p ON pi.plan_id = p.id
       WHERE p.project_id = $1 
         AND (pi.status = 'DELAYED' OR (pi.status != 'COMPLETED' AND pi.period_end < NOW()))
       ORDER BY delay_days DESC
       LIMIT 20`,
      [projectId],
    );

    // Get related DPRs for delayed items
    const dprData = await pool.query(
      `SELECT 
        d.id, d.title, d.description, d.report_date, d.site_engineer_id,
        se.name as engineer_name
       FROM dprs d
       LEFT JOIN site_engineers se ON d.site_engineer_id = se.id
       WHERE d.project_id = $1
         AND d.report_date >= (
           SELECT MIN(period_start) FROM plan_items pi
           JOIN plans p ON pi.plan_id = p.id
           WHERE p.project_id = $1 AND pi.status = 'DELAYED'
         )
       ORDER BY d.report_date DESC
       LIMIT 50`,
      [projectId],
    );

    // Prepare data for AI
    const delayData = {
      project_id: projectId,
      delayed_items: delayedItems.rows.map((item) => ({
        task_name: item.task_name,
        delay_days: Math.round(parseFloat(item.delay_days) || 0),
        period_start: item.period_start,
        period_end: item.period_end,
        delay_info: item.delay,
      })),
      related_dprs: dprData.rows.map((dpr) => ({
        title: dpr.title,
        description: dpr.description,
        report_date: dpr.report_date,
        engineer_id: dpr.site_engineer_id,
        engineer_name: dpr.engineer_name,
      })),
    };

    // AI Analysis
    const aiInsights = await analyzeDelayCauses(delayData);

    res.json({
      ...aiInsights,
      data_summary: {
        total_delayed_items: delayedItems.rows.length,
        total_dprs_analyzed: dprData.rows.length,
      },
    });
  } catch (error) {
    console.error("[Manager AI] Delay analysis error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /manager/ai/materials/:projectId/anomalies
 * Material consumption anomaly detection
 */
router.get(
  "/materials/:projectId/anomalies",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId } = req.params;

      // Authorization
      const hasAccess = await hasProjectAccess(managerId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to this project" });
      }

      // Get material requests
      const requests = await pool.query(
        `SELECT category, SUM(quantity) as total_quantity, COUNT(*) as request_count
       FROM material_requests
       WHERE project_id = $1 AND status = 'APPROVED'
       GROUP BY category`,
        [projectId],
      );

      // Get material bills
      const bills = await pool.query(
        `SELECT category, SUM(total_amount) as total_cost, COUNT(*) as bill_count
       FROM material_bills
       WHERE project_id = $1 AND status = 'APPROVED'
       GROUP BY category`,
        [projectId],
      );

      // Get DPR material extractions (from material_ledger if available)
      const ledger = await pool.query(
        `SELECT material_name, category, SUM(quantity) as total_quantity, 
              COUNT(*) as entry_count
       FROM material_ledger
       WHERE project_id = $1 AND movement_type = 'OUT'
       GROUP BY material_name, category`,
        [projectId],
      );

      // Prepare data for AI
      const materialData = {
        project_id: projectId,
        material_requests: requests.rows,
        material_bills: bills.rows,
        ledger_entries: ledger.rows,
      };

      // AI Analysis
      const aiInsights = await analyzeMaterialAnomalies(materialData);

      res.json({
        ...aiInsights,
        data_summary: {
          total_request_categories: requests.rows.length,
          total_bill_categories: bills.rows.length,
          total_ledger_entries: ledger.rows.length,
        },
      });
    } catch (error) {
      console.error("[Manager AI] Material anomaly error:", error.message);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/**
 * GET /manager/ai/audits/:projectId/insights
 * Audit pattern intelligence
 */
router.get("/audits/:projectId/insights", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;

    // Authorization
    const hasAccess = await hasProjectAccess(managerId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this project" });
    }

    // Get audit logs for the project (last 90 days)
    const audits = await pool.query(
      `SELECT 
        user_type, category, action, entity_type,
        EXTRACT(HOUR FROM created_at) as hour_of_day,
        created_at
       FROM audit_logs
       WHERE project_id = $1
         AND created_at >= NOW() - INTERVAL '90 days'
       ORDER BY created_at DESC
       LIMIT 500`,
      [projectId],
    );

    // Aggregate by user role and action
    const byRole = await pool.query(
      `SELECT user_type, action, COUNT(*) as count
       FROM audit_logs
       WHERE project_id = $1
         AND created_at >= NOW() - INTERVAL '90 days'
       GROUP BY user_type, action
       ORDER BY count DESC`,
      [projectId],
    );

    // Prepare data for AI
    const auditData = {
      project_id: projectId,
      total_audits: audits.rows.length,
      by_role_and_action: byRole.rows,
      recent_audits: audits.rows.slice(0, 100).map((audit) => ({
        user_type: audit.user_type,
        category: audit.category,
        action: audit.action,
        entity_type: audit.entity_type,
        hour_of_day: audit.hour_of_day,
        timestamp: audit.created_at,
      })),
    };

    // AI Analysis
    const aiInsights = await analyzeAuditPatterns(auditData);

    res.json({
      ...aiInsights,
      data_summary: {
        total_audits_analyzed: audits.rows.length,
        time_period: "90 days",
      },
    });
  } catch (error) {
    console.error("[Manager AI] Audit insights error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /manager/ai/projects/:projectId/health
 * Project health score with AI analysis
 */
router.get("/projects/:projectId/health", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;

    // Authorization
    const hasAccess = await hasProjectAccess(managerId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this project" });
    }

    // Get project metrics
    const project = await pool.query(
      `SELECT budget, current_invested, status FROM projects WHERE id = $1`,
      [projectId],
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Get plan item stats
    const planStats = await pool.query(
      `SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'DELAYED' THEN 1 END) as delayed
       FROM plan_items pi
       JOIN plans p ON pi.plan_id = p.id
       WHERE p.project_id = $1`,
      [projectId],
    );

    // Get material anomaly count (simplified)
    const materialStats = await pool.query(
      `SELECT COUNT(DISTINCT category) as category_count
       FROM material_bills
       WHERE project_id = $1 AND status = 'APPROVED'`,
      [projectId],
    );

    // Get audit volatility (last 30 days)
    const auditStats = await pool.query(
      `SELECT COUNT(*) as audit_count
       FROM audit_logs
       WHERE project_id = $1
         AND created_at >= NOW() - INTERVAL '30 days'`,
      [projectId],
    );

    // Prepare data for AI
    const projectData = {
      project_id: projectId,
      budget: parseFloat(project.rows[0].budget) || 0,
      current_invested: parseFloat(project.rows[0].current_invested) || 0,
      budget_utilization:
        project.rows[0].budget > 0
          ? Math.round(
              (project.rows[0].current_invested / project.rows[0].budget) * 100,
            )
          : 0,
      plan_items: {
        total: parseInt(planStats.rows[0].total_items),
        completed: parseInt(planStats.rows[0].completed),
        delayed: parseInt(planStats.rows[0].delayed),
      },
      material_categories: parseInt(materialStats.rows[0].category_count),
      audit_activity_30d: parseInt(auditStats.rows[0].audit_count),
    };

    // AI Analysis
    const aiInsights = await calculateProjectHealth(projectData);

    res.json(aiInsights);
  } catch (error) {
    console.error("[Manager AI] Health score error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
