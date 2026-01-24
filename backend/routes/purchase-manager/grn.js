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

    // Get GRNs linked to POs created by this purchase manager for this project
    const result = await pool.query(
      `SELECT g.*, 
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

module.exports = router;
