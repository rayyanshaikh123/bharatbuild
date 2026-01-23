const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");

// Check if engineer is APPROVED in organization AND has access to project (ACTIVE or PENDING)
async function engineerProjectAccess(engineerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM project_site_engineers pse
     JOIN projects p ON pse.project_id = p.id
     JOIN organization_site_engineers ose ON ose.site_engineer_id = pse.site_engineer_id AND ose.org_id = p.org_id
     WHERE pse.site_engineer_id = $1 
       AND pse.project_id = $2 
       AND pse.status IN ('ACTIVE', 'PENDING')
       AND ose.status IN ('APPROVED', 'PENDING')`,
    [engineerId, projectId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- GET PLAN (READ-ONLY) ---------------- */
router.get("/plans/:projectId", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.params;

    // Check if engineer has access to project (ACTIVE or PENDING) and organization (APPROVED or PENDING)
    const hasAccess = await engineerProjectAccess(engineerId, projectId);

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied. You must be part of the organization and project to view plans.",
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

/* ---------------- UPDATE PLAN ITEM STATUS/PRIORITY ---------------- */
router.patch("/plan-items/:itemId", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { itemId } = req.params;
    const { status, priority, delay_info } = req.body;

    // Get item detail to check project access
    const itemCheck = await pool.query(
      `SELECT pi.*, p.id as project_id FROM plan_items pi
       JOIN plans pl ON pi.plan_id = pl.id
       JOIN projects p ON pl.project_id = p.id
       WHERE pi.id = $1`,
      [itemId],
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: "Plan item not found" });
    }

    const beforeState = itemCheck.rows[0];
    const projectId = beforeState.project_id;

    // Check project access
    const hasAccess = await engineerProjectAccess(engineerId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied. You must be part of the organization and project to update plan items." });
    }

    // Prepare update fields
    let queryFields = [];
    let values = [];
    let idx = 1;

    if (status !== undefined) {
      queryFields.push(`status = $${idx++}`);
      values.push(status);
      if (status === "COMPLETED") {
        queryFields.push(`completed_at = $${idx++}`);
        values.push(new Date());
      }
    }

    if (priority !== undefined) {
      queryFields.push(`priority = $${idx++}`);
      values.push(priority);
    }

    if (delay_info !== undefined) {
      queryFields.push(`delay_info = $${idx++}`);
      values.push(JSON.stringify(delay_info));
    }

    if (queryFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Set audit fields
    queryFields.push(`updated_by = $${idx++}`);
    values.push(engineerId);
    queryFields.push(`updated_by_role = $${idx++}`);
    values.push("SITE_ENGINEER");

    values.push(itemId);
    const updateResult = await pool.query(
      `UPDATE plan_items SET ${queryFields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );

    const afterState = updateResult.rows[0];

    // Audit Log
    const organizationId = await getOrganizationIdFromProject(projectId);
    await logAudit({
      entityType: "PLAN_ITEM",
      entityId: itemId,
      category: "PLAN_ITEM",
      action: "UPDATE",
      before: beforeState,
      after: afterState,
      user: req.user,
      projectId: projectId,
      organizationId,
    });

    res.json({ message: "Task updated successfully", item: afterState });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
