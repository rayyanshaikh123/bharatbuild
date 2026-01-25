const express = require("express");
const router = express.Router();
const pool = require("../../db");
const engineerCheck = require("../../middleware/engineerCheck");
const { verifyEngineerAccess } = require("../../util/engineerPermissions");
const bcrypt = require("bcrypt");

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

    console.log(
      `[DangerousTask] Creating task for Engineer: ${engineerId}, Project: ${projectId}`,
    );

    // Verify engineer is assigned to this project using unified utility
    const access = await verifyEngineerAccess(engineerId, projectId);

    console.log(`[DangerousTask] Access result: ${JSON.stringify(access)}`);

    if (!access.allowed) {
      console.warn(`[DangerousTask] Access denied: ${access.error}`);
      await client.query("ROLLBACK");
      return res.status(403).json({ error: access.error });
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

    console.log(
      `[DangerousTask] Fetching tasks for Project: ${projectId}, Engineer: ${engineerId}`,
    );

    // Verify engineer is assigned to this project using unified utility
    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) {
      console.warn(`[DangerousTask] GET Access denied: ${access.error}`);
      return res.status(403).json({ error: access.error });
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

    // Get existing task
    const taskInfo = await client.query(
      `SELECT dt.id, dt.project_id FROM dangerous_tasks dt WHERE dt.id = $1`,
      [id],
    );

    if (taskInfo.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Dangerous task not found" });
    }

    const task = taskInfo.rows[0];

    // Verify engineer has access to the project this task belongs to
    const access = await verifyEngineerAccess(engineerId, task.project_id);
    if (!access.allowed) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: access.error });
    }

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
    const { projectId, status } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    console.log(
      `[DangerousTask] Fetching requests for Project: ${projectId}, Engineer: ${engineerId}`,
    );

    // Verify engineer is assigned to this project using unified utility
    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) {
      console.warn(`[DangerousTask] Requests Access denied: ${access.error}`);
      return res.status(403).json({ error: access.error });
    }

    // Get all task requests for this project with optional status filter
    let query = `
      SELECT dtr.id, dtr.dangerous_task_id, dtr.labour_id, dtr.project_id,
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
    `;

    const params = [projectId];
    if (status) {
      query += " AND dtr.status = $2";
      params.push(status);
    }

    query += " ORDER BY dtr.requested_at DESC";

    const result = await pool.query(query, params);
    res.json({ task_requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------- AUTHORIZE TASK REQUEST (VERIFY OTP) -------------------- */
router.post("/authorize", engineerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const engineerId = req.user.id;
    const { requestId, otp } = req.body;

    if (!requestId || !otp) {
      return res.status(400).json({ error: "requestId and otp are required" });
    }

    await client.query("BEGIN");

    // 1. Get request details
    const requestCheck = await client.query(
      `SELECT dtr.id, dtr.project_id, dtr.status, dt.name AS task_name, l.name AS labour_name
       FROM dangerous_task_requests dtr
       JOIN dangerous_tasks dt ON dtr.dangerous_task_id = dt.id
       JOIN labours l ON dtr.labour_id = l.id
       WHERE dtr.id = $1`,
      [requestId],
    );

    if (requestCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Task request not found" });
    }

    const request = requestCheck.rows[0];

    // 2. Verify engineer is assigned to this project
    const access = await verifyEngineerAccess(engineerId, request.project_id);
    if (!access.allowed) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: access.error });
    }

    if (request.status !== "REQUESTED") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: `Cannot authorize. Status is ${request.status}` });
    }

    // 3. Get latest OTP
    const otpCheck = await client.query(
      `SELECT id, otp_hash, expires_at, verified
       FROM dangerous_task_otps
       WHERE task_request_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [requestId],
    );

    if (otpCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "No OTP found for this request" });
    }

    const otpRecord = otpCheck.rows[0];

    if (otpRecord.verified) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "OTP already used" });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "OTP has expired" });
    }

    // 4. Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);
    if (!isValid) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // 5. APPROVE request
    await client.query(
      `UPDATE dangerous_task_requests
       SET status = 'APPROVED', approved_at = NOW(), approved_by = $1, approval_method = 'OTP'
       WHERE id = $2`,
      [engineerId, requestId],
    );

    await client.query(
      `UPDATE dangerous_task_otps SET verified = true, verified_at = NOW() WHERE id = $1`,
      [otpRecord.id],
    );

    // Audit Log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "DANGEROUS_TASK_REQUEST",
        requestId,
        "APPROVED",
        "SITE_ENGINEER",
        engineerId,
        request.project_id,
        "SAFETY",
        JSON.stringify({
          task_name: request.task_name,
          labour_name: request.labour_name,
          approval_method: "OTP",
        }),
      ],
    );

    await client.query("COMMIT");
    res.json({ message: "Authorization successful", status: "APPROVED" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
