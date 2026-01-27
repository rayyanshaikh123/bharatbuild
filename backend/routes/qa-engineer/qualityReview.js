const express = require("express");
const pool = require("../../db");
const router = express.Router();
const qaEngineerCheck = require("../../middleware/qaEngineerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");

// Check if QA Engineer is APPROVED in the project
async function qaProjectStatusCheck(qaEngineerId, projectId) {
  const statusResult = await pool.query(
    `SELECT count(*) FROM project_qa_engineers
     WHERE qa_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
    [qaEngineerId, projectId],
  );
  return parseInt(statusResult.rows[0].count) > 0;
}

/* ---------------- SUBMIT QUALITY REVIEW ---------------- */
router.post("/:taskId/quality-review", qaEngineerCheck, async (req, res) => {
  try {
    const qaEngineerId = req.user.id;
    const { taskId } = req.params;
    const { rating, remarks } = req.body;

    // Validate rating
    if (rating === undefined) {
      return res.status(400).json({ error: "rating is required" });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
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
        .json({ error: "Task must be COMPLETED to submit quality review" });
    }

    // Check if QA is APPROVED in project
    const isApproved = await qaProjectStatusCheck(qaEngineerId, projectId);

    if (!isApproved) {
      return res.status(403).json({
        error: "Access denied. Not an approved QA Engineer in this project.",
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

    // Check if review already exists
    const existingReview = await pool.query(
      `SELECT id FROM task_quality_reviews WHERE task_id = $1`,
      [taskId],
    );

    if (existingReview.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Quality review already submitted for this task" });
    }

    // Insert review
    const result = await pool.query(
      `INSERT INTO task_quality_reviews (task_id, subcontractor_id, rating, remarks, reviewed_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [taskId, subcontractorId, rating, remarks || null, qaEngineerId],
    );

    // Audit log
    const organizationId = await getOrganizationIdFromProject(projectId);
    await logAudit({
      entityType: "TASK_QUALITY_REVIEW",
      entityId: result.rows[0].id,
      category: "SUBCONTRACTOR",
      action: "CREATE",
      before: null,
      after: result.rows[0],
      user: req.user,
      projectId: projectId,
      organizationId,
    });

    res.status(201).json({ quality_review: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ error: "Quality review already submitted for this task" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET QUALITY REVIEW ---------------- */
router.get("/:taskId/quality-review", qaEngineerCheck, async (req, res) => {
  try {
    const qaEngineerId = req.user.id;
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

    // Check if QA is APPROVED in project
    const isApproved = await qaProjectStatusCheck(qaEngineerId, projectId);

    if (!isApproved) {
      return res.status(403).json({
        error: "Access denied. Not an approved QA Engineer in this project.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM task_quality_reviews WHERE task_id = $1`,
      [taskId],
    );

    res.json({ quality_review: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
