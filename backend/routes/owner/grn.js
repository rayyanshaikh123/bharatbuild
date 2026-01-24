const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

/* ---------------- GET GRNs BY PROJECT ---------------- */
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

    // Get GRNs for this project (exclude BYTEA columns for performance)
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

/* ---------------- GET GRN BILL IMAGE ---------------- */
router.get("/:grnId/bill-image", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { grnId } = req.params;

    // Get GRN with bill image
    const result = await pool.query(
      `SELECT g.id, g.project_id, g.bill_image, g.bill_image_mime
       FROM grns g
       WHERE g.id = $1`,
      [grnId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "GRN not found",
      });
    }

    const grn = result.rows[0];

    // Verify owner has access to this project
    const accessCheck = await pool.query(
      `SELECT p.id 
       FROM projects p
       JOIN organizations o ON p.org_id = o.id
       WHERE p.id = $1 AND o.owner_id = $2`,
      [grn.project_id, ownerId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this GRN's project",
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
});

/* ---------------- GET GRN PROOF IMAGE ---------------- */
router.get("/:grnId/proof-image", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { grnId } = req.params;

    // Get GRN with proof image
    const result = await pool.query(
      `SELECT g.id, g.project_id, g.proof_image, g.proof_image_mime
       FROM grns g
       WHERE g.id = $1`,
      [grnId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "GRN not found",
      });
    }

    const grn = result.rows[0];

    // Verify owner has access to this project
    const accessCheck = await pool.query(
      `SELECT p.id 
       FROM projects p
       JOIN organizations o ON p.org_id = o.id
       WHERE p.id = $1 AND o.owner_id = $2`,
      [grn.project_id, ownerId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this GRN's project",
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
});

module.exports = router;
