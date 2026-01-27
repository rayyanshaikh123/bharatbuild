const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

/* ---------------- GET ALL GRNs BY PROJECT (MANAGER) ---------------- */
router.get("/", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId, status } = req.query;

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

    let query = `
      SELECT g.id, g.project_id, g.purchase_order_id, g.material_request_id, 
             g.received_by, g.status, g.received_items, g.manager_feedback,
             g.reviewed_by, g.created_at, g.received_at, g.reviewed_at,
             g.bill_image_mime, g.delivery_proof_image_mime,
             po.po_number, po.vendor_name,
             mr.title AS material_request_title,
             se.name AS received_by_name,
             m.name AS reviewed_by_name
      FROM goods_receipt_notes g
      JOIN purchase_orders po ON g.purchase_order_id = po.id
      JOIN material_requests mr ON g.material_request_id = mr.id
      JOIN site_engineers se ON g.received_by = se.id
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

/* ---------------- GET SINGLE GRN WITH DETAILS (MANAGER) ---------------- */
router.get("/:grnId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { grnId } = req.params;

    // Get GRN with all related details for verification
    const result = await pool.query(
      `SELECT g.id, g.project_id, g.purchase_order_id, g.material_request_id, 
              g.received_by, g.status, g.received_items, g.manager_feedback,
              g.reviewed_by, g.created_at, g.received_at, g.reviewed_at,
              g.bill_image_mime, g.delivery_proof_image_mime,
              po.po_number, po.vendor_name, po.items AS po_items, po.total_amount,
              mr.title AS material_request_title, mr.quantity AS material_request_quantity,
              se.name AS received_by_name,
              m.name AS reviewed_by_name,
              p.name AS project_name
       FROM goods_receipt_notes g
       JOIN purchase_orders po ON g.purchase_order_id = po.id
       JOIN material_requests mr ON g.material_request_id = mr.id
       JOIN site_engineers se ON g.received_by = se.id
       JOIN projects p ON g.project_id = p.id
       LEFT JOIN managers m ON g.reviewed_by = m.id
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
      `SELECT pm.id FROM project_managers pm
       WHERE pm.manager_id = $1 AND pm.project_id = $2 AND pm.status = 'ACTIVE'
       UNION
       SELECT id FROM projects WHERE id = $2 AND created_by = $1`,
      [managerId, grn.project_id],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    res.json({ grn: grn });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- APPROVE GRN (MANAGER) ---------------- */
router.patch("/:grnId/approve", managerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const managerId = req.user.id;
    const { grnId } = req.params;
    const { managerFeedback } = req.body;

    await client.query("BEGIN");

    // Get GRN details with all related information
    const grnResult = await client.query(
      `SELECT g.*, p.org_id, po.items AS po_items, po.po_number
       FROM goods_receipt_notes g
       JOIN projects p ON g.project_id = p.id
       JOIN purchase_orders po ON g.purchase_order_id = po.id
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

    // Verify manager has access to the project
    const accessCheck = await client.query(
      `SELECT pm.id FROM project_managers pm
       WHERE pm.manager_id = $1 AND pm.project_id = $2 AND pm.status = 'ACTIVE'
       UNION
       SELECT id FROM projects WHERE id = $2 AND created_by = $1`,
      [managerId, grn.project_id],
    );

    if (accessCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    // Check if already approved or rejected
    if (grn.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `GRN is already ${grn.status}`,
      });
    }

    // Parse received items
    const receivedItems = JSON.parse(grn.received_items);

    // VALIDATION: Compare PO items vs GRN received items
    const poItems = JSON.parse(grn.po_items);
    const validationResults = [];

    for (const receivedItem of receivedItems) {
      const poItem = poItems.find(
        (item) => item.material_name === receivedItem.material_name,
      );

      if (!poItem) {
        validationResults.push({
          material_name: receivedItem.material_name,
          status: "NOT_IN_PO",
          message: "Material not found in purchase order",
        });
      } else {
        const poQty = parseFloat(poItem.quantity);
        const receivedQty = parseFloat(receivedItem.quantity_received);

        if (receivedQty < poQty) {
          validationResults.push({
            material_name: receivedItem.material_name,
            status: "SHORT_RECEIVED",
            po_quantity: poQty,
            received_quantity: receivedQty,
            difference: poQty - receivedQty,
          });
        } else if (receivedQty > poQty) {
          validationResults.push({
            material_name: receivedItem.material_name,
            status: "OVER_RECEIVED",
            po_quantity: poQty,
            received_quantity: receivedQty,
            difference: receivedQty - poQty,
          });
        } else {
          validationResults.push({
            material_name: receivedItem.material_name,
            status: "MATCHED",
            quantity: receivedQty,
          });
        }
      }
    }

    // Update GRN status to APPROVED
    await client.query(
      `UPDATE goods_receipt_notes 
       SET status = 'APPROVED', 
           reviewed_by = $1, 
           reviewed_at = NOW(),
           manager_feedback = $2
       WHERE id = $3`,
      [managerId, managerFeedback || "Approved", grnId],
    );

    // Update purchase_orders.grn_created = true
    await client.query(
      `UPDATE purchase_orders 
       SET grn_created = true 
       WHERE id = $1`,
      [grn.purchase_order_id],
    );

    // Calculate total investment from PO items
    let grnTotalValue = 0;
    for (const receivedItem of receivedItems) {
      const poItem = poItems.find(
        (item) => item.material_name === receivedItem.material_name,
      );
      if (poItem && poItem.unit_price) {
        grnTotalValue +=
          parseFloat(receivedItem.quantity_received) *
          parseFloat(poItem.unit_price);
      }
    }

    // Update project investment (projects.current_invested)
    if (grnTotalValue > 0) {
      await client.query(
        `UPDATE projects 
         SET current_invested = COALESCE(current_invested, 0) + $1
         WHERE id = $2`,
        [grnTotalValue, grn.project_id],
      );
    }

    // Insert material_ledger entries (movement_type = IN, source = BILL)
    // AND update project_material_stock
    for (const receivedItem of receivedItems) {
      // Insert into ledger for audit trail
      await client.query(
        `INSERT INTO material_ledger 
         (project_id, material_name, quantity, unit, movement_type, source, 
          recorded_by_role, recorded_by, remarks)
         VALUES ($1, $2, $3, $4, 'IN', 'BILL', 'MANAGER', $5, $6)`,
        [
          grn.project_id,
          receivedItem.material_name,
          receivedItem.quantity_received,
          receivedItem.unit,
          managerId,
          `GRN ${grn.po_number} - Approved by Manager`,
        ],
      );

      // Upsert into project_material_stock (increase available quantity)
      await client.query(
        `INSERT INTO project_material_stock 
         (project_id, material_name, category, unit, available_quantity, last_updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (project_id, material_name, unit)
         DO UPDATE SET 
           available_quantity = project_material_stock.available_quantity + $5,
           last_updated_at = NOW()`,
        [
          grn.project_id,
          receivedItem.material_name,
          receivedItem.category || "General",
          receivedItem.unit,
          parseFloat(receivedItem.quantity_received),
        ],
      );
    }

    // Create audit log for approval
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        "GOODS_RECEIPT_NOTE",
        grnId,
        "GRN_APPROVED",
        "MANAGER",
        managerId,
        grn.project_id,
        grn.org_id,
        "PROCUREMENT",
        JSON.stringify({
          purchase_order_id: grn.purchase_order_id,
          material_request_id: grn.material_request_id,
          items_count: receivedItems.length,
          validation_results: validationResults,
          manager_feedback: managerFeedback,
        }),
      ],
    );

    // Create notification for Site Engineer
    await client.query(
      `INSERT INTO notifications 
       (user_role, user_id, title, message, category, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "SITE_ENGINEER",
        grn.received_by,
        "GRN Approved",
        `Your Goods Receipt Note for PO ${grn.po_number} has been approved by the manager.`,
        "PROCUREMENT",
        grnId,
        "GRN",
      ],
    );

    await client.query("COMMIT");

    res.json({
      message: "GRN approved successfully",
      validation_results: validationResults,
      grn_id: grnId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- REJECT GRN (MANAGER) ---------------- */
router.patch("/:grnId/reject", managerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const managerId = req.user.id;
    const { grnId } = req.params;
    const { managerFeedback } = req.body;

    if (!managerFeedback) {
      return res.status(400).json({
        error: "managerFeedback is required for rejection",
      });
    }

    await client.query("BEGIN");

    // Get GRN details
    const grnResult = await client.query(
      `SELECT g.*, p.org_id, po.po_number
       FROM goods_receipt_notes g
       JOIN projects p ON g.project_id = p.id
       JOIN purchase_orders po ON g.purchase_order_id = po.id
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

    // Verify manager has access to the project
    const accessCheck = await client.query(
      `SELECT pm.id FROM project_managers pm
       WHERE pm.manager_id = $1 AND pm.project_id = $2 AND pm.status = 'ACTIVE'
       UNION
       SELECT id FROM projects WHERE id = $2 AND created_by = $1`,
      [managerId, grn.project_id],
    );

    if (accessCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    // Check if already approved or rejected
    if (grn.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `GRN is already ${grn.status}`,
      });
    }

    // Update GRN status to REJECTED
    await client.query(
      `UPDATE goods_receipt_notes 
       SET status = 'REJECTED', 
           reviewed_by = $1, 
           reviewed_at = NOW(),
           manager_feedback = $2
       WHERE id = $3`,
      [managerId, managerFeedback, grnId],
    );

    // Create audit log for rejection
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        "GOODS_RECEIPT_NOTE",
        grnId,
        "GRN_REJECTED",
        "MANAGER",
        managerId,
        grn.project_id,
        grn.org_id,
        "PROCUREMENT",
        JSON.stringify({
          purchase_order_id: grn.purchase_order_id,
          material_request_id: grn.material_request_id,
          manager_feedback: managerFeedback,
        }),
      ],
    );

    // Create notification for Site Engineer
    await client.query(
      `INSERT INTO notifications 
       (user_role, user_id, title, message, category, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "SITE_ENGINEER",
        grn.received_by,
        "GRN Rejected",
        `Your Goods Receipt Note for PO ${grn.po_number} has been rejected. Reason: ${managerFeedback}`,
        "PROCUREMENT",
        grnId,
        "GRN",
      ],
    );

    await client.query("COMMIT");

    res.json({
      message: "GRN rejected successfully",
      grn_id: grnId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GET BILL IMAGE ---------------- */
router.get("/:grnId/bill-image", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { grnId } = req.params;

    // Get image with access check
    const result = await pool.query(
      `SELECT g.bill_image, g.bill_image_mime, g.project_id
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
      `SELECT pm.id FROM project_managers pm
       WHERE pm.manager_id = $1 AND pm.project_id = $2 AND pm.status = 'ACTIVE'
       UNION
       SELECT id FROM projects WHERE id = $2 AND created_by = $1`,
      [managerId, grn.project_id],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    if (!grn.bill_image) {
      return res.status(404).json({
        error: "Bill image not found for this GRN",
      });
    }

    res.setHeader("Content-Type", grn.bill_image_mime);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="grn-bill-${grnId}.${grn.bill_image_mime.split("/")[1]}"`,
    );
    res.send(grn.bill_image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET DELIVERY PROOF IMAGE ---------------- */
router.get("/:grnId/delivery-proof-image", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { grnId } = req.params;

    // Get image with access check
    const result = await pool.query(
      `SELECT g.delivery_proof_image, g.delivery_proof_image_mime, g.project_id
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
      `SELECT pm.id FROM project_managers pm
       WHERE pm.manager_id = $1 AND pm.project_id = $2 AND pm.status = 'ACTIVE'
       UNION
       SELECT id FROM projects WHERE id = $2 AND created_by = $1`,
      [managerId, grn.project_id],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    if (!grn.delivery_proof_image) {
      return res.status(404).json({
        error: "Delivery proof image not found for this GRN",
      });
    }

    res.setHeader("Content-Type", grn.delivery_proof_image_mime);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="grn-delivery-proof-${grnId}.${grn.delivery_proof_image_mime.split("/")[1]}"`,
    );
    res.send(grn.delivery_proof_image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
