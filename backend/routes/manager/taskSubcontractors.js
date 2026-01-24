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

/* ---------------- ASSIGN SUBCONTRACTOR TO TASK ---------------- */
router.post("/:taskId/subcontractor", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { taskId } = req.params;
    const { subcontractor_id, task_start_date } = req.body;

    if (!subcontractor_id) {
      return res.status(400).json({ error: "subcontractor_id is required" });
    }

    // Get task and verify it exists
    const taskResult = await pool.query(
      `SELECT pi.*, pl.project_id 
       FROM plan_items pi
       JOIN plans pl ON pi.plan_id = pl.id
       WHERE pi.id = $1`,
      [taskId],
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = taskResult.rows[0];
    const projectId = task.project_id;

    // Check if manager is ACTIVE in project or creator
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    const isCreator = await isProjectCreator(managerId, projectId);

    if (!isActive && !isCreator) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    // Verify subcontractor exists
    const subResult = await pool.query(
      `SELECT id FROM subcontractors WHERE id = $1`,
      [subcontractor_id],
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: "Subcontractor not found" });
    }

    // Check if task already has a subcontractor assigned
    const existingAssignment = await pool.query(
      `SELECT id FROM task_subcontractors WHERE task_id = $1`,
      [taskId],
    );

    if (existingAssignment.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Task already has a subcontractor assigned" });
    }

    // Assign subcontractor to task
    const result = await pool.query(
      `INSERT INTO task_subcontractors (task_id, subcontractor_id, assigned_by, task_start_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [taskId, subcontractor_id, managerId, task_start_date || null],
    );

    // Audit log
    const organizationId = await getOrganizationIdFromProject(projectId);
    await logAudit({
      entityType: "TASK_SUBCONTRACTOR",
      entityId: result.rows[0].id,
      category: "SUBCONTRACTOR",
      action: "CREATE",
      before: null,
      after: result.rows[0],
      user: req.user,
      projectId: projectId,
      organizationId,
    });

    res.status(201).json({ assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      // Unique constraint violation
      return res
        .status(400)
        .json({ error: "Task already has a subcontractor assigned" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET TASK SUBCONTRACTOR ---------------- */
router.get("/:taskId/subcontractor", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { taskId } = req.params;

    // Get task and verify it exists
    const taskResult = await pool.query(
      `SELECT pi.*, pl.project_id 
       FROM plan_items pi
       JOIN plans pl ON pi.plan_id = pl.id
       WHERE pi.id = $1`,
      [taskId],
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = taskResult.rows[0];
    const projectId = task.project_id;

    // Check if manager is ACTIVE in project or creator
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    const isCreator = await isProjectCreator(managerId, projectId);

    if (!isActive && !isCreator) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    // Get assignment with subcontractor details
    const result = await pool.query(
      `SELECT ts.*, s.name, s.specialization, s.contact_name, s.contact_phone, s.contact_email
       FROM task_subcontractors ts
       JOIN subcontractors s ON ts.subcontractor_id = s.id
       WHERE ts.task_id = $1`,
      [taskId],
    );

    if (result.rows.length === 0) {
      return res.json({ assignment: null });
    }

    res.json({ assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- SUBMIT SPEED RATING ---------------- */
router.post("/:taskId/speed-rating", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { taskId } = req.params;
    const { rating, derived_from_duration } = req.body;

    // Validate rating
    if (rating === undefined && !derived_from_duration) {
      return res
        .status(400)
        .json({ error: "rating or derived_from_duration is required" });
    }

    if (
      rating !== undefined &&
      (rating < 1 || rating > 5 || !Number.isInteger(rating))
    ) {
      return res
        .status(400)
        .json({ error: "rating must be an integer between 1 and 5" });
    }

    // Get task and verify it exists
    const taskResult = await pool.query(
      `SELECT pi.*, pl.project_id 
       FROM plan_items pi
       JOIN plans pl ON pi.plan_id = pl.id
       WHERE pi.id = $1`,
      [taskId],
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = taskResult.rows[0];
    const projectId = task.project_id;

    // Check if task is COMPLETED
    if (task.status !== "COMPLETED") {
      return res
        .status(400)
        .json({ error: "Task must be COMPLETED to submit speed rating" });
    }

    // Check if manager is ACTIVE in project or creator
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    const isCreator = await isProjectCreator(managerId, projectId);

    if (!isActive && !isCreator) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    // Check if task has subcontractor assigned
    const assignmentResult = await pool.query(
      `SELECT subcontractor_id FROM task_subcontractors WHERE task_id = $1`,
      [taskId],
    );

    if (assignmentResult.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "Task does not have a subcontractor assigned" });
    }

    const subcontractorId = assignmentResult.rows[0].subcontractor_id;

    // Check if rating already exists
    const existingRating = await pool.query(
      `SELECT id FROM task_speed_ratings WHERE task_id = $1`,
      [taskId],
    );

    if (existingRating.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Speed rating already submitted for this task" });
    }

    // Determine final rating
    let finalRating = rating;
    if (derived_from_duration) {
      // Calculate rating based on task duration vs planned duration
      // Simple algorithm: if completed on time or early = 5, late = 4-1 based on delay
      finalRating = 4; // Default for derived
    }

    // Insert rating
    const result = await pool.query(
      `INSERT INTO task_speed_ratings (task_id, subcontractor_id, rating, derived_from_duration, rated_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        taskId,
        subcontractorId,
        finalRating,
        derived_from_duration || false,
        managerId,
      ],
    );

    // Audit log
    const organizationId = await getOrganizationIdFromProject(projectId);
    await logAudit({
      entityType: "TASK_SPEED_RATING",
      entityId: result.rows[0].id,
      category: "SUBCONTRACTOR",
      action: "CREATE",
      before: null,
      after: result.rows[0],
      user: req.user,
      projectId: projectId,
      organizationId,
    });

    res.status(201).json({ speed_rating: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ error: "Speed rating already submitted for this task" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET SPEED RATING ---------------- */
router.get("/:taskId/speed-rating", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { taskId } = req.params;

    // Get task and verify it exists
    const taskResult = await pool.query(
      `SELECT pi.*, pl.project_id 
       FROM plan_items pi
       JOIN plans pl ON pi.plan_id = pl.id
       WHERE pi.id = $1`,
      [taskId],
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = taskResult.rows[0];
    const projectId = task.project_id;

    // Check if manager is ACTIVE in project or creator
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    const isCreator = await isProjectCreator(managerId, projectId);

    if (!isActive && !isCreator) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM task_speed_ratings WHERE task_id = $1`,
      [taskId],
    );

    res.json({ speed_rating: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
