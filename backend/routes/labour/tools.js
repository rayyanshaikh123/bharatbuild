const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");
const { getISTDate, normalizeDBDate } = require("../../util/dateUtils");

/* ---------------- SCAN QR CODE (ISSUE/RETURN TOOL) ---------------- */
router.post("/scan", labourCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const labourId = req.user.id;
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({
        error: "qrToken is required",
      });
    }

    const today = getISTDate(); // YYYY-MM-DD in IST

    await client.query("BEGIN");

    // Validate QR code and get tool details
    const qrCheck = await client.query(
      `SELECT qr.*, t.*, p.org_id
       FROM tool_qr_codes qr
       JOIN project_tools t ON qr.tool_id = t.id
       JOIN projects p ON qr.project_id = p.id
       WHERE qr.qr_token = $1 AND qr.is_active = true`,
      [qrToken],
    );

    if (qrCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Invalid or inactive QR code",
      });
    }

    const qrData = qrCheck.rows[0];
    const toolId = qrData.tool_id;
    const projectId = qrData.project_id;
    const orgId = qrData.org_id;

    // Check if QR is valid for today
    const validDate = normalizeDBDate(qrData.valid_date);
    if (validDate !== today) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "QR code has expired. This QR is only valid for " + validDate,
      });
    }

    // Verify labour has access to this project via attendance or labour_request
    const labourAccessCheck = await client.query(
      `SELECT 1 FROM attendance 
       WHERE labour_id = $1 AND project_id = $2
       UNION
       SELECT 1 FROM labour_request 
       WHERE labour_id = $1 AND project_id = $2 AND status = 'APPROVED'
       LIMIT 1`,
      [labourId, projectId],
    );

    if (labourAccessCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    // Check for active transaction (issued but not returned)
    const activeTransactionCheck = await client.query(
      `SELECT * FROM tool_transactions 
       WHERE tool_id = $1 AND returned_at IS NULL`,
      [toolId],
    );

    // CASE 1: No active transaction - ISSUE the tool
    if (activeTransactionCheck.rows.length === 0) {
      // Verify tool is available
      if (qrData.status !== "AVAILABLE") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Tool is currently ${qrData.status} and cannot be issued`,
        });
      }

      // Create transaction (issued_by is NULL for labour self-service)
      const transactionResult = await client.query(
        `INSERT INTO tool_transactions 
         (tool_id, project_id, labour_id, issued_at, status)
         VALUES ($1, $2, $3, NOW(), 'ISSUED')
         RETURNING *`,
        [toolId, projectId, labourId],
      );

      const transaction = transactionResult.rows[0];

      // Update tool status to ISSUED
      await client.query(
        `UPDATE project_tools SET status = 'ISSUED' WHERE id = $1`,
        [toolId],
      );

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs 
         (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category, change_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          "TOOL_TRANSACTION",
          transaction.id,
          "TOOL_ISSUED",
          "LABOUR",
          labourId,
          projectId,
          orgId,
          "TOOL_MANAGEMENT",
          JSON.stringify({
            tool_id: toolId,
            tool_code: qrData.tool_code,
            tool_name: qrData.name,
            issued_via: "QR_SCAN",
          }),
        ],
      );

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Tool issued successfully",
        action: "ISSUED",
        transaction: transaction,
        tool: {
          id: toolId,
          name: qrData.name,
          tool_code: qrData.tool_code,
        },
      });
    }

    // CASE 2: Active transaction exists
    const activeTransaction = activeTransactionCheck.rows[0];

    // Check if transaction belongs to this labour
    if (activeTransaction.labour_id !== labourId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error:
          "This tool is currently issued to another labour. Only the issued labour can return it.",
      });
    }

    // RETURN the tool
    const updatedTransaction = await client.query(
      `UPDATE tool_transactions 
       SET returned_at = NOW(), status = 'RETURNED'
       WHERE id = $1
       RETURNING *`,
      [activeTransaction.id],
    );

    // Update tool status to AVAILABLE
    await client.query(
      `UPDATE project_tools SET status = 'AVAILABLE' WHERE id = $1`,
      [toolId],
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        "TOOL_TRANSACTION",
        activeTransaction.id,
        "TOOL_RETURNED",
        "LABOUR",
        labourId,
        projectId,
        orgId,
        "TOOL_MANAGEMENT",
        JSON.stringify({
          tool_id: toolId,
          tool_code: qrData.tool_code,
          tool_name: qrData.name,
          issued_at: activeTransaction.issued_at,
          returned_via: "QR_SCAN",
        }),
      ],
    );

    await client.query("COMMIT");

    res.json({
      message: "Tool returned successfully",
      action: "RETURNED",
      transaction: updatedTransaction.rows[0],
      tool: {
        id: toolId,
        name: qrData.name,
        tool_code: qrData.tool_code,
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

/* ---------------- GET MY ISSUED TOOLS ---------------- */
router.get("/my-tools", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;

    const result = await pool.query(
      `SELECT tt.*, t.name AS tool_name, t.tool_code, t.description,
              p.name AS project_name
       FROM tool_transactions tt
       JOIN project_tools t ON tt.tool_id = t.id
       JOIN projects p ON tt.project_id = p.id
       WHERE tt.labour_id = $1 AND tt.returned_at IS NULL
       ORDER BY tt.issued_at DESC`,
      [labourId],
    );

    res.json({
      tools: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET MY TOOL HISTORY ---------------- */
router.get("/my-history", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const { projectId, status } = req.query;

    let query = `
      SELECT tt.*, t.name AS tool_name, t.tool_code, t.description,
             p.name AS project_name,
             issued_by_se.name AS issued_by_name,
             returned_by_se.name AS returned_by_name
      FROM tool_transactions tt
      JOIN project_tools t ON tt.tool_id = t.id
      JOIN projects p ON tt.project_id = p.id
      LEFT JOIN site_engineers issued_by_se ON tt.issued_by = issued_by_se.id
      LEFT JOIN site_engineers returned_by_se ON tt.returned_by = returned_by_se.id
      WHERE tt.labour_id = $1
    `;

    const params = [labourId];
    let paramCount = 1;

    if (projectId) {
      paramCount++;
      query += ` AND tt.project_id = $${paramCount}`;
      params.push(projectId);
    }

    if (status) {
      paramCount++;
      query += ` AND tt.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY tt.issued_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      transactions: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
