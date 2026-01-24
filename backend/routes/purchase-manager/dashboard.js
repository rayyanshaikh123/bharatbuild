const express = require("express");
const pool = require("../../db");
const router = express.Router();
const purchaseManagerCheck = require("../../middleware/purchaseManagerCheck");

/* ---------------- DASHBOARD SUMMARY ---------------- */
router.get("/", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;

    // Get approved projects for this purchase manager
    const projectsResult = await pool.query(
      `SELECT project_id FROM project_purchase_managers 
       WHERE purchase_manager_id = $1 AND status = 'APPROVED'`,
      [purchaseManagerId],
    );

    const projectIds = projectsResult.rows.map((row) => row.project_id);

    if (projectIds.length === 0) {
      return res.json({
        summary: {
          pending_requests: 0,
          pos_generated_today: 0,
          pos_sent_this_week: 0,
          total_pos: 0,
        },
      });
    }

    // Get pending material requests count from approved projects
    const pendingMRResult = await pool.query(
      `SELECT COUNT(*) as count FROM material_requests 
       WHERE project_id = ANY($1) AND status = 'APPROVED'`,
      [projectIds],
    );

    // Get POs created today
    const posTodayResult = await pool.query(
      `SELECT COUNT(*) as count FROM purchase_orders 
       WHERE created_by = $1 AND DATE(created_at) = CURRENT_DATE`,
      [purchaseManagerId],
    );

    // Get POs sent this week
    const posSentThisWeekResult = await pool.query(
      `SELECT COUNT(*) as count FROM purchase_orders 
       WHERE created_by = $1 
         AND status = 'SENT' 
         AND sent_at >= DATE_TRUNC('week', CURRENT_DATE)`,
      [purchaseManagerId],
    );

    // Get total POs
    const totalPOsResult = await pool.query(
      `SELECT COUNT(*) as count FROM purchase_orders 
       WHERE created_by = $1`,
      [purchaseManagerId],
    );

    res.json({
      summary: {
        pending_requests: parseInt(pendingMRResult.rows[0].count),
        pos_generated_today: parseInt(posTodayResult.rows[0].count),
        pos_sent_this_week: parseInt(posSentThisWeekResult.rows[0].count),
        total_pos: parseInt(totalPOsResult.rows[0].count),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
