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
router.post("/join-project", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId, organizationId } = req.body;

    const isOrgApproved = await managerOrgStatusCheck(
      managerId,
      organizationId,
    );
    if (!isOrgApproved) {
      return res.status(403).json({
        error: "Access denied. Not an approved manager in the organization.",
      });
    }

    // Validate project belongs to organization
    const projectCheck = await pool.query(
      "SELECT id FROM projects WHERE id = $1 AND org_id = $2",
      [projectId, organizationId],
    );
    if (projectCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Project not found in this organization." });
    }

    const isProjApproved = await managerProjectStatusCheck(
      managerId,
      projectId,
    );
    if (isProjApproved) {
      return res
        .status(400)
        .json({ error: "Already an active manager in the project." });
    }

    await pool.query(
      `INSERT INTO project_managers (project_id, manager_id, status) 
         VALUES ($1, $2, 'PENDING') ON CONFLICT DO NOTHING`,
      [projectId, managerId],
    );
    res.json({ message: "Successfully joined the project as a manager" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/my-project-requests", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;

    const result = await pool.query(
      `SELECT pm.*,
              p.name AS project_name,
              p.description AS project_description,
              p.org_id,
              p.start_date,
              p.end_date
       FROM project_managers pm
       JOIN projects p ON pm.project_id = p.id
       WHERE pm.manager_id = $1 AND pm.status = 'PENDING'`,
      [managerId],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
