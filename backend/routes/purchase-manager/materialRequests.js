const express = require("express");
const pool = require("../../db");
const router = express.Router();
const purchaseManagerCheck = require("../../middleware/purchaseManagerCheck");

/* ---------------- GET APPROVED MATERIAL REQUESTS ---------------- */
router.get("/", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // Verify purchase manager has access to this project
    const accessCheck = await pool.query(
      `SELECT id FROM project_purchase_managers 
       WHERE purchase_manager_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [purchaseManagerId, projectId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have approved access to this project",
      });
    }

    // Get APPROVED material requests for this project
    const result = await pool.query(
      `SELECT mr.id, mr.project_id, mr.title, mr.category, mr.quantity, 
              mr.description, mr.status, mr.created_at, mr.reviewed_at,
              se.name AS engineer_name, se.email AS engineer_email,
              m.name AS reviewed_by_name,
              p.name AS project_name,
              -- Check if PO already exists for this material request
              CASE WHEN po.id IS NOT NULL THEN true ELSE false END AS has_po,
              po.po_number, po.status AS po_status
       FROM material_requests mr
       JOIN site_engineers se ON mr.site_engineer_id = se.id
       JOIN projects p ON mr.project_id = p.id
       LEFT JOIN managers m ON mr.reviewed_by = m.id
       LEFT JOIN purchase_orders po ON mr.id = po.material_request_id
       WHERE mr.project_id = $1 AND mr.status = 'APPROVED'
       ORDER BY mr.created_at DESC`,
      [projectId],
    );

    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET SINGLE MATERIAL REQUEST DETAILS ---------------- */
router.get("/:id", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;
    const { id } = req.params;

    // Get material request
    const mrResult = await pool.query(
      `SELECT mr.*, 
              se.name AS engineer_name, se.email AS engineer_email,
              m.name AS reviewed_by_name,
              p.name AS project_name, p.id AS project_id
       FROM material_requests mr
       JOIN site_engineers se ON mr.site_engineer_id = se.id
       JOIN projects p ON mr.project_id = p.id
       LEFT JOIN managers m ON mr.reviewed_by = m.id
       WHERE mr.id = $1`,
      [id],
    );

    if (mrResult.rows.length === 0) {
      return res.status(404).json({ error: "Material request not found" });
    }

    const materialRequest = mrResult.rows[0];

    // Verify access to project
    const accessCheck = await pool.query(
      `SELECT id FROM project_purchase_managers 
       WHERE purchase_manager_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [purchaseManagerId, materialRequest.project_id],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this material request",
      });
    }

    res.json({ request: materialRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET MATERIAL REQUEST IMAGE ---------------- */
router.get("/:id/image", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT mr.request_image, mr.request_image_mime, mr.project_id
       FROM material_requests mr
       WHERE mr.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Material request not found" });
    }

    // Verify access
    const accessCheck = await pool.query(
      `SELECT id FROM project_purchase_managers 
       WHERE purchase_manager_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [purchaseManagerId, result.rows[0].project_id],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { request_image, request_image_mime } = result.rows[0];

    if (!request_image) {
      return res.status(404).json({ error: "No image found" });
    }

    res.set("Content-Type", request_image_mime || "image/jpeg");
    res.send(request_image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
