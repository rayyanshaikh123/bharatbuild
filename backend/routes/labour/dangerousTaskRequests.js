const express = require("express");
const router = express.Router();
const pool = require("../../db");
const labourCheck = require("../../middleware/labourCheck");
const bcrypt = require("bcrypt");

/* ============================================================
   DANGEROUS TASK REQUESTS (LABOUR)
   ============================================================
   Purpose: Labour requests authorization to perform dangerous tasks
   Safety: Must obtain OTP from Site Engineer, cannot self-approve
   ============================================================ */

/* -------------------- CREATE TASK REQUEST -------------------- */
router.post("/", labourCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const labourId = req.user.id;
    const { dangerousTaskId, projectId } = req.body;

    // Validate required fields
    if (!dangerousTaskId || !projectId) {
      return res
        .status(400)
        .json({ error: "dangerousTaskId and projectId are required" });
    }

    await client.query("BEGIN");

    console.log(
      `[DangerousTaskReq] Checking assignment for Labour: ${labourId}, Project: ${projectId}`,
    );

    // Verify labour is assigned to this project via labour_request_participants
    const labourProjectCheck = await client.query(
      `SELECT lrp.id, lrp.status 
       FROM labour_request_participants lrp
       JOIN labour_requests lr ON lrp.labour_request_id = lr.id
       WHERE lr.project_id = $1 AND lrp.labour_id = $2`,
      [projectId, labourId],
    );

    console.log(
      `[DangerousTaskReq] Found ${labourProjectCheck.rows.length} assignment records.`,
    );
    if (labourProjectCheck.rows.length > 0) {
      console.log(
        `[DangerousTaskReq] First record status: ${labourProjectCheck.rows[0].status}`,
      );
    }

    const authorizedRecord = labourProjectCheck.rows.find((r) =>
      ["APPROVED", "ACTIVE", "PENDING"].includes(r.status),
    );

    if (!authorizedRecord) {
      await client.query("ROLLBACK");
      console.warn(
        `[DangerousTaskReq] Access denied. No APPROVED/ACTIVE/PENDING record found.`,
      );
      return res
        .status(403)
        .json({ error: "You are not assigned to this project" });
    }

    // Verify dangerous task exists and is active
    const taskCheck = await client.query(
      `SELECT id, name, is_active, project_id
       FROM dangerous_tasks
       WHERE id = $1 AND project_id = $2`,
      [dangerousTaskId, projectId],
    );

    if (taskCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Dangerous task not found" });
    }

    const task = taskCheck.rows[0];

    if (!task.is_active) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error:
          "This dangerous task is currently inactive and cannot be requested",
      });
    }

    // Create task request
    const result = await client.query(
      `INSERT INTO dangerous_task_requests 
       (dangerous_task_id, labour_id, project_id, status)
       VALUES ($1, $2, $3, 'REQUESTED')
       RETURNING id, dangerous_task_id, labour_id, project_id, status, requested_at`,
      [dangerousTaskId, labourId, projectId],
    );

    const taskRequest = result.rows[0];

    // Audit log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "DANGEROUS_TASK_REQUEST",
        taskRequest.id,
        "REQUESTED",
        "LABOUR",
        labourId,
        projectId,
        "SAFETY",
        JSON.stringify({
          task_name: task.name,
          task_id: dangerousTaskId,
        }),
      ],
    );

    await client.query("COMMIT");

    res.status(201).json({
      message:
        "Task request created successfully. Request OTP from Site Engineer.",
      task_request: {
        ...taskRequest,
        task_name: task.name,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* -------------------- GET MY TASK REQUESTS -------------------- */
router.get("/my", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const { projectId, status } = req.query;

    let query = `
      SELECT dtr.id, dtr.dangerous_task_id, dtr.labour_id, dtr.project_id,
             dtr.status, dtr.requested_at, dtr.approved_at, dtr.approved_by,
             dtr.approval_method,
             dt.name AS task_name,
             dt.description AS task_description,
             p.name AS project_name,
             se.name AS approved_by_name
      FROM dangerous_task_requests dtr
      JOIN dangerous_tasks dt ON dtr.dangerous_task_id = dt.id
      JOIN projects p ON dtr.project_id = p.id
      LEFT JOIN site_engineers se ON dtr.approved_by = se.id
      WHERE dtr.labour_id = $1
    `;

    const params = [labourId];
    let paramIndex = 2;

    if (projectId) {
      query += ` AND dtr.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    if (status) {
      query += ` AND dtr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY dtr.requested_at DESC`;

    const result = await pool.query(query, params);

    res.json({ task_requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------- GENERATE OTP (LABOUR INITIATES) -------------------- */
router.post("/:id/generate-otp", labourCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const labourId = req.user.id;
    const { id } = req.params;

    await client.query("BEGIN");

    // Verify task request exists and belongs to this labour
    const requestCheck = await client.query(
      `SELECT dtr.id, dtr.dangerous_task_id, dtr.project_id, dtr.status,
              dt.name AS task_name,
              dt.is_active
       FROM dangerous_task_requests dtr
       JOIN dangerous_tasks dt ON dtr.dangerous_task_id = dt.id
       WHERE dtr.id = $1 AND dtr.labour_id = $2`,
      [id, labourId],
    );

    if (requestCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Task request not found or access denied" });
    }

    const request = requestCheck.rows[0];

    // Verify task is still active
    if (!request.is_active) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "This dangerous task has been deactivated",
      });
    }

    // Verify status is REQUESTED
    if (request.status !== "REQUESTED") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Cannot generate OTP. Request status is ${request.status}`,
      });
    }

    // Check if OTP already exists and is not expired
    const existingOtpCheck = await client.query(
      `SELECT id, expires_at, verified
       FROM dangerous_task_otps
       WHERE task_request_id = $1 AND verified = false
       ORDER BY created_at DESC
       LIMIT 1`,
      [id],
    );

    if (existingOtpCheck.rows.length > 0) {
      const existingOtp = existingOtpCheck.rows[0];
      if (new Date(existingOtp.expires_at) > new Date()) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error:
            "An OTP is already active for this request. Please use it or wait for expiry.",
          expires_at: existingOtp.expires_at,
        });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP
    await client.query(
      `INSERT INTO dangerous_task_otps 
       (task_request_id, otp_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [id, otpHash, expiresAt],
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "DANGEROUS_TASK_REQUEST",
        id,
        "OTP_GENERATED",
        "LABOUR",
        labourId,
        request.project_id,
        "SAFETY",
        JSON.stringify({
          task_name: request.task_name,
          expires_at: expiresAt,
        }),
      ],
    );

    await client.query("COMMIT");

    // In production, this OTP should be sent/shown to Site Engineer
    // For now, return it in response (REMOVE IN PRODUCTION)
    res.json({
      message: "OTP generated successfully. Show this to Site Engineer.",
      otp: otp, // ⚠️ REMOVE IN PRODUCTION - send to engineer via SMS/notification
      expires_at: expiresAt,
      task_request_id: id,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* -------------------- VERIFY OTP (LABOUR SUBMITS) -------------------- */
router.post("/:id/verify-otp", labourCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const labourId = req.user.id;
    const { id } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ error: "OTP is required" });
    }

    await client.query("BEGIN");

    // Verify task request exists and belongs to this labour
    const requestCheck = await client.query(
      `SELECT dtr.id, dtr.dangerous_task_id, dtr.project_id, dtr.status,
              dt.name AS task_name,
              dt.created_by AS engineer_id
       FROM dangerous_task_requests dtr
       JOIN dangerous_tasks dt ON dtr.dangerous_task_id = dt.id
       WHERE dtr.id = $1 AND dtr.labour_id = $2`,
      [id, labourId],
    );

    if (requestCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Task request not found or access denied" });
    }

    const request = requestCheck.rows[0];

    // Verify status is REQUESTED
    if (request.status !== "REQUESTED") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Cannot verify OTP. Request status is ${request.status}`,
      });
    }

    // Get latest OTP for this request
    const otpCheck = await client.query(
      `SELECT id, otp_hash, expires_at, verified
       FROM dangerous_task_otps
       WHERE task_request_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [id],
    );

    if (otpCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "No OTP found. Generate OTP first.",
      });
    }

    const otpRecord = otpCheck.rows[0];

    // Check if OTP already used
    if (otpRecord.verified) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "OTP already used. Generate a new OTP if needed.",
      });
    }

    // Check if OTP expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Mark request as EXPIRED
      await client.query(
        `UPDATE dangerous_task_requests
         SET status = 'EXPIRED'
         WHERE id = $1`,
        [id],
      );

      await client.query(
        `INSERT INTO audit_logs 
         (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, category, change_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          "DANGEROUS_TASK_REQUEST",
          id,
          "EXPIRED",
          "LABOUR",
          labourId,
          request.project_id,
          "SAFETY",
          JSON.stringify({
            task_name: request.task_name,
            reason: "OTP expired",
          }),
        ],
      );

      await client.query("COMMIT");
      return res.status(400).json({
        error: "OTP expired. Request marked as EXPIRED. Create a new request.",
      });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

    if (!isValid) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Invalid OTP",
      });
    }

    // OTP is valid - APPROVE the request
    await client.query(
      `UPDATE dangerous_task_requests
       SET status = 'APPROVED', 
           approved_at = NOW(),
           approved_by = $1,
           approval_method = 'OTP'
       WHERE id = $2`,
      [request.engineer_id, id],
    );

    // Mark OTP as verified
    await client.query(
      `UPDATE dangerous_task_otps
       SET verified = true, verified_at = NOW()
       WHERE id = $1`,
      [otpRecord.id],
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "DANGEROUS_TASK_REQUEST",
        id,
        "APPROVED",
        "LABOUR",
        labourId,
        request.project_id,
        "SAFETY",
        JSON.stringify({
          task_name: request.task_name,
          approval_method: "OTP",
          approved_by: request.engineer_id,
        }),
      ],
    );

    await client.query("COMMIT");

    res.json({
      message:
        "Task approved successfully. You may now proceed with the dangerous task.",
      task_request: {
        id: id,
        status: "APPROVED",
        task_name: request.task_name,
        approved_at: new Date(),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* -------------------- GET AVAILABLE DANGEROUS TASKS -------------------- */
router.get("/available-tasks", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    console.log(
      `[DangerousTaskReq] GET Tasks - Checking assignment for Labour: ${labourId}, Project: ${projectId}`,
    );

    // Verify labour is assigned to this project via labour_request_participants
    const labourProjectCheck = await pool.query(
      `SELECT lrp.id, lrp.status 
       FROM labour_request_participants lrp
       JOIN labour_requests lr ON lrp.labour_request_id = lr.id
       WHERE lr.project_id = $1 AND lrp.labour_id = $2`,
      [projectId, labourId],
    );

    console.log(
      `[DangerousTaskReq] GET Tasks - Found ${labourProjectCheck.rows.length} records.`,
    );
    if (labourProjectCheck.rows.length > 0) {
      console.log(
        `[DangerousTaskReq] GET Tasks - First record status: ${labourProjectCheck.rows[0].status}`,
      );
    }

    const authorizedRecord = labourProjectCheck.rows.find((r) =>
      ["APPROVED", "ACTIVE", "PENDING"].includes(r.status),
    );

    if (!authorizedRecord) {
      console.warn(
        `[DangerousTaskReq] GET Tasks - Access denied. No APPROVED/ACTIVE/PENDING record found.`,
      );
      return res
        .status(403)
        .json({ error: "You are not assigned to this project" });
    }

    // Get all active dangerous tasks for this project
    const result = await pool.query(
      `SELECT dt.id, dt.name, dt.description, dt.created_at,
              se.name AS created_by_name
       FROM dangerous_tasks dt
       JOIN site_engineers se ON dt.created_by = se.id
       WHERE dt.project_id = $1 AND dt.is_active = true
       ORDER BY dt.name ASC`,
      [projectId],
    );

    res.json({ dangerous_tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
