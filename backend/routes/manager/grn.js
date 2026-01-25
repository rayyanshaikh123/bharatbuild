const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

/* ---------------- GET GRNs BY PROJECT ---------------- */
router.get("/grns", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: "projectId query parameter is required",
      });
    }

    // Verify manager has access to this project (ACTIVE or project creator)
    const accessCheck = await pool.query(
      `SELECT pm.id, p.created_by 
       FROM project_managers pm
       JOIN projects p ON pm.project_id = p.id
       WHERE pm.manager_id = $1 AND pm.project_id = $2 AND pm.status = 'ACTIVE'`,
      [managerId, projectId],
    );

    const isCreator = await pool.query(
      `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
      [projectId, managerId],
    );

    if (accessCheck.rows.length === 0 && isCreator.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    // Get GRNs for this project (exclude BYTEA columns for performance)
    const result = await pool.query(
      `SELECT g.id, g.project_id, g.purchase_order_id, g.material_request_id, 
              g.received_by, g.status, g.received_items, g.remarks, 
              g.reviewed_by, g.created_at, g.received_at, g.reviewed_at,
              g.bill_image_mime, g.delivery_proof_image_mime,
              p.name AS project_name,
              po.po_number,
              po.vendor_name,
              mr.title AS material_request_title,
              se.name AS engineer_name,
              m.name AS reviewed_by_name
       FROM goods_receipt_notes g
       JOIN projects p ON g.project_id = p.id
       JOIN purchase_orders po ON g.purchase_order_id = po.id
       JOIN material_requests mr ON g.material_request_id = mr.id
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

/* ---------------- VERIFY GRN ---------------- */
router.patch("/grns/:grnId/verify", managerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const managerId = req.user.id;
    const { grnId } = req.params;
    const { remarks } = req.body;

    await client.query("BEGIN");

    // Get GRN details
    const grnResult = await client.query(
      `SELECT g.*, p.org_id 
       FROM goods_receipt_notes g
       JOIN projects p ON g.project_id = p.id
       WHERE g.id = $1`,
      [grnId],
    );

    if (grnResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "GRN not found",
      });
    }

    const grn = grnResult.rows[0];

    // Verify manager has access to the project (ACTIVE or project creator)
    const accessCheck = await client.query(
      `SELECT pm.id, p.created_by 
       FROM project_managers pm
       JOIN projects p ON pm.project_id = p.id
       WHERE pm.manager_id = $1 AND pm.project_id = $2 AND pm.status = 'ACTIVE'`,
      [managerId, grn.project_id],
    );

    const isCreator = await client.query(
      `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
      [grn.project_id, managerId],
    );

    if (accessCheck.rows.length === 0 && isCreator.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "You do not have access to verify GRNs for this project",
      });
    }

    // Check if already verified
    if (grn.status === "VERIFIED") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "GRN is already verified",
      });
    }

    // Update GRN status to VERIFIED
    const updateResult = await client.query(
      `UPDATE goods_receipt_notes 
       SET status = 'VERIFIED', 
           reviewed_by = $1, 
           reviewed_at = NOW(),
           remarks = COALESCE($2, remarks)
       WHERE id = $3
       RETURNING *`,
      [managerId, remarks, grnId],
    );

    const updatedGrn = updateResult.rows[0];

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "GRN",
        grnId,
        "VERIFIED",
        "MANAGER",
        managerId,
        grn.project_id,
        grn.org_id,
        "PROCUREMENT",
      ],
    );

    // Notify site engineer who created the GRN
    await client.query(
      `INSERT INTO notifications 
       (user_id, user_role, title, message, type, project_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        grn.received_by,
        "SITE_ENGINEER",
        "GRN Verified",
        "Your Goods Receipt Note has been verified by the project manager",
        "INFO",
        grn.project_id,
        JSON.stringify({ grn_id: grnId }),
      ],
    );

    await client.query("COMMIT");

    res.json({
      message: "GRN verified successfully",
      grn: updatedGrn,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GET GRN BILL IMAGE ---------------- */
router.get("/grns/:grnId/bill-image", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { grnId } = req.params;

    // Get GRN with bill image
    const result = await pool.query(
      `SELECT g.id, g.project_id, g.bill_image, g.bill_image_mime
       FROM goods_receipt_notes g
       WHERE g.id = $1`,
      [grnId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "GRN not found",
      });
    }

    const grn = result.rows[0];

    // Verify manager has access to this project
    const accessCheck = await pool.query(
      `SELECT pm.id, p.created_by 
       FROM project_managers pm
       JOIN projects p ON pm.project_id = p.id
       WHERE pm.manager_id = $1 AND pm.project_id = $2 AND pm.status = 'ACTIVE'`,
      [managerId, grn.project_id],
    );

    const isCreator = await pool.query(
      `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
      [grn.project_id, managerId],
    );

    if (accessCheck.rows.length === 0 && isCreator.rows.length === 0) {
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
router.get("/grns/:grnId/proof-image", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { grnId } = req.params;

    // Get GRN with proof image
    const result = await pool.query(
      `SELECT g.id, g.project_id, g.delivery_proof_image, g.delivery_proof_image_mime
       FROM goods_receipt_notes g
       WHERE g.id = $1`,
      [grnId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "GRN not found",
      });
    }

    const grn = result.rows[0];

    // Verify manager has access to this project
    const accessCheck = await pool.query(
      `SELECT pm.id, p.created_by 
       FROM project_managers pm
       JOIN projects p ON pm.project_id = p.id
       WHERE pm.manager_id = $1 AND pm.project_id = $2 AND pm.status = 'ACTIVE'`,
      [managerId, grn.project_id],
    );

    const isCreator = await pool.query(
      `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
      [grn.project_id, managerId],
    );

    if (accessCheck.rows.length === 0 && isCreator.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this GRN's project",
      });
    }

    if (!grn.delivery_proof_image) {
      return res.status(404).json({
        error: "Proof image not available for this GRN",
      });
    }

    // Stream image with correct headers
    res.setHeader("Content-Type", grn.delivery_proof_image_mime || "image/jpeg");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="GRN_${grnId}_proof.jpg"`,
    );
    res.send(grn.delivery_proof_image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
