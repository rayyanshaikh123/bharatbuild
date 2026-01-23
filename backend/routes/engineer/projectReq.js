const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
async function siteEngineerStatuusCheck(engineerId, organizationId) {
  const statusCheck = await pool.query(
    `SELECT status FROM organization_site_engineers 
         WHERE site_engineer_id = $1 AND org_id = $2`,
    [engineerId, organizationId],
  );
  if (statusCheck.rows.length === 0) {
    return null;
  }
  return statusCheck.rows[0].status;
}
router.get("/projects", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { organizationId } = req.query;

    // Allow engineers who are APPROVED or PENDING to view projects
    const status = await siteEngineerStatuusCheck(engineerId, organizationId);
    if (!status || (status !== "APPROVED" && status !== "PENDING")) {
      return res
        .status(403)
        .json({ error: "Access denied. You must be part of the organization to view its projects." });
    }

    const result = await pool.query(
      `SELECT * FROM projects WHERE org_id = $1`,
      [organizationId],
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.post("/project-join/:projectId", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.params;
    const { organizationId } = req.body;

    // Check if engineer is part of the organization (APPROVED or PENDING)
    const status = await siteEngineerStatuusCheck(engineerId, organizationId);
    if (!status || (status !== "APPROVED" && status !== "PENDING")) {
      return res
        .status(403)
        .json({ error: "Access denied. You must be part of the organization to join its projects." });
    }

    // Verify project belongs to the organization
    const projectCheck = await pool.query(
      `SELECT id FROM projects WHERE id = $1 AND org_id = $2`,
      [projectId, organizationId],
    );
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: "Project not found in this organization." });
    }

    // Insert project join request with PENDING status (requires manager approval)
    await pool.query(
      `INSERT INTO project_site_engineers (project_id, site_engineer_id, status) 
         VALUES ($1, $2, 'PENDING') 
         ON CONFLICT (project_id, site_engineer_id) 
         DO UPDATE SET status = 'PENDING'`,
      [projectId, engineerId],
    );
    res.json({ message: "Project join request submitted successfully. Waiting for manager approval." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/my-requests", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    // Authorization note: Engineers must ALWAYS see their own project join requests
    // No org-level check required here (per system context)
    const result = await pool.query(
      `SELECT pse.*, 
              p.name AS project_name,
              p.org_id,
              p.start_date,
              p.end_date
       FROM project_site_engineers pse
       JOIN projects p ON pse.project_id = p.id
       WHERE pse.site_engineer_id = $1 AND pse.status = 'PENDING'`,
      [engineerId],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/my-projects", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    // Return all projects regardless of status (PENDING, ACTIVE, REJECTED, etc.)
    const result = await pool.query(
      `SELECT pse.*, p.name, p.location_text, p.latitude, p.longitude, p.geofence, p.status as project_status, p.org_id
       FROM project_site_engineers pse
       JOIN projects p ON pse.project_id = p.id
       WHERE pse.site_engineer_id = $1
       ORDER BY 
         CASE pse.status 
           WHEN 'ACTIVE' THEN 1 
           WHEN 'PENDING' THEN 2 
           WHEN 'REJECTED' THEN 3 
           ELSE 4 
         END,
         pse.assigned_at DESC`,
      [engineerId],
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
