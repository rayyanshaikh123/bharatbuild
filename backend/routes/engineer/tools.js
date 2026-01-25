const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const crypto = require("crypto");
const { getISTDate } = require("../../util/dateUtils");

/* ---------------- CREATE TOOL ---------------- */
router.post("/", engineerCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const engineerId = req.user.id;
    const { projectId, name, toolCode, description } = req.body;

    // Validate required fields
    if (!projectId || !name || !toolCode) {
      return res.status(400).json({
        error: "Missing required fields: projectId, name, toolCode",
      });
    }

    await client.query("BEGIN");

    // Verify engineer has access to this project
    const accessCheck = await client.query(
      `SELECT id FROM project_site_engineers 
       WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [engineerId, projectId],
    );

    if (accessCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    // Check if tool_code already exists
    const codeCheck = await client.query(
      `SELECT id FROM project_tools WHERE tool_code = $1`,
      [toolCode],
    );

    if (codeCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Tool code already exists. Please use a unique code.",
      });
    }

    // Create tool
    const toolResult = await client.query(
      `INSERT INTO project_tools 
       (project_id, name, tool_code, description, status, created_by)
       VALUES ($1, $2, $3, $4, 'AVAILABLE', $5)
       RETURNING *`,
      [projectId, name, toolCode, description, engineerId],
    );

    const tool = toolResult.rows[0];

    // Get organization ID for audit log
    const orgResult = await client.query(
      `SELECT org_id FROM projects WHERE id = $1`,
      [projectId],
    );
    const orgId = orgResult.rows[0]?.org_id;

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        "TOOL",
        tool.id,
        "TOOL_CREATED",
        "SITE_ENGINEER",
        engineerId,
        projectId,
        orgId,
        "TOOL_MANAGEMENT",
        JSON.stringify({
          tool_code: toolCode,
          name: name,
        }),
      ],
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Tool created successfully",
      tool: tool,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    if (err.constraint === "project_tools_tool_code_key") {
      return res.status(400).json({ error: "Tool code already exists" });
    }

    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GET TOOLS BY PROJECT ---------------- */
router.get("/", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId, status } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: "projectId query parameter is required",
      });
    }

    // Verify engineer has access to this project
    const accessCheck = await pool.query(
      `SELECT id FROM project_site_engineers 
       WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
      [engineerId, projectId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    let query = `
      SELECT t.*, 
             se.name AS created_by_name,
             (SELECT COUNT(*) FROM tool_transactions tt 
              WHERE tt.tool_id = t.id) AS total_transactions,
             (SELECT COUNT(*) FROM tool_transactions tt 
              WHERE tt.tool_id = t.id AND tt.returned_at IS NULL) AS active_transactions
      FROM project_tools t
      JOIN site_engineers se ON t.created_by = se.id
      WHERE t.project_id = $1
    `;

    const params = [projectId];

    if (status) {
      query += ` AND t.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ tools: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE TOOL ---------------- */
router.delete("/:toolId", engineerCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const engineerId = req.user.id;
    const { toolId } = req.params;

    await client.query("BEGIN");

    // Get tool details and verify access
    const toolCheck = await client.query(
      `SELECT t.*, p.org_id
       FROM project_tools t
       JOIN projects p ON t.project_id = p.id
       JOIN project_site_engineers pse ON p.id = pse.project_id
       WHERE t.id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [toolId, engineerId],
    );

    if (toolCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Tool not found or you do not have access",
      });
    }

    const tool = toolCheck.rows[0];

    // Check if tool has active transactions
    const activeCheck = await client.query(
      `SELECT id FROM tool_transactions 
       WHERE tool_id = $1 AND returned_at IS NULL`,
      [toolId],
    );

    if (activeCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error:
          "Cannot delete tool with active transactions. Please return the tool first.",
      });
    }

    // Delete tool (cascades to QR codes and transactions via foreign keys)
    await client.query(`DELETE FROM project_tools WHERE id = $1`, [toolId]);

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        "TOOL",
        toolId,
        "TOOL_DELETED",
        "SITE_ENGINEER",
        engineerId,
        tool.project_id,
        tool.org_id,
        "TOOL_MANAGEMENT",
        JSON.stringify({
          tool_code: tool.tool_code,
          name: tool.name,
          status: tool.status,
        }),
      ],
    );

    await client.query("COMMIT");

    res.json({
      message: "Tool deleted successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GENERATE QR CODE FOR TOOL ---------------- */
router.post("/:toolId/qr", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { toolId } = req.params;
    const today = getISTDate(); // YYYY-MM-DD in IST

    console.log(
      `[QR Generation] Request for tool ${toolId} by engineer ${engineerId}`,
    );

    // Check if QR already exists for today (fast path - no JOIN needed)
    const existingQR = await pool.query(
      `SELECT * FROM tool_qr_codes 
       WHERE tool_id = $1 AND valid_date = $2`,
      [toolId, today],
    );

    if (existingQR.rows.length > 0) {
      console.log(`[QR Generation] Existing QR found for tool ${toolId}`);
      // Verify access before returning existing QR
      const accessCheck = await pool.query(
        `SELECT 1 FROM project_tools t
         JOIN projects p ON t.project_id = p.id
         JOIN project_site_engineers pse ON p.id = pse.project_id
         WHERE t.id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
        [toolId, engineerId],
      );

      if (accessCheck.rows.length > 0) {
        console.log(`[QR Generation] Returning existing QR for tool ${toolId}`);
        return res.json({
          message: "QR code already exists for today",
          qr: existingQR.rows[0],
        });
      }
    }

    // Verify access and get tool details in one query
    const toolCheck = await pool.query(
      `SELECT t.*, p.org_id
       FROM project_tools t
       JOIN projects p ON t.project_id = p.id
       JOIN project_site_engineers pse ON p.id = pse.project_id
       WHERE t.id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [toolId, engineerId],
    );

    if (toolCheck.rows.length === 0) {
      console.log(`[QR Generation] Access denied for tool ${toolId}`);
      return res.status(404).json({
        error: "Tool not found or you do not have access",
      });
    }

    const tool = toolCheck.rows[0];
    console.log(`[QR Generation] Creating new QR for tool ${toolId}`);

    // Generate unique QR token
    const qrToken = crypto.randomBytes(32).toString("hex");

    // Create QR code (using ON CONFLICT to handle race conditions)
    const qrResult = await pool.query(
      `INSERT INTO tool_qr_codes 
       (tool_id, project_id, qr_token, valid_date, generated_by, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (tool_id, valid_date) 
       DO UPDATE SET qr_token = tool_qr_codes.qr_token
       RETURNING *`,
      [toolId, tool.project_id, qrToken, today, engineerId],
    );

    const qr = qrResult.rows[0];
    console.log(`[QR Generation] QR created successfully: ${qr.id}`);

    // Create audit log asynchronously (don't block response)
    pool
      .query(
        `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          "TOOL_QR",
          qr.id,
          "QR_GENERATED",
          "SITE_ENGINEER",
          engineerId,
          tool.project_id,
          tool.org_id,
          "TOOL_MANAGEMENT",
          JSON.stringify({
            tool_id: toolId,
            tool_code: tool.tool_code,
            valid_date: today,
          }),
        ],
      )
      .catch((err) => {
        console.error("Failed to create audit log for QR generation:", err);
        // Don't block response on audit log failure
      });

    console.log(`[QR Generation] Sending response for tool ${toolId}`);
    res.status(201).json({
      message: "QR code generated successfully",
      qr: qr,
    });
  } catch (err) {
    console.error("[QR Generation] Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

/* ---------------- GET TOOL TRANSACTION HISTORY ---------------- */
router.get("/:toolId/history", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { toolId } = req.params;

    // Verify engineer has access to this tool's project
    const accessCheck = await pool.query(
      `SELECT t.project_id
       FROM project_tools t
       JOIN project_site_engineers pse ON t.project_id = pse.project_id
       WHERE t.id = $1 AND pse.site_engineer_id = $2 AND pse.status = 'APPROVED'`,
      [toolId, engineerId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        error: "Tool not found or you do not have access",
      });
    }

    // Get transaction history
    const result = await pool.query(
      `SELECT tt.*,
              l.name AS labour_name,
              l.phone AS labour_phone,
              issued_by_se.name AS issued_by_name,
              returned_by_se.name AS returned_by_name
       FROM tool_transactions tt
       JOIN labours l ON tt.labour_id = l.id
       LEFT JOIN site_engineers issued_by_se ON tt.issued_by = issued_by_se.id
       LEFT JOIN site_engineers returned_by_se ON tt.returned_by = returned_by_se.id
       WHERE tt.tool_id = $1
       ORDER BY tt.issued_at DESC`,
      [toolId],
    );

    res.json({ transactions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
