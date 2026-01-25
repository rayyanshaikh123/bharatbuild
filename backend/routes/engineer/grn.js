const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const uploadGRNImages = require("../../middleware/uploadGRNImages");

/* ---------------- CREATE GRN ---------------- */
router.post(
  "/grns",
  engineerCheck,
  uploadGRNImages.fields([
    { name: "bill_image", maxCount: 1 },
    { name: "proof_image", maxCount: 1 },
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
        remarks,
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
      if (!req.files?.bill_image || !req.files?.proof_image) {
        return res.status(400).json({
          error: "Both bill_image and proof_image are required",
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

      // Create GRN with images
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
          req.files?.bill_image?.[0]?.buffer || null,
          req.files?.bill_image?.[0]?.mimetype || null,
          req.files?.proof_image?.[0]?.buffer || null,
          req.files?.proof_image?.[0]?.mimetype || null,
        ],
      );

      const grn = grnResult.rows[0]; // Get organization ID for audit log
      const orgResult = await client.query(
        `SELECT org_id FROM projects WHERE id = $1`,
        [projectId],
      );
      const orgId = orgResult.rows[0]?.org_id;

      // Create audit log
      const changeSummary = {
        po_id: purchaseOrderId,
        items_count: receivedItems.length,
      };

      // Add image info if present
      if (req.files?.bill_image?.[0]) {
        changeSummary.bill_image_size = req.files.bill_image[0].size;
        changeSummary.bill_image_mime = req.files.bill_image[0].mimetype;
      }
      if (req.files?.proof_image?.[0]) {
        changeSummary.delivery_proof_image_size = req.files.proof_image[0].size;
        changeSummary.delivery_proof_image_mime =
          req.files.proof_image[0].mimetype;
      }

      await client.query(
        `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          "GRN",
          grn.id,
          "GRN_CREATED_WITH_IMAGES",
          "SITE_ENGINEER",
          siteEngineerId,
          projectId,
          orgId,
          "PROCUREMENT",
          JSON.stringify(changeSummary),
        ],
      ); // Notify active project managers
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
        message: "GRN created successfully with images",
        grn: grn,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);

      // Handle multer errors
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "File too large. Maximum size is 5MB per image",
        });
      }

      res.status(500).json({ error: "Server error" });
    } finally {
      client.release();
    }
  },
); /* ---------------- GET GRNs BY PROJECT ---------------- */
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

    // Get GRNs for this project (exclude BYTEA columns for performance)
    const result = await pool.query(
      `SELECT g.id, g.project_id, g.purchase_order_id, g.material_request_id, 
              g.received_by, g.status, g.received_items, g.remarks, 
              g.reviewed_by, g.created_at, g.received_at, g.reviewed_at,
              g.bill_image_mime, g.delivery_proof_image_mime,
              p.name AS project_name,
              po.po_number,
              mr.title AS material_request_title,
              m.name AS reviewed_by_name
       FROM goods_receipt_notes g
       JOIN projects p ON g.project_id = p.id
       JOIN purchase_orders po ON g.purchase_order_id = po.id
       JOIN material_requests mr ON g.material_request_id = mr.id
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

/* ---------------- GET GRN BILL IMAGE ---------------- */
router.get("/grns/:grnId/bill-image", engineerCheck, async (req, res) => {
  try {
    const siteEngineerId = req.user.id;
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

    // Verify site engineer has access to this project
    const accessCheck = await pool.query(
      `SELECT id FROM project_site_engineers 
     WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [siteEngineerId, grn.project_id],
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
router.get("/grns/:grnId/proof-image", engineerCheck, async (req, res) => {
  try {
    const siteEngineerId = req.user.id;
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

    // Verify site engineer has access to this project
    const accessCheck = await pool.query(
      `SELECT id FROM project_site_engineers 
     WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [siteEngineerId, grn.project_id],
    );

    if (accessCheck.rows.length === 0) {
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
    res.setHeader(
      "Content-Type",
      grn.delivery_proof_image_mime || "image/jpeg",
    );
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
