const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");

/* ---------------- CREATE GRN ---------------- */
router.post("/grns", engineerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const siteEngineerId = req.user.id;
    const {
      projectId,
      purchaseOrderId,
      materialRequestId,
      receivedItems,
      remarks,
    } = req.body;

    // Validate required fields
    if (
      !projectId ||
      !purchaseOrderId ||
      !materialRequestId ||
      !receivedItems
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: projectId, purchaseOrderId, materialRequestId, receivedItems",
      });
    }

    // Validate receivedItems is array
    if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
      return res.status(400).json({
        error: "receivedItems must be a non-empty array",
      });
    }

    await client.query("BEGIN");

    // Verify site engineer has access to this project
    const engineerAccessCheck = await client.query(
      `SELECT id FROM project_site_engineers 
       WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [siteEngineerId, projectId],
    );

    if (engineerAccessCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    // Verify purchase order exists and belongs to this project
    const poCheck = await client.query(
      `SELECT id, project_id, material_request_id, status 
       FROM purchase_orders 
       WHERE id = $1`,
      [purchaseOrderId],
    );

    if (poCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Purchase order not found",
      });
    }

    const po = poCheck.rows[0];

    // Verify PO belongs to the same project
    if (po.project_id !== projectId) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Purchase order does not belong to this project",
      });
    }

    // Verify material request matches
    if (po.material_request_id !== materialRequestId) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Material request ID does not match the purchase order",
      });
    }

    // Verify material request exists
    const mrCheck = await client.query(
      `SELECT id, project_id FROM material_requests WHERE id = $1`,
      [materialRequestId],
    );

    if (mrCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Material request not found",
      });
    }

    // Verify material request belongs to same project
    if (mrCheck.rows[0].project_id !== projectId) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Material request does not belong to this project",
      });
    }

    // Create GRN
    const grnResult = await client.query(
      `INSERT INTO grns 
       (project_id, purchase_order_id, material_request_id, site_engineer_id, received_items, remarks, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'CREATED')
       RETURNING *`,
      [
        projectId,
        purchaseOrderId,
        materialRequestId,
        siteEngineerId,
        JSON.stringify(receivedItems),
        remarks,
      ],
    );

    const grn = grnResult.rows[0];

    // Get organization ID for audit log
    const orgResult = await client.query(
      `SELECT org_id FROM projects WHERE id = $1`,
      [projectId],
    );
    const orgId = orgResult.rows[0]?.org_id;

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        "GRN",
        grn.id,
        "CREATED",
        "SITE_ENGINEER",
        siteEngineerId,
        projectId,
        orgId,
        "PROCUREMENT",
        JSON.stringify({
          po_id: purchaseOrderId,
          items_count: receivedItems.length,
        }),
      ],
    );

    // Notify active project managers
    const managersResult = await client.query(
      `SELECT manager_id FROM project_managers 
       WHERE project_id = $1 AND status = 'ACTIVE'`,
      [projectId],
    );

    for (const manager of managersResult.rows) {
      await client.query(
        `INSERT INTO notifications 
         (user_id, user_role, title, message, type, project_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          manager.manager_id,
          "MANAGER",
          "New GRN Created",
          "A site engineer has created a Goods Receipt Note for review",
          "INFO",
          projectId,
          JSON.stringify({ grn_id: grn.id, po_id: purchaseOrderId }),
        ],
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "GRN created successfully",
      grn: grn,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GET GRNs BY PROJECT ---------------- */
router.get("/grns", engineerCheck, async (req, res) => {
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

    // Get GRNs for this project
    const result = await pool.query(
      `SELECT g.*, 
              p.name AS project_name,
              po.po_number,
              mr.title AS material_request_title,
              m.name AS verified_by_name
       FROM grns g
       JOIN projects p ON g.project_id = p.id
       JOIN purchase_orders po ON g.purchase_order_id = po.id
       JOIN material_requests mr ON g.material_request_id = mr.id
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

module.exports = router;
