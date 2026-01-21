const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");

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

router.post("/create-project", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const {
      organizationId,
      name,
      location_text,
      latitude,
      longitude,
      geofence_radius,
      start_date,
      end_date,
      budget,
      status,
    } = req.body;

    const isApproved = await managerOrgStatusCheck(managerId, organizationId);
    if (!isApproved) {
      return res.status(403).json({
        error:
          "You are not authorized to create a project for this organization.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const insertProjectText = `INSERT INTO projects (org_id, name, location_text,
        latitude, longitude, geofence_radius, start_date, end_date, budget, status, created_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
      const insertProjectValues = [
        organizationId,
        name,
        location_text,
        latitude,
        longitude,
        geofence_radius,
        start_date,
        end_date,
        budget,
        status,
        managerId,
      ];
      const projectResult = await client.query(
        insertProjectText,
        insertProjectValues,
      );

      // Creator automatically gets ACTIVE status
      await client.query(
        `INSERT INTO project_managers (project_id, manager_id, status)
         VALUES ($1, $2, 'ACTIVE')`,
        [projectResult.rows[0].id, managerId],
      );

      await client.query("COMMIT");

      // Send email notification to organization owner
      try {
        const ownerData = await pool.query(
          `SELECT o.name as org_name, ow.email as owner_email, ow.name as owner_name
           FROM organizations o
           JOIN owners ow ON o.owner_id = ow.id
           WHERE o.id = $1`,
          [organizationId],
        );

        if (ownerData.rows.length > 0) {
          const { sendNotificationEmail } = require("../../util/mailer");
          const createdAt = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          });
          await sendNotificationEmail({
            to: ownerData.rows[0].owner_email,
            subject: "New Project Created",
            message: `Hello ${ownerData.rows[0].owner_name},\n\nA new project "${name}" has been created in your organization "${ownerData.rows[0].org_name}" by ${req.user.name}.\n\nCreated on: ${createdAt}\n\nBest regards,\nBharat Build Team`,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send project creation email:", emailErr);
      }

      res.status(201).json({ project: projectResult.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: "Server error" });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/my-projects", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { organizationId } = req.query;

    // const isApproved = await managerOrgStatusCheck(managerId, organizationId);
    // if (!isApproved) {
    //   return res.status(403).json({
    //     error: "You are not authorized to view projects for this organization.",
    //   });
    // }

    // Get projects created by this manager
    const result = await pool.query(
      `SELECT p.* FROM projects p
       WHERE p.org_id = $1 AND p.created_by = $2`,
      [organizationId, managerId],
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/all-projects", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { organizationId } = req.query;
    //THE BELOW CAN BE UNCMMENTED IF WE WANT TO RESTRICT MANAGERS TO ONLY VIEW PROJECTS IN ORGS THEY ARE APPROVED IN AND MORE CHANGES SHOULD BE MADE SO THAT IF CRETOR IS REJECTED NE CREATOR SHOULD BE THERE

    // const isApproved = await managerOrgStatusCheck(managerId, organizationId);
    // if (!isApproved) {
    //   return res.status(403).json({
    //     error: "You are not authorized to view projects for this organization.",
    //   });
    // }

    // Get all projects where this manager is ACTIVE
    const result = await pool.query(
      `SELECT p.* FROM projects p
       JOIN project_managers pm ON p.id = pm.project_id
       WHERE pm.manager_id = $1 AND p.org_id = $2 AND pm.status = 'ACTIVE'`,
      [managerId, organizationId],
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/project/:projectId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;
    const { organizationId } = req.query;

    // Check if manager is ACTIVE in this project
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    if (!isActive) {
      return res
        .status(403)
        .json({ error: "You are not authorized to view this project." });
    }

    const result = await pool.query(
      `SELECT p.* FROM projects p
       WHERE p.id = $1 AND p.org_id = $2`,
      [projectId, organizationId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/project/:projectId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;
    const {
      organizationId,
      name,
      location_text,
      latitude,
      longitude,
      geofence_radius,
      start_date,
      end_date,
      budget,
      status,
    } = req.body;

    // Only the creator can update the project
    const isCreator = await isProjectCreator(managerId, projectId);
    if (!isCreator) {
      return res.status(403).json({
        error: "Only the project creator can update this project.",
      });
    }

    // Fetch before state
    const beforeResult = await pool.query(
      `SELECT * FROM projects WHERE id=$1 AND org_id=$2 AND created_by=$3`,
      [projectId, organizationId, managerId],
    );

    if (beforeResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Project not found or unauthorized" });
    }

    const beforeState = beforeResult.rows[0];

    const result = await pool.query(
      `UPDATE projects SET name=$1, location_text=$2, latitude=$3, longitude=$4,
       geofence_radius=$5, start_date=$6, end_date=$7, budget=$8, status=$9
       WHERE id=$10 AND org_id=$11 AND created_by=$12 RETURNING *`,
      [
        name,
        location_text,
        latitude,
        longitude,
        geofence_radius,
        start_date,
        end_date,
        budget,
        status,
        projectId,
        organizationId,
        managerId,
      ],
    );

    const afterState = result.rows[0];

    // Audit log
    const organizationIdForAudit = organizationId;
    await logAudit({
      entityType: "PROJECT",
      entityId: projectId,
      category: "PROJECT",
      action: "UPDATE",
      before: beforeState,
      after: afterState,
      user: req.user,
      projectId: projectId,
      organizationId: organizationIdForAudit,
    });

    res.json({ project: afterState });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/project/:projectId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;
    const { organizationId } = req.body;

    // Only the creator can delete the project
    const isCreator = await isProjectCreator(managerId, projectId);
    if (!isCreator) {
      return res.status(403).json({
        error: "Only the project creator can delete this project.",
      });
    }

    // Fetch before state
    const beforeResult = await pool.query(
      `SELECT * FROM projects WHERE id=$1 AND org_id=$2 AND created_by=$3`,
      [projectId, organizationId, managerId],
    );

    if (beforeResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Project not found or unauthorized" });
    }

    const beforeState = beforeResult.rows[0];

    const result = await pool.query(
      `DELETE FROM projects WHERE id=$1 AND org_id=$2 AND created_by=$3 RETURNING *`,
      [projectId, organizationId, managerId],
    );

    // Audit log
    await logAudit({
      entityType: "PROJECT",
      entityId: projectId,
      category: "PROJECT",
      action: "DELETE",
      before: beforeState,
      after: null,
      user: req.user,
      projectId: projectId,
      organizationId: organizationId,
    });

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/project/:projectId/status", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;
    const { organizationId, status } = req.body;

    const validStatuses = ["PLANNED", "ACTIVE", "COMPLETED", "ON_HOLD"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid project status" });
    }

    // Only the creator can update project status
    const isCreator = await isProjectCreator(managerId, projectId);
    if (!isCreator) {
      return res.status(403).json({
        error: "Only the project creator can update project status.",
      });
    }

    // Fetch before state
    const beforeResult = await pool.query(
      `SELECT * FROM projects WHERE id=$1 AND org_id=$2 AND created_by=$3`,
      [projectId, organizationId, managerId],
    );

    if (beforeResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Project not found or unauthorized" });
    }

    const beforeState = beforeResult.rows[0];

    const result = await pool.query(
      `UPDATE projects SET status=$1 WHERE id=$2 AND org_id=$3 AND created_by=$4 RETURNING *`,
      [status, projectId, organizationId, managerId],
    );

    const afterState = result.rows[0];

    // Audit log
    await logAudit({
      entityType: "PROJECT",
      entityId: projectId,
      category: "PROJECT",
      action: "UPDATE",
      before: beforeState,
      after: afterState,
      user: req.user,
      projectId: projectId,
      organizationId: organizationId,
    });

    res.json({ project: afterState });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
