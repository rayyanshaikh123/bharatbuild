const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

// Check if owner owns the organization of the project
async function ownerOfProject(ownerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM projects p
     JOIN organizations o ON p.org_id = o.id
     WHERE p.id = $1 AND o.owner_id = $2`,
    [projectId, ownerId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- GET PLAN (READ-ONLY) ---------------- */
router.get("/plans/:projectId", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { projectId } = req.params;

    // Check if owner owns the organization of this project
    const isOwner = await ownerOfProject(ownerId, projectId);

    if (!isOwner) {
      return res.status(403).json({
        error: "Access denied. You do not own this project's organization.",
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
