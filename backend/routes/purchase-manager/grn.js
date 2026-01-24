const express = require("express");
const pool = require("../../db");
const router = express.Router();
const purchaseManagerCheck = require("../../middleware/purchaseManagerCheck");

/* ---------------- GET GRNs BY PROJECT ---------------- */
router.get("/grns", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: "projectId query parameter is required",
      });
    }

    // Verify purchase manager has access to this project
    const accessCheck = await pool.query(
      `SELECT id FROM project_purchase_managers 
       WHERE purchase_manager_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [purchaseManagerId, projectId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    // Get GRNs linked to POs created by this purchase manager for this project (exclude BYTEA columns)
    const result = await pool.query(
      `SELECT g.id, g.project_id, g.purchase_order_id, g.material_request_id, 
              g.site_engineer_id, g.status, g.received_items, g.remarks, 
              g.verified_by, g.created_at, g.received_at, g.verified_at,
              g.bill_image_mime, g.proof_image_mime,
              p.name AS project_name,
              po.po_number,
              po.vendor_name,
              mr.title AS material_request_title,
              se.name AS engineer_name,
              m.name AS verified_by_name
       FROM grns g
       JOIN projects p ON g.project_id = p.id
       JOIN purchase_orders po ON g.purchase_order_id = po.id
       JOIN material_requests mr ON g.material_request_id = mr.id
       JOIN site_engineers se ON g.site_engineer_id = se.id
       LEFT JOIN managers m ON g.verified_by = m.id
       WHERE g.project_id = $1 AND po.created_by = $2
       ORDER BY g.created_at DESC`,
      [projectId, purchaseManagerId],
    );

    res.json({ grns: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET GRN BILL IMAGE ---------------- */
router.get(
  "/grns/:grnId/bill-image",
  purchaseManagerCheck,
  async (req, res) => {
    try {
      const purchaseManagerId = req.user.id;
      const { grnId } = req.params;

      // Get GRN with bill image and verify PO ownership
      const result = await pool.query(
        `SELECT g.id, g.project_id, g.purchase_order_id, g.bill_image, g.bill_image_mime
       FROM grns g
       JOIN purchase_orders po ON g.purchase_order_id = po.id
       WHERE g.id = $1 AND po.created_by = $2`,
        [grnId, purchaseManagerId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "GRN not found or you do not have access",
        });
      }

      const grn = result.rows[0];

      // Verify purchase manager has access to this project
      const accessCheck = await pool.query(
        `SELECT id FROM project_purchase_managers 
       WHERE purchase_manager_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
        [purchaseManagerId, grn.project_id],
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          error: "You do not have access to this project",
        });
      }

      if (!grn.bill_image) {
        return res.status(404).json({
          error: "Bill image not available for this GRN",
        });
      }

      // Stream image with correct headers
      res.setHeader("Content-Type", grn.bill_image_mime || "image/jpeg");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="GRN_${grnId}_bill.jpg"`,
      );
      res.send(grn.bill_image);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET GRN PROOF IMAGE ---------------- */
router.get(
  "/grns/:grnId/proof-image",
  purchaseManagerCheck,
  async (req, res) => {
    try {
      const purchaseManagerId = req.user.id;
      const { grnId } = req.params;

      // Get GRN with proof image and verify PO ownership
      const result = await pool.query(
        `SELECT g.id, g.project_id, g.purchase_order_id, g.proof_image, g.proof_image_mime
       FROM grns g
       JOIN purchase_orders po ON g.purchase_order_id = po.id
       WHERE g.id = $1 AND po.created_by = $2`,
        [grnId, purchaseManagerId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "GRN not found or you do not have access",
        });
      }

      const grn = result.rows[0];

      // Verify purchase manager has access to this project
      const accessCheck = await pool.query(
        `SELECT id FROM project_purchase_managers 
       WHERE purchase_manager_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
        [purchaseManagerId, grn.project_id],
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          error: "You do not have access to this project",
        });
      }

      if (!grn.proof_image) {
        return res.status(404).json({
          error: "Proof image not available for this GRN",
        });
      }

      // Stream image with correct headers
      res.setHeader("Content-Type", grn.proof_image_mime || "image/jpeg");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="GRN_${grnId}_proof.jpg"`,
      );
      res.send(grn.proof_image);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
