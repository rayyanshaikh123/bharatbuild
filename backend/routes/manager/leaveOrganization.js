const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");
const { logAudit } = require("../../util/auditLogger");

/**
 * POST /manager/organization/leave
 * Manager leaves their current organization
 * - Sets status to REMOVED
 * - Removes all project assignments in that organization
 * - Writes audit log
 */
router.post("/leave", managerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const managerId = req.user.id;

    await client.query("BEGIN");

    // Get current organization
    const orgResult = await client.query(
      `SELECT om.org_id, om.status, o.name as org_name
       FROM organization_managers om
       JOIN organizations o ON om.org_id = o.id
       WHERE om.manager_id = $1::uuid AND om.status = 'APPROVED'`,
      [managerId],
    );

    if (orgResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "You are not currently a member of any organization",
      });
    }

    const { org_id: orgId, org_name: orgName } = orgResult.rows[0];

    // Get all projects in this organization
    const projectsResult = await client.query(
      `SELECT p.id FROM projects p WHERE p.org_id = $1::uuid`,
      [orgId],
    );

    const projectIds = projectsResult.rows.map((row) => row.id);

    // Remove from all project_managers for projects in this org
    if (projectIds.length > 0) {
      await client.query(
        `DELETE FROM project_managers 
         WHERE manager_id = $1::uuid AND project_id = ANY($2::uuid[])`,
        [managerId, projectIds],
      );
    }

    // Set organization_managers status to REMOVED
    await client.query(
      `UPDATE organization_managers 
       SET status = 'REMOVED', updated_at = NOW()
       WHERE manager_id = $1::uuid AND org_id = $2::uuid`,
      [managerId, orgId],
    );

    // Audit log
    await logAudit({
      entityType: "ORGANIZATION_MANAGER",
      entityId: managerId,
      category: "ORGANIZATION",
      action: "LEAVE",
      before: { status: "APPROVED", org_id: orgId },
      after: { status: "REMOVED", org_id: orgId },
      user: req.user,
      projectId: null,
      organizationId: orgId,
      client,
    });

    await client.query("COMMIT");

    res.json({
      message: `Successfully left organization "${orgName}"`,
      removed_from_projects: projectIds.length,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Manager leave organization error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
