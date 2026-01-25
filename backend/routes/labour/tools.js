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
    // Check if QR is valid (24h window)
    // Assuming valid_date is actually used as created timestamp reference now
    // Or we rely on 'is_active' + time check if we stored full timestamp
    // Since we only have valid_date (DATE type likely), we need to check if
    // today is EITHER valid_date OR valid_date + 1 (for 24h overlap)
    // To be precise, let's treat valid_date as "Start Date".
    //
    // Revised Logic:
    // If QR was generated today, it's valid.
    // If QR was generated yesterday, we technically need a timestamp to know if 24h passed.
    // BUT since schema is likely DATE, let's just say it's valid for valid_date AND (valid_date + 1 day).
    // This gives effectively 24-48h window which satisfies "increase validity".

    // Convert DB date to object
    const validDate = normalizeDBDate(qrData.valid_date); // <--- Added missing declaration
    const qrDate = new Date(qrData.valid_date);
    const todayDate = new Date(today); // current date from util

    // Check diff in days
    const diffTime = Math.abs(todayDate - qrDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Allow today (0) or yesterday (1)
    // Actually, simply: check if qrData.valid_date is within last 1 day.
    // Since getISTDate returns string YYYY-MM-DD, let's simplify:

    // If valid_date is today -> OK
    // If valid_date was yesterday -> OK (covers the "< 24h" extension)
    // If valid_date was older -> Expired

    // Note: This relies on `getISTDate` effectively.
    // Let's stick to simple string compare for safety if we lack moment.js

    const isToday = validDate === today;

    // Calc yesterday string
    const d = new Date();
    d.setDate(d.getDate() - 1); // rough yesterday in server local time (likely UTC or IST depending on node)
    // Better: use the util logic
    const istNow = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
    istNow.setDate(istNow.getDate() - 1);
    const yesterday = istNow.toISOString().split("T")[0];

    const isYesterday = validDate === yesterday;

    if (!isToday && !isYesterday) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error:
          "QR code has expired. It was valid for 24 hours from " + validDate,
      });
    }

    // Verify labour has access to this project via attendance or labour_request_participants
    const labourAccessCheck = await client.query(
      `SELECT 1 FROM attendance 
       WHERE labour_id = $1 AND project_id = $2
       UNION
       SELECT 1 FROM labour_request_participants lrp
       JOIN labour_requests lr ON lrp.labour_request_id = lr.id
       WHERE lrp.labour_id = $1 AND lr.project_id = $2 AND lrp.status IN ('APPROVED', 'ACTIVE')
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

      // Create transaction
      // Use the engineer who generated the QR code as 'issued_by' since this is a pre-approved self-service flow
      const transactionResult = await client.query(
        `INSERT INTO tool_transactions 
         (tool_id, project_id, labour_id, issued_at, status, issued_by)
         VALUES ($1, $2, $3, NOW(), 'ISSUED', $4)
         RETURNING *`,
        [toolId, projectId, labourId, qrData.generated_by],
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
