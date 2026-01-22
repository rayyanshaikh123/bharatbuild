const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");
const {
  analyzeOrganizationRisks,
  analyzeEngineerPerformance,
  detectFinancialDrift,
} = require("../../services/aiInsights.service");

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
 * GET /owner/ai/organization/risks
 * Organization-wide risk analysis
 */
router.get("/organization/risks", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Get organization
    const orgId = await getOrgIdByOwnerId(ownerId);
    if (!orgId) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Get all projects with metrics
    const projects = await pool.query(
      `SELECT 
        p.id, p.name, p.budget, p.current_invested, p.status,
        COALESCE(pi_stats.total_items, 0) as total_plan_items,
        COALESCE(pi_stats.completed, 0) as completed_items,
        COALESCE(pi_stats.delayed, 0) as delayed_items
       FROM projects p
       LEFT JOIN (
         SELECT 
           pl.project_id,
           COUNT(*) as total_items,
           COUNT(CASE WHEN pi.status = 'COMPLETED' THEN 1 END) as completed,
           COUNT(CASE WHEN pi.status = 'DELAYED' THEN 1 END) as delayed
         FROM plan_items pi
         JOIN plans pl ON pi.plan_id = pl.id
         GROUP BY pl.project_id
       ) pi_stats ON p.id = pi_stats.project_id
       WHERE p.org_id = $1
       ORDER BY p.created_at DESC`,
      [orgId],
    );

    // Get financial summary
    const financialSummary = await pool.query(
      `SELECT 
        SUM(budget) as total_budget,
        SUM(current_invested) as total_invested
       FROM projects
       WHERE org_id = $1`,
      [orgId],
    );

    // Get delay patterns across projects
    const delayPatterns = await pool.query(
      `SELECT 
        p.id as project_id, p.name as project_name,
        COUNT(pi.id) as delay_count,
        AVG(EXTRACT(DAY FROM (COALESCE(pi.completed_at, NOW()) - pi.period_end))) as avg_delay_days
       FROM projects p
       JOIN plans pl ON p.id = pl.project_id
       JOIN plan_items pi ON pl.id = pi.plan_id
       WHERE p.org_id = $1 AND pi.status = 'DELAYED'
       GROUP BY p.id, p.name
       HAVING COUNT(pi.id) > 0
       ORDER BY delay_count DESC`,
      [orgId],
    );

    // Prepare data for AI
    const orgData = {
      organization_id: orgId,
      total_projects: projects.rows.length,
      financial_summary: {
        total_budget: parseFloat(financialSummary.rows[0].total_budget) || 0,
        total_invested:
          parseFloat(financialSummary.rows[0].total_invested) || 0,
      },
      projects: projects.rows.map((p) => ({
        project_id: p.id,
        project_name: p.name,
        budget: parseFloat(p.budget) || 0,
        current_invested: parseFloat(p.current_invested) || 0,
        budget_utilization:
          p.budget > 0 ? Math.round((p.current_invested / p.budget) * 100) : 0,
        status: p.status,
        plan_items: {
          total: parseInt(p.total_plan_items),
          completed: parseInt(p.completed_items),
          delayed: parseInt(p.delayed_items),
        },
      })),
      delay_patterns: delayPatterns.rows,
    };

    // AI Analysis
    const aiInsights = await analyzeOrganizationRisks(orgData);

    res.json({
      ...aiInsights,
      data_summary: {
        total_projects: projects.rows.length,
        projects_analyzed: projects.rows.length,
      },
    });
  } catch (error) {
    console.error("[Owner AI] Organization risks error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /owner/ai/engineers/performance
 * Engineer performance intelligence (advisory only)
 */
router.get("/engineers/performance", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Get organization
    const orgId = await getOrgIdByOwnerId(ownerId);
    if (!orgId) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Get site engineers in organization
    const engineers = await pool.query(
      `SELECT DISTINCT se.id, se.name
       FROM site_engineers se
       JOIN organization_site_engineers ose ON se.id = ose.site_engineer_id
       WHERE ose.org_id = $1 AND ose.status = 'APPROVED'`,
      [orgId],
    );

    // Get engineer metrics
    const engineerMetrics = [];

    for (const engineer of engineers.rows) {
      // Delay frequency
      const delays = await pool.query(
        `SELECT COUNT(*) as delay_count
         FROM dprs d
         JOIN projects p ON d.project_id = p.id
         WHERE d.site_engineer_id = $1 
           AND p.org_id = $2
           AND d.id IN (
             SELECT unnest(
               CASE 
                 WHEN delay->'referenced_dprs' IS NOT NULL 
                 THEN ARRAY(SELECT jsonb_array_elements_text(delay->'referenced_dprs'))::int[]
                 ELSE ARRAY[]::int[]
               END
             )
             FROM plan_items pi
             JOIN plans pl ON pi.plan_id = pl.id
             WHERE pl.project_id = p.id AND pi.status = 'DELAYED'
           )`,
        [engineer.id, orgId],
      );

      // DPR count
      const dprCount = await pool.query(
        `SELECT COUNT(*) as total_dprs
         FROM dprs d
         JOIN projects p ON d.project_id = p.id
         WHERE d.site_engineer_id = $1 AND p.org_id = $2
           AND d.submitted_at >= NOW() - INTERVAL '90 days'`,
        [engineer.id, orgId],
      );

      // Material requests
      const materialRequests = await pool.query(
        `SELECT COUNT(*) as request_count
         FROM material_requests mr
         JOIN projects p ON mr.project_id = p.id
         WHERE mr.site_engineer_id = $1 AND p.org_id = $2
           AND mr.created_at >= NOW() - INTERVAL '90 days'`,
        [engineer.id, orgId],
      );

      // Audit activity
      const auditActivity = await pool.query(
        `SELECT COUNT(*) as audit_count
         FROM audit_logs al
         JOIN projects p ON al.project_id = p.id
         WHERE al.user_id = $1 AND al.user_type = 'SITE_ENGINEER'
           AND p.org_id = $2
           AND al.created_at >= NOW() - INTERVAL '90 days'`,
        [engineer.id, orgId],
      );

      engineerMetrics.push({
        engineer_id: engineer.id,
        engineer_name: engineer.name,
        delay_related_dprs: parseInt(delays.rows[0].delay_count),
        total_dprs_90d: parseInt(dprCount.rows[0].total_dprs),
        material_requests_90d: parseInt(materialRequests.rows[0].request_count),
        audit_activity_90d: parseInt(auditActivity.rows[0].audit_count),
      });
    }

    // Prepare data for AI
    const engineerData = {
      organization_id: orgId,
      total_engineers: engineers.rows.length,
      engineer_metrics: engineerMetrics,
      time_period: "90 days",
    };

    // AI Analysis
    const aiInsights = await analyzeEngineerPerformance(engineerData);

    res.json({
      ...aiInsights,
      data_summary: {
        total_engineers: engineers.rows.length,
        time_period: "90 days",
      },
    });
  } catch (error) {
    console.error("[Owner AI] Engineer performance error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /owner/ai/finance/drift
 * Financial drift detection
 */
router.get("/finance/drift", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Get organization
    const orgId = await getOrgIdByOwnerId(ownerId);
    if (!orgId) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Get project financial data
    const projects = await pool.query(
      `SELECT 
        p.id, p.name, p.budget, p.current_invested, p.start_date, p.end_date,
        COALESCE(mat_cost.total, 0) as material_cost,
        COALESCE(wage_cost.total, 0) as wage_cost,
        COALESCE(ledger_adj.adjustment_count, 0) as ledger_adjustments
       FROM projects p
       LEFT JOIN (
         SELECT project_id, SUM(total_amount) as total
         FROM material_bills
         WHERE status = 'APPROVED'
         GROUP BY project_id
       ) mat_cost ON p.id = mat_cost.project_id
       LEFT JOIN (
         SELECT project_id, SUM(total_amount) as total
         FROM wages
         WHERE status = 'APPROVED'
         GROUP BY project_id
       ) wage_cost ON p.id = wage_cost.project_id
       LEFT JOIN (
         SELECT project_id, COUNT(*) as adjustment_count
         FROM ledger_adjustments
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY project_id
       ) ledger_adj ON p.id = ledger_adj.project_id
       WHERE p.org_id = $1 AND p.status IN ('ACTIVE', 'PLANNED')
       ORDER BY p.current_invested DESC`,
      [orgId],
    );

    // Calculate expected utilization based on timeline
    const projectsWithDrift = projects.rows.map((p) => {
      const budget = parseFloat(p.budget) || 0;
      const invested = parseFloat(p.current_invested) || 0;
      const materialCost = parseFloat(p.material_cost) || 0;
      const wageCost = parseFloat(p.wage_cost) || 0;

      // Calculate timeline progress
      const startDate = new Date(p.start_date);
      const endDate = new Date(p.end_date);
      const now = new Date();
      const totalDuration = endDate - startDate;
      const elapsed = now - startDate;
      const timelineProgress =
        totalDuration > 0
          ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
          : 0;

      // Expected utilization based on timeline
      const expectedUtilization = Math.round(timelineProgress);
      const actualUtilization =
        budget > 0 ? Math.round((invested / budget) * 100) : 0;
      const drift = actualUtilization - expectedUtilization;

      return {
        project_id: p.id,
        project_name: p.name,
        budget,
        current_invested: invested,
        budget_utilization: actualUtilization,
        expected_utilization: expectedUtilization,
        drift_percentage: drift,
        material_cost: materialCost,
        wage_cost: wageCost,
        wage_to_material_ratio:
          materialCost > 0 ? (wageCost / materialCost).toFixed(2) : 0,
        ledger_adjustments_30d: parseInt(p.ledger_adjustments),
      };
    });

    // Prepare data for AI
    const financeData = {
      organization_id: orgId,
      total_projects: projects.rows.length,
      projects: projectsWithDrift,
    };

    // AI Analysis
    const aiInsights = await detectFinancialDrift(financeData);

    res.json({
      ...aiInsights,
      data_summary: {
        total_projects_analyzed: projects.rows.length,
      },
    });
  } catch (error) {
    console.error("[Owner AI] Financial drift error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
