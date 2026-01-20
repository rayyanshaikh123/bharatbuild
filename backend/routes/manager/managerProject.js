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
    const isProjApproved = await managerProjectStatusCheck(
      managerId,
      projectId,
    );

    const isCreator = await isProjectCreator(managerId, projectId);
    if (!isProjApproved && !isCreator) {
      return res
        .status(403)
        .json({
          error: "Access denied. Not an active manager in the project.",
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
             WHERE pse.project_id = $1 AND pse.status = 'PENDING'`,
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
      const isProjApproved = await managerProjectStatusCheck(
        managerId,
        projectId,
      );

      const isCreator = await isProjectCreator(managerId, projectId);
      if (!isProjApproved && !isCreator) {
        return res
          .status(403)
          .json({
            error: "Access denied. Not an active manager in the project.",
          });
      }

      if (decision !== "APPROVED" && decision !== "REJECTED") {
        return res
          .status(400)
          .json({
            error: "Invalid decision. Must be 'APPROVED' or 'REJECTED'.",
          });
      }

      await pool.query(
        `UPDATE project_site_engineers 
         SET status = $1 
         WHERE id = $2`,
        [decision, requestId],
      );
      res.json({ message: `Request ${decision.toLowerCase()} successfully.` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);
module.exports = router;
