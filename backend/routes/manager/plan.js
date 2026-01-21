const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");

// Check if manager is ACTIVE in the project
async function managerProjectStatusCheck(managerId, projectId) {
  const statusResult = await pool.query(
    `SELECT count(*) FROM project_managers
     WHERE manager_id = $1 AND project_id = $2 AND status = 'ACTIVE'`,
    [managerId, projectId],
  );
  return parseInt(statusResult.rows[0].count) > 0;
}

// Check if manager is the creator of the project
async function isProjectCreator(managerId, projectId) {
  const result = await pool.query(
    `SELECT count(*) FROM projects WHERE id = $1 AND created_by = $2`,
    [projectId, managerId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- CREATE PLAN ---------------- */
router.post("/plans", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { project_id, start_date, end_date } = req.body;

    // Check if manager is ACTIVE in project or creator
    const isActive = await managerProjectStatusCheck(managerId, project_id);
    const isCreator = await isProjectCreator(managerId, project_id);

    if (!isActive && !isCreator) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    // Check if plan already exists for this project
    const existingPlan = await pool.query(
      `SELECT id FROM plans WHERE project_id = $1`,
      [project_id],
    );

    if (existingPlan.rows.length > 0) {
      return res.status(400).json({
        error: "Plan already exists for this project.",
      });
    }

    const result = await pool.query(
      `INSERT INTO plans (project_id, created_by, start_date, end_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [project_id, managerId, start_date, end_date],
    );

    res.status(201).json({ plan: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET PLAN ---------------- */
router.get("/plans/:projectId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;

    // Check if manager is ACTIVE in project or creator
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    const isCreator = await isProjectCreator(managerId, projectId);

    if (!isActive && !isCreator) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
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

/* ---------------- UPDATE PLAN ---------------- */
router.put("/plans/:planId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { planId } = req.params;
    const { start_date, end_date } = req.body;

    // Get plan with all details
    const planCheck = await pool.query(`SELECT * FROM plans WHERE id = $1`, [
      planId,
    ]);

    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const beforeState = planCheck.rows[0];
    const projectId = beforeState.project_id;

    // Check if manager is ACTIVE in project or creator
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    const isCreator = await isProjectCreator(managerId, projectId);

    if (!isActive && !isCreator) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    const result = await pool.query(
      `UPDATE plans SET start_date = $1, end_date = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [start_date, end_date, planId],
    );

    const afterState = result.rows[0];

    // Audit log
    const organizationId = await getOrganizationIdFromProject(projectId);
    await logAudit({
      entityType: "PLAN",
      entityId: planId,
      category: "PLAN",
      action: "UPDATE",
      before: beforeState,
      after: afterState,
      user: req.user,
      projectId: projectId,
      organizationId,
    });

    res.json({ plan: afterState });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE PLAN ---------------- */
router.delete("/plans/:planId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { planId } = req.params;

    // Get plan with all details
    const planCheck = await pool.query(`SELECT * FROM plans WHERE id = $1`, [
      planId,
    ]);

    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const beforeState = planCheck.rows[0];
    const projectId = beforeState.project_id;

    // Check if manager is ACTIVE in project or creator
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    const isCreator = await isProjectCreator(managerId, projectId);

    if (!isActive && !isCreator) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    await pool.query(`DELETE FROM plans WHERE id = $1`, [planId]);

    // Audit log
    const organizationId = await getOrganizationIdFromProject(projectId);
    await logAudit({
      entityType: "PLAN",
      entityId: planId,
      category: "PLAN",
      action: "DELETE",
      before: beforeState,
      after: null,
      user: req.user,
      projectId: projectId,
      organizationId,
    });

    res.json({ message: "Plan deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- ADD PLAN ITEM ---------------- */
router.post("/plans/:planId/items", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { planId } = req.params;
    const {
      period_type,
      period_start,
      period_end,
      task_name,
      description,
      planned_quantity,
      planned_manpower,
      planned_cost,
    } = req.body;

    // Get project_id from plan
    const planCheck = await pool.query(
      `SELECT project_id FROM plans WHERE id = $1`,
      [planId],
    );

    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const projectId = planCheck.rows[0].project_id;

    // Check if manager is ACTIVE in project or creator
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    const isCreator = await isProjectCreator(managerId, projectId);

    if (!isActive && !isCreator) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    const result = await pool.query(
      `INSERT INTO plan_items (plan_id, period_type, period_start, period_end, 
       task_name, description, planned_quantity, planned_manpower, planned_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        planId,
        period_type,
        period_start,
        period_end,
        task_name,
        description,
        planned_quantity,
        planned_manpower,
        planned_cost,
      ],
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- UPDATE PLAN ITEM ---------------- */
router.put("/plans/items/:itemId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { itemId } = req.params;
    const {
      period_type,
      period_start,
      period_end,
      task_name,
      description,
      planned_quantity,
      planned_manpower,
      planned_cost,
    } = req.body;

    // Get plan item with all details
    const itemCheck = await pool.query(
      `SELECT pi.*, p.project_id FROM plan_items pi
       JOIN plans p ON pi.plan_id = p.id
       WHERE pi.id = $1`,
      [itemId],
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: "Plan item not found" });
    }

    const beforeState = itemCheck.rows[0];
    const projectId = beforeState.project_id;

    // Check if manager is ACTIVE in project or creator
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    const isCreator = await isProjectCreator(managerId, projectId);

    if (!isActive && !isCreator) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    const result = await pool.query(
      `UPDATE plan_items SET 
       period_type = $1, period_start = $2, period_end = $3,
       task_name = $4, description = $5, planned_quantity = $6,
       planned_manpower = $7, planned_cost = $8
       WHERE id = $9 RETURNING *`,
      [
        period_type,
        period_start,
        period_end,
        task_name,
        description,
        planned_quantity,
        planned_manpower,
        planned_cost,
        itemId,
      ],
    );

    const afterState = result.rows[0];

    // Audit log
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

    res.json({ item: afterState });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE PLAN ITEM ---------------- */
router.delete("/plans/items/:itemId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { itemId } = req.params;

    // Get plan item with all details
    const itemCheck = await pool.query(
      `SELECT pi.*, p.project_id FROM plan_items pi
       JOIN plans p ON pi.plan_id = p.id
       WHERE pi.id = $1`,
      [itemId],
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: "Plan item not found" });
    }

    const beforeState = itemCheck.rows[0];
    const projectId = beforeState.project_id;

    // Check if manager is ACTIVE in project or creator
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    const isCreator = await isProjectCreator(managerId, projectId);

    if (!isActive && !isCreator) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    await pool.query(`DELETE FROM plan_items WHERE id = $1`, [itemId]);

    // Audit log
    const organizationId = await getOrganizationIdFromProject(projectId);
    await logAudit({
      entityType: "PLAN_ITEM",
      entityId: itemId,
      category: "PLAN_ITEM",
      action: "DELETE",
      before: beforeState,
      after: null,
      user: req.user,
      projectId: projectId,
      organizationId,
    });

    res.json({ message: "Plan item deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
