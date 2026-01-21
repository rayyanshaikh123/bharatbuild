const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");

/* ---------------- LIST MATERIAL REQUESTS ---------------- */
router.get("/requests", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { project_id, status } = req.query;

    let query = `SELECT mr.*, p.name as project_name, e.name as engineer_name
                     FROM material_requests mr
                     JOIN projects p ON mr.project_id = p.id
                     JOIN project_managers pm ON p.id = pm.project_id
                     JOIN site_engineers e ON mr.site_engineer_id = e.id
                     WHERE pm.manager_id = $1 AND pm.status = 'ACTIVE'`;

    let params = [managerId];

    if (project_id) {
      query += " AND mr.project_id = $2";
      params.push(project_id);
    }

    if (status) {
      query += ` AND mr.status = $${params.length + 1}`;
      params.push(status);
    } else {
      query += " AND mr.status = 'PENDING'";
    }

    query += " ORDER BY mr.created_at DESC";
    const result = await pool.query(query, params);
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- REVIEW MATERIAL REQUEST ---------------- */
router.patch("/requests/:id", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { id } = req.params;
    const { status, manager_feedback } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Fetch before state and verify manager has access
    const verifyRes = await pool.query(
      `SELECT mr.* FROM material_requests mr
             JOIN project_managers pm ON mr.project_id = pm.project_id
             WHERE mr.id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
      [id, managerId],
    );

    if (verifyRes.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Access denied or request not found" });
    }

    const beforeState = verifyRes.rows[0];
    const project_id = beforeState.project_id;

    const result = await pool.query(
      `UPDATE material_requests 
             SET status = $1, manager_feedback = $2, reviewed_by = $3, reviewed_at = NOW()
             WHERE id = $4 RETURNING *`,
      [status, manager_feedback, managerId, id],
    );

    const afterState = result.rows[0];

    // Audit log
    const organizationId = await getOrganizationIdFromProject(project_id);
    await logAudit({
      entityType: "MATERIAL_REQUEST",
      entityId: id,
      category: "MATERIAL_REQUEST",
      action: "UPDATE",
      before: beforeState,
      after: afterState,
      user: req.user,
      projectId: project_id,
      organizationId,
    });

    res.json({ request: afterState });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- LIST MATERIAL BILLS ---------------- */
router.get("/bills", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { project_id, status } = req.query;

    let query = `SELECT mb.*, p.name as project_name, e.name as engineer_name
                     FROM material_bills mb
                     JOIN projects p ON mb.project_id = p.id
                     JOIN project_managers pm ON p.id = pm.project_id
                     JOIN site_engineers e ON mb.uploaded_by = e.id
                     WHERE pm.manager_id = $1 AND pm.status = 'ACTIVE'`;

    let params = [managerId];

    if (project_id) {
      query += " AND mb.project_id = $2";
      params.push(project_id);
    }

    if (status) {
      query += ` AND mb.status = $${params.length + 1}`;
      params.push(status);
    } else {
      query += " AND mb.status = 'PENDING'";
    }

    query += " ORDER BY mb.created_at DESC";
    const result = await pool.query(query, params);
    res.json({ bills: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- REVIEW MATERIAL BILL ---------------- */
router.patch("/bills/:id", managerCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const managerId = req.user.id;
    const { id } = req.params;
    const { status, manager_feedback } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Fetch before state and verify manager has access
    const verifyRes = await client.query(
      `SELECT mb.* FROM material_bills mb
             JOIN project_managers pm ON mb.project_id = pm.project_id
             WHERE mb.id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
      [id, managerId],
    );

    if (verifyRes.rows.length === 0) {
      return res.status(403).json({ error: "Access denied or bill not found" });
    }

    const beforeState = verifyRes.rows[0];
    const { project_id, total_amount } = beforeState;

    // Start transaction
    await client.query("BEGIN");

    // Update bill status
    const result = await client.query(
      `UPDATE material_bills 
             SET status = $1, manager_feedback = $2, reviewed_by = $3, reviewed_at = NOW()
             WHERE id = $4 RETURNING *`,
      [status, manager_feedback, managerId, id],
    );

    const afterState = result.rows[0];

    // If approved, update project's current_invested
    if (status === "APPROVED") {
      await client.query(
        `UPDATE projects 
               SET current_invested = current_invested + $1 
               WHERE id = $2`,
        [total_amount, project_id],
      );
    }

    // Audit log (inside transaction)
    const organizationId = await getOrganizationIdFromProject(
      project_id,
      client,
    );
    await logAudit({
      entityType: "MATERIAL_BILL",
      entityId: id,
      category: "MATERIAL_BILL",
      action: "UPDATE",
      before: beforeState,
      after: afterState,
      user: req.user,
      projectId: project_id,
      organizationId,
      client,
    });

    await client.query("COMMIT");

    res.json({ bill: afterState });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
