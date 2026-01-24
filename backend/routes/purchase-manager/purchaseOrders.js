const express = require("express");
const pool = require("../../db");
const router = express.Router();
const purchaseManagerCheck = require("../../middleware/purchaseManagerCheck");

/* ---------------- CREATE PURCHASE ORDER ---------------- */
router.post("/", purchaseManagerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const purchaseManagerId = req.user.id;
    const {
      materialRequestId,
      projectId,
      poNumber,
      vendorName,
      vendorContact,
      items,
      totalAmount,
    } = req.body;

    // Validate required fields
    if (
      !materialRequestId ||
      !projectId ||
      !poNumber ||
      !vendorName ||
      !items ||
      !totalAmount
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: materialRequestId, projectId, poNumber, vendorName, items, totalAmount",
      });
    }

    // Verify purchase manager has access to this project
    const accessCheck = await client.query(
      `SELECT id FROM project_purchase_managers 
       WHERE purchase_manager_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [purchaseManagerId, projectId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have approved access to this project",
      });
    }

    // Verify material request exists and is approved
    const mrCheck = await client.query(
      `SELECT id, project_id, status FROM material_requests 
       WHERE id = $1`,
      [materialRequestId],
    );

    if (mrCheck.rows.length === 0) {
      return res.status(404).json({ error: "Material request not found" });
    }

    if (mrCheck.rows[0].status !== "APPROVED") {
      return res.status(400).json({
        error: "Material request must be APPROVED to create a purchase order",
      });
    }

    if (mrCheck.rows[0].project_id !== projectId) {
      return res.status(400).json({
        error: "Material request does not belong to this project",
      });
    }

    // Check if PO number is unique
    const poCheck = await client.query(
      `SELECT id FROM purchase_orders WHERE po_number = $1`,
      [poNumber],
    );

    if (poCheck.rows.length > 0) {
      return res.status(400).json({
        error: "PO number already exists. Please use a unique PO number.",
      });
    }

    await client.query("BEGIN");

    // Insert purchase order
    const poResult = await client.query(
      `INSERT INTO purchase_orders 
       (material_request_id, project_id, po_number, vendor_name, vendor_contact, items, total_amount, status, created_by, created_by_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', $8, 'PURCHASE_MANAGER')
       RETURNING *`,
      [
        materialRequestId,
        projectId,
        poNumber,
        vendorName,
        vendorContact,
        JSON.stringify(items),
        totalAmount,
        purchaseManagerId,
      ],
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "PURCHASE_ORDER",
        poResult.rows[0].id,
        "CREATED",
        "PURCHASE_MANAGER",
        purchaseManagerId,
        projectId,
        "PROCUREMENT",
        JSON.stringify({
          po_number: poNumber,
          vendor: vendorName,
          amount: totalAmount,
        }),
      ],
    );

    await client.query("COMMIT");

    res.status(201).json({ 
      message: "Purchase order created successfully", 
      purchase_order: poResult.rows[0] 
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    if (err.constraint === "purchase_orders_po_number_key") {
      return res.status(400).json({ error: "PO number already exists" });
    }

    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GET ALL PURCHASE ORDERS ---------------- */
router.get("/", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;
    const { projectId, status } = req.query;

    let query = `
      SELECT po.*, 
             p.name AS project_name,
             mr.title AS material_request_title,
             mr.category AS material_category
      FROM purchase_orders po
      JOIN projects p ON po.project_id = p.id
      JOIN material_requests mr ON po.material_request_id = mr.id
      WHERE po.created_by = $1
    `;

    const params = [purchaseManagerId];
    let paramIndex = 2;

    if (projectId) {
      query += ` AND po.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    if (status) {
      query += ` AND po.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY po.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ purchase_orders: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET SINGLE PURCHASE ORDER ---------------- */
router.get("/:id", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT po.*, 
              p.name AS project_name, p.location_text,
              mr.title AS material_request_title, mr.category AS material_category,
              mr.quantity AS requested_quantity, mr.description AS material_description
       FROM purchase_orders po
       JOIN projects p ON po.project_id = p.id
       JOIN material_requests mr ON po.material_request_id = mr.id
       WHERE po.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    const po = result.rows[0];

    // Verify ownership
    if (po.created_by !== purchaseManagerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ purchase_order: po });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- UPLOAD PO PDF ---------------- */
router.patch("/:id/upload", purchaseManagerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const purchaseManagerId = req.user.id;
    const { id } = req.params;
    const { poPdfUrl } = req.body;

    if (!poPdfUrl) {
      return res.status(400).json({ error: "PO PDF URL is required" });
    }

    // Verify ownership
    const poCheck = await client.query(
      `SELECT id, status, project_id FROM purchase_orders WHERE id = $1 AND created_by = $2`,
      [id, purchaseManagerId],
    );

    if (poCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Purchase order not found or access denied" });
    }

    await client.query("BEGIN");

    // Update PO with PDF URL
    const result = await client.query(
      `UPDATE purchase_orders 
       SET po_pdf_url = $1
       WHERE id = $2
       RETURNING *`,
      [poPdfUrl, id],
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "PURCHASE_ORDER",
        id,
        "PDF_UPLOADED",
        "PURCHASE_MANAGER",
        purchaseManagerId,
        poCheck.rows[0].project_id,
        "PROCUREMENT",
      ],
    );

    await client.query("COMMIT");

    res.json({ 
      message: "PO PDF uploaded successfully", 
      purchase_order: result.rows[0] 
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- SEND PURCHASE ORDER ---------------- */
router.patch("/:id/send", purchaseManagerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const purchaseManagerId = req.user.id;
    const { id } = req.params;

    // Verify ownership and get PO details
    const poCheck = await client.query(
      `SELECT po.*, mr.site_engineer_id, p.org_id
       FROM purchase_orders po
       JOIN material_requests mr ON po.material_request_id = mr.id
       JOIN projects p ON po.project_id = p.id
       WHERE po.id = $1 AND po.created_by = $2`,
      [id, purchaseManagerId],
    );

    if (poCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Purchase order not found or access denied" });
    }

    const po = poCheck.rows[0];

    if (po.status !== "DRAFT") {
      return res.status(400).json({
        error: "Only DRAFT purchase orders can be sent",
      });
    }

    if (!po.po_pdf_url) {
      return res.status(400).json({
        error: "Please upload PO PDF before sending",
      });
    }

    await client.query("BEGIN");

    // Update PO status to SENT
    const result = await client.query(
      `UPDATE purchase_orders 
       SET status = 'SENT', sent_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    // Create notification for site engineer
    await client.query(
      `INSERT INTO notifications (user_id, user_role, title, message, type, project_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        po.site_engineer_id,
        "SITE_ENGINEER",
        "Purchase Order Sent",
        `Purchase order ${po.po_number} has been sent for your material request`,
        "INFO",
        po.project_id,
        JSON.stringify({ po_id: id, po_number: po.po_number }),
      ],
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "PURCHASE_ORDER",
        id,
        "SENT",
        "PURCHASE_MANAGER",
        purchaseManagerId,
        po.project_id,
        po.org_id,
        "PROCUREMENT",
      ],
    );

    await client.query("COMMIT");

    res.json({ 
      message: "Purchase order sent successfully", 
      purchase_order: result.rows[0] 
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
