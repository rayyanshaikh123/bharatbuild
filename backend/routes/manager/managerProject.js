const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

// Check if manager is approved in the organization
async function managerOrgStatusCheck(managerId, organizationId) {
  const statusResult = await pool.query(
    `SELECT count(*) FROM organization_managers
     WHERE manager_id = $1 AND org_id = $2 AND status = 'APPROVED'`,
    [managerId, organizationId],
  );
  return parseInt(statusResult.rows[0].count) > 0;
}

// Check if manager is ACTIVE in the project (for non-creator managers)
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
router.get("/project-requests", managerCheck, async (req, res) => {
  const managerId = req.user.id;
  const { projectId, organizationId } = req.query;
  try {
    // CRITICAL: Check both project AND organization authorization
    const authCheck = await pool.query(
      `SELECT 1 
       FROM project_managers pm
       JOIN organization_managers om ON om.manager_id = pm.manager_id
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.manager_id = $1::uuid 
         AND pm.project_id = $2::uuid
         AND pm.status = 'ACTIVE'
         AND om.status = 'APPROVED'
         AND p.org_id = om.org_id
         AND p.org_id = $3::uuid`,
      [managerId, projectId, organizationId],
    );

    if (authCheck.rows.length === 0) {
      return res.status(403).json({
        error:
          "Access denied. You must be an ACTIVE manager in this project and APPROVED in the organization.",
      });
    }

    const result = await pool.query(
      `select 
                pse.id, 
                pse.site_engineer_id, 
                pse.status, 
                se.name AS engineer_name,
                se.email AS engineer_email,
                se.phone AS engineer_phone
             FROM project_site_engineers pse
             JOIN site_engineers se ON pse.site_engineer_id = se.id
             WHERE pse.project_id = $1::uuid AND pse.status = 'PENDING'`,
      [projectId],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.put(
  "/project-requests/:requestId/decision",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { requestId } = req.params;
      const { decision, projectId, organizationId } = req.body;
      // CRITICAL: Check both project AND organization authorization
      const authCheck = await pool.query(
        `SELECT 1 
         FROM project_managers pm
         JOIN organization_managers om ON om.manager_id = pm.manager_id
         JOIN projects p ON p.id = pm.project_id
         WHERE pm.manager_id = $1::uuid 
           AND pm.project_id = $2::uuid
           AND pm.status = 'ACTIVE'
           AND om.status = 'APPROVED'
           AND p.org_id = om.org_id
           AND p.org_id = $3::uuid`,
        [managerId, projectId, organizationId],
      );

      if (authCheck.rows.length === 0) {
        return res.status(403).json({
          error:
            "Access denied. You must be an ACTIVE manager in this project and APPROVED in the organization.",
        });
      }

      if (decision !== "ACTIVE" && decision !== "REJECTED") {
        return res.status(400).json({
          error: "Invalid decision. Must be 'ACTIVE' or 'REJECTED'.",
        });
      }

      await pool.query(
        `UPDATE project_site_engineers 
         SET status = $1 
         WHERE id = $2::uuid`,
        [decision, requestId],
      );
      res.json({ message: `Request ${decision.toLowerCase()} successfully.` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/**
 * GET /manager/projects/manager-requests
 * Project creator views all manager join requests for their project
 * Authorization: Must be project creator (created_by), ACTIVE in project, and APPROVED in org
 */
router.get("/manager-requests", managerCheck, async (req, res) => {
  const managerId = req.user.id;
  const { projectId, organizationId } = req.query;

  try {
    // CREATOR-ONLY authorization check
    const authCheck = await pool.query(
      `SELECT 1 
       FROM project_managers pm
       JOIN organization_managers om ON om.manager_id = pm.manager_id
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.manager_id = $1::uuid 
         AND pm.project_id = $2::uuid
         AND pm.status = 'ACTIVE'
         AND om.status = 'APPROVED'
         AND p.org_id = om.org_id
         AND p.org_id = $3::uuid
         AND p.created_by = $1::uuid`,
      [managerId, projectId, organizationId],
    );

    if (authCheck.rows.length === 0) {
      return res.status(403).json({
        error:
          "Access denied. Only the project creator can view manager requests.",
      });
    }

    // Get all manager requests for this project
    const result = await pool.query(
      `SELECT pm.*,
              m.name AS manager_name,
              m.email AS manager_email,
              m.phone AS manager_phone
       FROM project_managers pm
       JOIN managers m ON pm.manager_id = m.id
       WHERE pm.project_id = $1::uuid
       ORDER BY pm.assigned_at DESC`,
      [projectId],
    );

    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PUT /manager/projects/manager-requests/:requestId/decision
 * Project creator approves or rejects manager join request
 * Authorization: Must be project creator (created_by), ACTIVE in project, and APPROVED in org
 */
router.put(
  "/manager-requests/:requestId/decision",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { requestId } = req.params;
      const { decision, projectId, organizationId } = req.body;

      // CREATOR-ONLY authorization check
      const authCheck = await pool.query(
        `SELECT 1 
       FROM project_managers pm
       JOIN organization_managers om ON om.manager_id = pm.manager_id
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.manager_id = $1::uuid 
         AND pm.project_id = $2::uuid
         AND pm.status = 'ACTIVE'
         AND om.status = 'APPROVED'
         AND p.org_id = om.org_id
         AND p.org_id = $3::uuid
         AND p.created_by = $1::uuid`,
        [managerId, projectId, organizationId],
      );

      if (authCheck.rows.length === 0) {
        return res.status(403).json({
          error:
            "Access denied. Only the project creator can approve/reject manager requests.",
        });
      }

      // Validate decision
      if (decision !== "ACTIVE" && decision !== "REJECTED") {
        return res.status(400).json({
          error: "Invalid decision. Must be 'ACTIVE' or 'REJECTED'.",
        });
      }

      // Verify request exists and belongs to this project
      const requestCheck = await pool.query(
        `SELECT manager_id FROM project_managers 
       WHERE id = $1::uuid AND project_id = $2::uuid`,
        [requestId, projectId],
      );

      if (requestCheck.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Prevent self-approval
      if (requestCheck.rows[0].manager_id === managerId) {
        return res.status(400).json({
          error: "You cannot approve your own request",
        });
      }

      // Update status
      await pool.query(
        `UPDATE project_managers 
       SET status = $1 
       WHERE id = $2::uuid`,
        [decision, requestId],
      );

      res.json({
        message: `Manager request ${decision.toLowerCase()} successfully`,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
