const express = require("express");
const router = express.Router();
const pool = require("../../db");
const engineerCheck = require("../../middleware/engineerCheck");

/* ============================================================
   DANGEROUS TASKS MANAGEMENT (SITE ENGINEER)
   ============================================================
   Purpose: Site Engineers define dangerous tasks for their projects
   Safety: Prevent unauthorized task creation, ensure audit trail
   ============================================================ */

/* -------------------- CREATE DANGEROUS TASK -------------------- */
router.post("/", engineerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const engineerId = req.user.id;
    const { projectId, name, description } = req.body;

    // Validate required fields
    if (!projectId || !name) {
      return res.status(400).json({ error: "projectId and name are required" });
    }

    await client.query("BEGIN");

    // Verify engineer is assigned to this project
    const projectCheck = await client.query(
      `SELECT pse.id 
       FROM project_site_engineers pse
       WHERE pse.project_id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [projectId, engineerId],
    );

    if (projectCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ error: "You are not assigned to this project" });
    }

    // Create dangerous task
    const result = await client.query(
      `INSERT INTO dangerous_tasks 
       (project_id, name, description, is_active, created_by, created_by_role)
       VALUES ($1, $2, $3, true, $4, 'SITE_ENGINEER')
       RETURNING id, project_id, name, description, is_active, created_by, created_by_role, created_at`,
      [projectId, name, description || null, engineerId],
    );

    const task = result.rows[0];

    // Audit log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "DANGEROUS_TASK",
        task.id,
        "CREATED",
        "SITE_ENGINEER",
        engineerId,
        projectId,
        "SAFETY",
        JSON.stringify({
          task_name: name,
          description: description,
        }),
      ],
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Dangerous task created successfully",
      dangerous_task: task,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* -------------------- GET DANGEROUS TASKS -------------------- */
router.get("/", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Verify engineer is assigned to this project
    const projectCheck = await pool.query(
      `SELECT pse.id 
       FROM project_site_engineers pse
       WHERE pse.project_id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [projectId, engineerId],
    );

    if (projectCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not assigned to this project" });
    }

    // Get all dangerous tasks for this project
    const result = await pool.query(
      `SELECT dt.id, dt.project_id, dt.name, dt.description, dt.is_active, 
              dt.created_by, dt.created_by_role, dt.created_at,
              se.name AS created_by_name,
              p.name AS project_name
       FROM dangerous_tasks dt
       JOIN site_engineers se ON dt.created_by = se.id
       JOIN projects p ON dt.project_id = p.id
       WHERE dt.project_id = $1
       ORDER BY dt.is_active DESC, dt.created_at DESC`,
      [projectId],
    );

    res.json({ dangerous_tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------- UPDATE DANGEROUS TASK -------------------- */
router.patch("/:id", engineerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const engineerId = req.user.id;
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    await client.query("BEGIN");

    // Get existing task and verify ownership
    const taskCheck = await client.query(
      `SELECT dt.id, dt.project_id, dt.name, dt.is_active
       FROM dangerous_tasks dt
       JOIN project_site_engineers pse ON dt.project_id = pse.project_id
       WHERE dt.id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [id, engineerId],
    );

    if (taskCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Dangerous task not found or access denied" });
    }

    const task = taskCheck.rows[0];

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    if (updates.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id);

    const result = await client.query(
      `UPDATE dangerous_tasks 
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING id, project_id, name, description, is_active, created_by, created_by_role, created_at`,
      values,
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "DANGEROUS_TASK",
        id,
        "UPDATED",
        "SITE_ENGINEER",
        engineerId,
        task.project_id,
        "SAFETY",
        JSON.stringify({
          updated_fields: { name, description, is_active },
        }),
      ],
    );

    await client.query("COMMIT");

    res.json({
      message: "Dangerous task updated successfully",
      dangerous_task: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* -------------------- GET TASK REQUEST HISTORY (ENGINEER VIEW) -------------------- */
router.get("/requests", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Verify engineer is assigned to this project
    const projectCheck = await pool.query(
      `SELECT pse.id 
       FROM project_site_engineers pse
       WHERE pse.project_id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [projectId, engineerId],
    );

    if (projectCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not assigned to this project" });
    }

    // Get all task requests for this project
    const result = await pool.query(
      `SELECT dtr.id, dtr.dangerous_task_id, dtr.labour_id, dtr.project_id,
              dtr.status, dtr.requested_at, dtr.approved_at, dtr.approved_by,
              dtr.approval_method,
              dt.name AS task_name,
              dt.description AS task_description,
              l.name AS labour_name,
              l.phone AS labour_phone,
              ase.name AS approved_by_name
       FROM dangerous_task_requests dtr
       JOIN dangerous_tasks dt ON dtr.dangerous_task_id = dt.id
       JOIN labours l ON dtr.labour_id = l.id
       LEFT JOIN site_engineers ase ON dtr.approved_by = ase.id
       WHERE dtr.project_id = $1
       ORDER BY dtr.requested_at DESC`,
      [projectId],
    );

    res.json({ task_requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
