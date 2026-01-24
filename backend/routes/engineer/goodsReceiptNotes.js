const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const uploadGRNImages = require("../../middleware/uploadGRNImages");

/* ---------------- CREATE GOODS RECEIPT NOTE ---------------- */
router.post(
  "/",
  engineerCheck,
  uploadGRNImages.fields([
    { name: "bill_image", maxCount: 1 },
    { name: "delivery_proof_image", maxCount: 1 },
  ]),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const siteEngineerId = req.user.id;
      const {
        projectId,
        purchaseOrderId,
        materialRequestId,
        receivedItems: receivedItemsRaw,
      } = req.body;

      // Validate required fields
      if (
        !projectId ||
        !purchaseOrderId ||
        !materialRequestId ||
        !receivedItemsRaw
      ) {
        return res.status(400).json({
          error:
            "Missing required fields: projectId, purchaseOrderId, materialRequestId, receivedItems",
        });
      }

      // Validate images are uploaded
      if (!req.files?.bill_image || !req.files?.delivery_proof_image) {
        return res.status(400).json({
          error: "Both bill_image and delivery_proof_image are required",
        });
      }

      // Parse receivedItems (comes as string from multipart/form-data)
      let receivedItems;
      try {
        receivedItems =
          typeof receivedItemsRaw === "string"
            ? JSON.parse(receivedItemsRaw)
            : receivedItemsRaw;
      } catch (parseErr) {
        return res.status(400).json({
          error: "receivedItems must be valid JSON",
        });
      }

      // Validate receivedItems is array with required fields
      if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
        return res.status(400).json({
          error: "receivedItems must be a non-empty array",
        });
      }

      // Validate each item has required fields
      for (const item of receivedItems) {
        if (!item.material_name || !item.quantity_received || !item.unit) {
          return res.status(400).json({
            error:
              "Each receivedItem must have: material_name, quantity_received, unit",
          });
        }
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

      const billImageFile = req.files.bill_image[0];
      const deliveryProofFile = req.files.delivery_proof_image[0];

      // Create Goods Receipt Note with status = PENDING (no auto-approval)
      const grnResult = await client.query(
        `INSERT INTO goods_receipt_notes 
       (project_id, purchase_order_id, material_request_id, received_by, received_items, status, 
        bill_image, bill_image_mime, delivery_proof_image, delivery_proof_image_mime)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, $8, $9)
       RETURNING id, project_id, purchase_order_id, material_request_id, received_by, status, created_at, received_at`,
        [
          projectId,
          purchaseOrderId,
          materialRequestId,
          siteEngineerId,
          JSON.stringify(receivedItems),
          billImageFile.buffer,
          billImageFile.mimetype,
          deliveryProofFile.buffer,
          deliveryProofFile.mimetype,
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
          "GOODS_RECEIPT_NOTE",
          grn.id,
          "GRN_CREATED",
          "SITE_ENGINEER",
          siteEngineerId,
          projectId,
          orgId,
          "PROCUREMENT",
          JSON.stringify({
            purchase_order_id: purchaseOrderId,
            material_request_id: materialRequestId,
            items_count: receivedItems.length,
            bill_image_size: billImageFile.size,
            delivery_proof_size: deliveryProofFile.size,
          }),
        ],
      );

      await client.query("COMMIT");

      res.status(201).json({
        message:
          "Goods Receipt Note created successfully. Pending manager approval.",
        grn: grn,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: "Server error" });
    } finally {
      client.release();
    }
  },
);

/* ---------------- GET GRNs BY PROJECT (SITE ENGINEER) ---------------- */
router.get("/", engineerCheck, async (req, res) => {
  try {
    const siteEngineerId = req.user.id;
    const { projectId, status } = req.query;

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

    let query = `
      SELECT g.id, g.project_id, g.purchase_order_id, g.material_request_id, 
             g.received_by, g.status, g.received_items, g.manager_feedback,
             g.reviewed_by, g.created_at, g.received_at, g.reviewed_at,
             g.bill_image_mime, g.delivery_proof_image_mime,
             po.po_number, po.vendor_name,
             mr.title AS material_request_title,
             m.name AS reviewed_by_name
      FROM goods_receipt_notes g
      JOIN purchase_orders po ON g.purchase_order_id = po.id
      JOIN material_requests mr ON g.material_request_id = mr.id
      LEFT JOIN managers m ON g.reviewed_by = m.id
      WHERE g.project_id = $1
    `;

    const params = [projectId];

    if (status) {
      query += ` AND g.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY g.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ grns: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET SINGLE GRN ---------------- */
router.get("/:grnId", engineerCheck, async (req, res) => {
  try {
    const siteEngineerId = req.user.id;
    const { grnId } = req.params;

    // Get GRN with access check
    const result = await pool.query(
      `SELECT g.id, g.project_id, g.purchase_order_id, g.material_request_id, 
              g.received_by, g.status, g.received_items, g.manager_feedback,
              g.reviewed_by, g.created_at, g.received_at, g.reviewed_at,
              g.bill_image_mime, g.delivery_proof_image_mime,
              po.po_number, po.vendor_name, po.items AS po_items, po.total_amount,
              mr.title AS material_request_title, mr.requested_items,
              m.name AS reviewed_by_name,
              se.name AS received_by_name
       FROM goods_receipt_notes g
       JOIN purchase_orders po ON g.purchase_order_id = po.id
       JOIN material_requests mr ON g.material_request_id = mr.id
       JOIN site_engineers se ON g.received_by = se.id
       LEFT JOIN managers m ON g.reviewed_by = m.id
       JOIN project_site_engineers pse ON g.project_id = pse.project_id
       WHERE g.id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [grnId, siteEngineerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "GRN not found or you do not have access",
      });
    }

    res.json({ grn: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET BILL IMAGE ---------------- */
router.get("/:grnId/bill-image", engineerCheck, async (req, res) => {
  try {
    const siteEngineerId = req.user.id;
    const { grnId } = req.params;

    // Get image with access check
    const result = await pool.query(
      `SELECT g.bill_image, g.bill_image_mime
       FROM goods_receipt_notes g
       JOIN project_site_engineers pse ON g.project_id = pse.project_id
       WHERE g.id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [grnId, siteEngineerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "GRN not found or you do not have access",
      });
    }

    const { bill_image, bill_image_mime } = result.rows[0];

    if (!bill_image) {
      return res.status(404).json({
        error: "Bill image not found for this GRN",
      });
    }

    res.setHeader("Content-Type", bill_image_mime);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="grn-bill-${grnId}.${bill_image_mime.split("/")[1]}"`,
    );
    res.send(bill_image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET DELIVERY PROOF IMAGE ---------------- */
router.get("/:grnId/delivery-proof-image", engineerCheck, async (req, res) => {
  try {
    const siteEngineerId = req.user.id;
    const { grnId } = req.params;

    // Get image with access check
    const result = await pool.query(
      `SELECT g.delivery_proof_image, g.delivery_proof_image_mime
       FROM goods_receipt_notes g
       JOIN project_site_engineers pse ON g.project_id = pse.project_id
       WHERE g.id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [grnId, siteEngineerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "GRN not found or you do not have access",
      });
    }

    const { delivery_proof_image, delivery_proof_image_mime } = result.rows[0];

    if (!delivery_proof_image) {
      return res.status(404).json({
        error: "Delivery proof image not found for this GRN",
      });
    }

    res.setHeader("Content-Type", delivery_proof_image_mime);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="grn-delivery-proof-${grnId}.${delivery_proof_image_mime.split("/")[1]}"`,
    );
    res.send(delivery_proof_image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
