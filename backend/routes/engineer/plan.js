const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");

// Check if engineer is APPROVED in organization AND APPROVED in project
async function engineerProjectAccess(engineerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM project_site_engineers pse
     JOIN projects p ON pse.project_id = p.id
     JOIN organization_site_engineers ose ON ose.site_engineer_id = pse.site_engineer_id AND ose.org_id = p.org_id
     WHERE pse.site_engineer_id = $1 
       AND pse.project_id = $2 
       AND pse.status = 'APPROVED'
       AND ose.status = 'APPROVED'`,
    [engineerId, projectId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- GET PLAN (READ-ONLY) ---------------- */
router.get("/plans/:projectId", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.params;

    // Check if engineer is APPROVED in both organization and project
    const hasAccess = await engineerProjectAccess(engineerId, projectId);

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied. Not an approved engineer in this project.",
      });
    }

    const planResult = await pool.query(
      `SELECT * FROM plans WHERE project_id = $1`,
      [projectId],
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const plan = planResult.rows[0];

    // Get plan items
    const itemsResult = await pool.query(
      `SELECT * FROM plan_items WHERE plan_id = $1 ORDER BY period_start, created_at`,
      [plan.id],
    );

    res.json({
      plan: plan,
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
