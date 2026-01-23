const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const { logAudit } = require("../../util/auditLogger");

/**
 * POST /engineer/organization/leave
 * Site Engineer leaves an organization
 * - Sets status to REMOVED
 * - Removes all project assignments in that organization
 * - Writes audit log
 */
router.post("/leave", engineerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const engineerId = req.user.id;
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    await client.query("BEGIN");

    // Check if engineer is in this organization
    const orgResult = await client.query(
      `SELECT ose.status, o.name as org_name
       FROM organization_site_engineers ose
       JOIN organizations o ON ose.org_id = o.id
       WHERE ose.site_engineer_id = $1::uuid AND ose.org_id = $2::uuid`,
      [engineerId, organizationId],
    );

    if (orgResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "You are not a member of this organization",
      });
    }

    const { status: currentStatus, org_name: orgName } = orgResult.rows[0];

    if (currentStatus === "REMOVED") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "You have already left this organization",
      });
    }

    // Get all projects in this organization
    const projectsResult = await client.query(
      `SELECT p.id FROM projects p WHERE p.org_id = $1::uuid`,
      [organizationId],
    );

    const projectIds = projectsResult.rows.map((row) => row.id);

    // Remove from all project_site_engineers for projects in this org
    if (projectIds.length > 0) {
      await client.query(
        `DELETE FROM project_site_engineers 
         WHERE site_engineer_id = $1::uuid AND project_id = ANY($2::uuid[])`,
        [engineerId, projectIds],
      );
    }

    // Set organization_site_engineers status to REMOVED
    await client.query(
      `UPDATE organization_site_engineers 
       SET status = 'REMOVED', updated_at = NOW()
       WHERE site_engineer_id = $1::uuid AND org_id = $2::uuid`,
      [engineerId, organizationId],
    );

    // Audit log
    await logAudit({
      entityType: "ORGANIZATION_SITE_ENGINEER",
      entityId: engineerId,
      category: "ORGANIZATION",
      action: "LEAVE",
      before: { status: currentStatus, org_id: organizationId },
      after: { status: "REMOVED", org_id: organizationId },
      user: req.user,
      projectId: null,
      organizationId: organizationId,
      client,
    });

    await client.query("COMMIT");

    res.json({
      message: `Successfully left organization "${orgName}"`,
      removed_from_projects: projectIds.length,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Engineer leave organization error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
