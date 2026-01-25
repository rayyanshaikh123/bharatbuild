const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

// Helper: Get organization IDs where manager is APPROVED
async function getManagerOrgIds(managerId) {
  const result = await pool.query(
    `SELECT org_id FROM organization_managers WHERE manager_id = $1 AND status = 'APPROVED'`,
    [managerId],
  );
  return result.rows.map((r) => r.org_id);
}

// Check if manager is ACTIVE in the project or creator
async function managerProjectStatusCheck(managerId, projectId) {
  const isActive = await pool.query(
    `SELECT count(*) FROM project_managers
     WHERE manager_id = $1 AND project_id = $2 AND status = 'ACTIVE'`,
    [managerId, projectId],
  );
  const isCreator = await pool.query(
    `SELECT count(*) FROM projects WHERE id = $1 AND created_by = $2`,
    [projectId, managerId],
  );
  return (
    parseInt(isActive.rows[0].count) > 0 ||
    parseInt(isCreator.rows[0].count) > 0
  );
}

/* ---------------- GET PENDING QA ENGINEERS FOR ORGANIZATION ---------------- */
router.get("/organization-pending", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;

    // Get manager's organizations
    const orgIds = await getManagerOrgIds(managerId);

    if (orgIds.length === 0) {
      return res.json({ pending_engineers: [] });
    }

    const result = await pool.query(
      `SELECT oqa.*, qa.name, qa.email, qa.phone, o.name AS organization_name
       FROM organization_qa_engineers oqa
       JOIN qa_engineers qa ON oqa.qa_engineer_id = qa.id
       JOIN organizations o ON oqa.org_id = o.id
       WHERE oqa.org_id = ANY($1) AND oqa.status = 'PENDING'
       ORDER BY oqa.created_at DESC`,
      [orgIds],
    );

    res.json({ pending_engineers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- APPROVE/REJECT QA ENGINEER FOR ORGANIZATION ---------------- */
router.patch("/organization/:requestId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { requestId } = req.params;
    const { action } = req.body; // 'APPROVE' or 'REJECT'

    if (!action || !["APPROVE", "REJECT"].includes(action.toUpperCase())) {
      return res
        .status(400)
        .json({ error: "action must be APPROVE or REJECT" });
    }

    // Get the request
    const requestResult = await pool.query(
      `SELECT * FROM organization_qa_engineers WHERE id = $1`,
      [requestId],
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    const request = requestResult.rows[0];

    // Verify manager has access to this organization
    const orgIds = await getManagerOrgIds(managerId);
    if (!orgIds.includes(request.org_id)) {
      return res
        .status(403)
        .json({ error: "Not authorized for this organization" });
    }

    // Update status
    const newStatus =
      action.toUpperCase() === "APPROVE" ? "APPROVED" : "REJECTED";
    const result = await pool.query(
      `UPDATE organization_qa_engineers 
       SET status = $1, approved_by = $2, approved_at = NOW()
       WHERE id = $3 RETURNING *`,
      [newStatus, managerId, requestId],
    );

    res.json({ request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- ASSIGN QA ENGINEER TO PROJECT ---------------- */
router.post("/project/:projectId/assign", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;
    const { qa_engineer_id } = req.body;

    if (!qa_engineer_id) {
      return res.status(400).json({ error: "qa_engineer_id is required" });
    }

    // Check manager has access to project
    const hasAccess = await managerProjectStatusCheck(managerId, projectId);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "Not an active manager in this project" });
    }

    // Verify QA engineer exists and is approved in the org
    const projectOrgResult = await pool.query(
      `SELECT org_id FROM projects WHERE id = $1`,
      [projectId],
    );

    if (projectOrgResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const orgId = projectOrgResult.rows[0].org_id;

    const qaOrgCheck = await pool.query(
      `SELECT id FROM organization_qa_engineers 
       WHERE qa_engineer_id = $1 AND org_id = $2 AND status = 'APPROVED'`,
      [qa_engineer_id, orgId],
    );

    if (qaOrgCheck.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "QA Engineer not approved in this organization" });
    }

    // Check if already assigned
    const existingAssignment = await pool.query(
      `SELECT id FROM project_qa_engineers WHERE project_id = $1 AND qa_engineer_id = $2`,
      [projectId, qa_engineer_id],
    );

    if (existingAssignment.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "QA Engineer already assigned to this project" });
    }

    // Assign directly as APPROVED
    const result = await pool.query(
      `INSERT INTO project_qa_engineers (project_id, qa_engineer_id, status)
       VALUES ($1, $2, 'APPROVED') RETURNING *`,
      [projectId, qa_engineer_id],
    );

    res.status(201).json({ assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ error: "QA Engineer already assigned to this project" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET QA ENGINEERS FOR PROJECT ---------------- */
router.get("/project/:projectId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;

    // Check manager has access to project
    const hasAccess = await managerProjectStatusCheck(managerId, projectId);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "Not an active manager in this project" });
    }

    const result = await pool.query(
      `SELECT pqa.*, qa.name, qa.email, qa.phone
       FROM project_qa_engineers pqa
       JOIN qa_engineers qa ON pqa.qa_engineer_id = qa.id
       WHERE pqa.project_id = $1
       ORDER BY pqa.assigned_at DESC`,
      [projectId],
    );

    res.json({ qa_engineers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- REMOVE QA ENGINEER FROM PROJECT ---------------- */
router.delete(
  "/project/:projectId/:qaEngineerId",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId, qaEngineerId } = req.params;

      // Check manager has access to project
      const hasAccess = await managerProjectStatusCheck(managerId, projectId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ error: "Not an active manager in this project" });
      }

      const result = await pool.query(
        `DELETE FROM project_qa_engineers WHERE project_id = $1 AND qa_engineer_id = $2 RETURNING *`,
        [projectId, qaEngineerId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      res.json({ message: "QA Engineer removed from project" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET PENDING QA PROJECT REQUESTS ---------------- */
router.get("/project-requests", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;

    // Get projects where manager is active or creator
    const projectsResult = await pool.query(
      `SELECT DISTINCT p.id 
       FROM projects p
       LEFT JOIN project_managers pm ON p.id = pm.project_id
       WHERE (pm.manager_id = $1 AND pm.status = 'ACTIVE') OR p.created_by = $1`,
      [managerId],
    );

    const projectIds = projectsResult.rows.map((r) => r.id);

    if (projectIds.length === 0) {
      return res.json({ requests: [] });
    }

    const result = await pool.query(
      `SELECT pqa.id AS request_id, pqa.*, 
              qa.name, qa.email, qa.phone, 
              p.name AS project_name, p.org_id
       FROM project_qa_engineers pqa
       JOIN qa_engineers qa ON pqa.qa_engineer_id = qa.id
       JOIN projects p ON pqa.project_id = p.id
       WHERE pqa.project_id = ANY($1) AND pqa.status = 'PENDING'
       ORDER BY pqa.assigned_at DESC`,
      [projectIds],
    );

    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- APPROVE/REJECT QA PROJECT REQUEST ---------------- */
router.patch("/project-requests/:requestId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { requestId } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return res
        .status(400)
        .json({ error: "status must be APPROVED or REJECTED" });
    }

    // Get the request
    const requestResult = await pool.query(
      `SELECT pqa.*, p.id AS project_id, p.org_id 
       FROM project_qa_engineers pqa
       JOIN projects p ON pqa.project_id = p.id
       WHERE pqa.id = $1`,
      [requestId],
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    const request = requestResult.rows[0];

    // Verify manager has access to this project
    const hasAccess = await managerProjectStatusCheck(
      managerId,
      request.project_id,
    );
    if (!hasAccess) {
      return res.status(403).json({ error: "Not authorized for this project" });
    }

    // Update status
    const result = await pool.query(
      `UPDATE project_qa_engineers 
       SET status = $1
       WHERE id = $2 RETURNING *`,
      [status, requestId],
    );

    // Log to audit
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, remarks)
       VALUES ('PROJECT_QA_REQUEST', $1, $2, 'MANAGER', $3, $4, $5, $6)`,
      [
        requestId,
        status === "APPROVED" ? "QA_PROJECT_APPROVED" : "QA_PROJECT_REJECTED",
        managerId,
        request.project_id,
        request.org_id,
        `Manager ${status.toLowerCase()} QA Engineer project request`,
      ],
    );

    res.json({
      request: result.rows[0],
      message: `Request ${status.toLowerCase()} successfully`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
