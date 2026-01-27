const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

/* ---------------- GET ALL PROJECTS INVESTMENT SUMMARY ---------------- */
router.get("/projects/investment-summary", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Get all projects for this owner with investment details
    const result = await pool.query(
      `SELECT 
        p.id,
        p.name as project_name,
        p.location_text,
        p.budget,
        COALESCE(p.current_invested, 0) as current_invested,
        CASE 
          WHEN p.budget > 0 THEN ROUND((COALESCE(p.current_invested, 0) / p.budget * 100)::numeric, 2)
          ELSE 0
        END as budget_used_percentage,
        p.status,
        p.start_date,
        p.end_date,
        p.created_at,
        m.name as manager_name,
        m.email as manager_email
       FROM projects p
       JOIN organizations org ON p.org_id = org.id
       LEFT JOIN managers m ON p.created_by = m.id
       WHERE org.owner_id = $1
       ORDER BY p.created_at DESC`,
      [ownerId],
    );

    // Calculate totals
    const totals = result.rows.reduce(
      (acc, project) => {
        acc.total_budget += parseFloat(project.budget || 0);
        acc.total_invested += parseFloat(project.current_invested || 0);
        return acc;
      },
      { total_budget: 0, total_invested: 0 },
    );

    res.json({
      projects: result.rows,
      summary: {
        total_budget: totals.total_budget,
        total_invested: totals.total_invested,
        overall_percentage:
          totals.total_budget > 0
            ? ((totals.total_invested / totals.total_budget) * 100).toFixed(2)
            : 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- VIEW PROJECT MATERIAL STOCK (READ-ONLY) ---------------- */
router.get(
  "/projects/:projectId/material-stock",
  ownerCheck,
  async (req, res) => {
    try {
      const ownerId = req.user.id;
      const { projectId } = req.params;

      // Verify owner owns this project's organization
      const ownershipCheck = await pool.query(
        `SELECT p.id FROM projects p
       JOIN organizations org ON p.org_id = org.id
       WHERE p.id = $1 AND org.owner_id = $2`,
        [projectId, ownerId],
      );

      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({
          error: "Access denied. You do not own this project.",
        });
      }

      const result = await pool.query(
        `SELECT 
        id,
        project_id,
        material_name,
        category,
        unit,
        available_quantity,
        last_updated_at
       FROM project_material_stock
       WHERE project_id = $1
       ORDER BY material_name, unit`,
        [projectId],
      );

      res.json({ stock: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- VIEW PROJECT GRNs (READ-ONLY) ---------------- */
router.get("/projects/:projectId/grns", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { projectId } = req.params;

    // Verify owner owns this project's organization
    const ownershipCheck = await pool.query(
      `SELECT p.id FROM projects p
       JOIN organizations org ON p.org_id = org.id
       WHERE p.id = $1 AND org.owner_id = $2`,
      [projectId, ownerId],
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({
        error: "Access denied. You do not own this project.",
      });
    }

    const result = await pool.query(
      `SELECT 
        g.id,
        g.project_id,
        g.purchase_order_id,
        g.material_request_id,
        g.received_items,
        g.received_at,
        g.received_by,
        g.status,
        g.manager_feedback,
        g.reviewed_by,
        g.reviewed_at,
        g.created_at,
        po.po_number,
        po.vendor_name,
        po.total_amount as po_amount,
        se.name as received_by_name,
        se.email as received_by_email,
        m.name as reviewed_by_name
       FROM goods_receipt_notes g
       JOIN purchase_orders po ON g.purchase_order_id = po.id
       JOIN site_engineers se ON g.received_by = se.id
       LEFT JOIN managers m ON g.reviewed_by = m.id
       WHERE g.project_id = $1
       ORDER BY g.created_at DESC`,
      [projectId],
    );

    res.json({ grns: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- VIEW GRN APPROVAL AUDIT ---------------- */
router.get("/grns/audit", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Get all GRN approvals for owner's projects
    const result = await pool.query(
      `SELECT 
        al.id as audit_id,
        al.entity_id as grn_id,
        al.action,
        al.acted_by_role,
        al.created_at as action_timestamp,
        al.change_summary,
        p.id as project_id,
        p.name as project_name,
        m.name as manager_name,
        m.email as manager_email,
        g.status as grn_status,
        po.po_number,
        po.vendor_name
       FROM audit_logs al
       JOIN projects p ON al.project_id = p.id
       JOIN organizations org ON p.org_id = org.id
       LEFT JOIN managers m ON al.acted_by_id = m.id
       LEFT JOIN goods_receipt_notes g ON al.entity_id = g.id
       LEFT JOIN purchase_orders po ON g.purchase_order_id = po.id
       WHERE org.owner_id = $1
         AND al.entity_type = 'GOODS_RECEIPT_NOTE'
         AND al.action IN ('GRN_APPROVED', 'GRN_REJECTED')
       ORDER BY al.created_at DESC
       LIMIT 100`,
      [ownerId],
    );

    res.json({ audit_records: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- VIEW MATERIAL CONSUMPTION BY PROJECT ---------------- */
router.get(
  "/projects/:projectId/material-consumption",
  ownerCheck,
  async (req, res) => {
    try {
      const ownerId = req.user.id;
      const { projectId } = req.params;

      // Verify owner owns this project's organization
      const ownershipCheck = await pool.query(
        `SELECT p.id FROM projects p
       JOIN organizations org ON p.org_id = org.id
       WHERE p.id = $1 AND org.owner_id = $2`,
        [projectId, ownerId],
      );

      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({
          error: "Access denied. You do not own this project.",
        });
      }

      const result = await pool.query(
        `SELECT 
        mcr.id,
        mcr.material_name,
        mcr.unit,
        mcr.quantity_used,
        mcr.recorded_at,
        d.report_date,
        d.title as dpr_title,
        se.name as engineer_name
       FROM material_consumption_records mcr
       LEFT JOIN dprs d ON mcr.dpr_id = d.id
       LEFT JOIN site_engineers se ON d.site_engineer_id = se.id
       WHERE mcr.project_id = $1
       ORDER BY mcr.recorded_at DESC`,
        [projectId],
      );

      res.json({ consumption: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
