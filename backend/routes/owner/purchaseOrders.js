const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

/* ---------------- GET PURCHASE ORDERS BY PROJECT ---------------- */
router.get("/", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: "projectId query parameter is required",
      });
    }

    // Verify owner has access to this project
    const accessCheck = await pool.query(
      `SELECT p.id 
       FROM projects p
       JOIN organizations o ON p.org_id = o.id
       WHERE p.id = $1 AND o.owner_id = $2`,
      [projectId, ownerId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    // Get all purchase orders for this project (exclude BYTEA columns)
    const result = await pool.query(
      `SELECT po.id, po.project_id, po.material_request_id, po.po_number, 
              po.vendor_name, po.items, po.total_amount, po.status, 
              po.created_by, po.created_at, po.sent_at, po.po_pdf_mime,
              mr.title AS material_request_title,
              mr.description AS material_request_description,
              p.name AS project_name,
              pm.name AS created_by_name
       FROM purchase_orders po
       JOIN material_requests mr ON po.material_request_id = mr.id
       JOIN projects p ON po.project_id = p.id
       LEFT JOIN purchase_managers pm ON po.created_by = pm.id
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
router.get("/:poId", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { poId } = req.params;

    // Get purchase order details (exclude BYTEA columns)
    const poResult = await pool.query(
      `SELECT po.id, po.project_id, po.material_request_id, po.po_number, 
              po.vendor_name, po.items, po.total_amount, po.status, 
              po.created_by, po.created_at, po.sent_at, po.po_pdf_mime,
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

    // Verify owner has access to this project
    const accessCheck = await pool.query(
      `SELECT p.id 
       FROM projects p
       JOIN organizations o ON p.org_id = o.id
       WHERE p.id = $1 AND o.owner_id = $2`,
      [po.project_id, ownerId],
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
router.get("/:poId/pdf", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { poId } = req.params;

    // Get purchase order with PDF
    const poResult = await pool.query(
      `SELECT po.id, po.project_id, po.po_pdf, po.po_pdf_mime, po.po_number
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

    // Verify owner has access to this project
    const accessCheck = await pool.query(
      `SELECT p.id 
       FROM projects p
       JOIN organizations o ON p.org_id = o.id
       WHERE p.id = $1 AND o.owner_id = $2`,
      [po.project_id, ownerId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this purchase order's project",
      });
    }

    if (!po.po_pdf) {
      return res.status(404).json({
        error: "PDF not available for this purchase order",
      });
    }

    // Stream PDF with correct headers
    res.setHeader("Content-Type", po.po_pdf_mime || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="PO_${po.po_number}.pdf"`,
    );
    res.send(po.po_pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
