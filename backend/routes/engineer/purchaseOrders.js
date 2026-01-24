const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");

/* ---------------- GET PURCHASE ORDERS BY PROJECT ---------------- */
router.get("/", engineerCheck, async (req, res) => {
  try {
    const siteEngineerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: "projectId query parameter is required",
      });
    }

    // Verify site engineer has access to this project
    const accessCheck = await pool.query(
      `SELECT id FROM project_site_engineers 
       WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [siteEngineerId, projectId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    // Get all purchase orders for this project
    const result = await pool.query(
      `SELECT po.*, 
              mr.title AS material_request_title,
              mr.description AS material_request_description,
              p.name AS project_name
       FROM purchase_orders po
       JOIN material_requests mr ON po.material_request_id = mr.id
       JOIN projects p ON po.project_id = p.id
       WHERE po.project_id = $1
       ORDER BY po.created_at DESC`,
      [projectId],
    );

    res.json({ purchase_orders: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET PURCHASE ORDER BY ID ---------------- */
router.get("/:poId", engineerCheck, async (req, res) => {
  try {
    const siteEngineerId = req.user.id;
    const { poId } = req.params;

    // Get purchase order details
    const poResult = await pool.query(
      `SELECT po.*, 
              mr.title AS material_request_title,
              mr.description AS material_request_description,
              mr.items AS material_request_items,
              p.name AS project_name,
              pm.name AS created_by_name
       FROM purchase_orders po
       JOIN material_requests mr ON po.material_request_id = mr.id
       JOIN projects p ON po.project_id = p.id
       LEFT JOIN purchase_managers pm ON po.created_by = pm.id
       WHERE po.id = $1`,
      [poId],
    );

    if (poResult.rows.length === 0) {
      return res.status(404).json({
        error: "Purchase order not found",
      });
    }

    const po = poResult.rows[0];

    // Verify site engineer has access to this project
    const accessCheck = await pool.query(
      `SELECT id FROM project_site_engineers 
       WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [siteEngineerId, po.project_id],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this purchase order's project",
      });
    }

    res.json({ purchase_order: po });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET PURCHASE ORDER PDF ---------------- */
router.get("/:poId/pdf", engineerCheck, async (req, res) => {
  try {
    const siteEngineerId = req.user.id;
    const { poId } = req.params;

    // Get purchase order with PDF
    const poResult = await pool.query(
      `SELECT po.id, po.project_id, po.po_pdf_url 
       FROM purchase_orders po
       WHERE po.id = $1`,
      [poId],
    );

    if (poResult.rows.length === 0) {
      return res.status(404).json({
        error: "Purchase order not found",
      });
    }

    const po = poResult.rows[0];

    // Verify site engineer has access to this project
    const accessCheck = await pool.query(
      `SELECT id FROM project_site_engineers 
       WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [siteEngineerId, po.project_id],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this purchase order's project",
      });
    }

    if (!po.po_pdf_url) {
      return res.status(404).json({
        error: "PDF not available for this purchase order",
      });
    }

    // Return base64 PDF
    res.json({ pdf: po.po_pdf_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET SENT PURCHASE ORDERS (for GRN creation) ---------------- */
router.get("/sent/list", engineerCheck, async (req, res) => {
  try {
    const siteEngineerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: "projectId query parameter is required",
      });
    }

    // Verify site engineer has access to this project
    const accessCheck = await pool.query(
      `SELECT id FROM project_site_engineers 
       WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [siteEngineerId, projectId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    // Get all SENT purchase orders (ready for GRN creation)
    const result = await pool.query(
      `SELECT po.*, 
              mr.title AS material_request_title,
              mr.items AS material_request_items,
              p.name AS project_name,
              COALESCE(
                (SELECT COUNT(*) FROM grns WHERE purchase_order_id = po.id),
                0
              ) AS grn_count
       FROM purchase_orders po
       JOIN material_requests mr ON po.material_request_id = mr.id
       JOIN projects p ON po.project_id = p.id
       WHERE po.project_id = $1 AND po.status = 'SENT'
       ORDER BY po.sent_at DESC`,
      [projectId],
    );

    res.json({ purchase_orders: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
