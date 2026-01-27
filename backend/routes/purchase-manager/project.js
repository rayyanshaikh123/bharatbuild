const express = require("express");
const pool = require("../../db");
const router = express.Router();
const purchaseManagerCheck = require("../../middleware/purchaseManagerCheck");

/* ---------------- GET MY PROJECT REQUESTS ---------------- */
router.get("/project-requests", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;

    const result = await pool.query(
      `SELECT ppm.id, ppm.project_id, ppm.status, ppm.assigned_at,
              p.name AS project_name, p.location_text, p.start_date, p.end_date, p.status AS project_status,
              o.name AS org_name
       FROM project_purchase_managers ppm
       JOIN projects p ON ppm.project_id = p.id
       JOIN organizations o ON p.org_id = o.id
       WHERE ppm.purchase_manager_id = $1
       ORDER BY ppm.assigned_at DESC`,
      [purchaseManagerId],
    );

    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET MY APPROVED PROJECTS ---------------- */
router.get("/projects", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;

    // First verify purchase manager has approved organization
    const orgCheck = await pool.query(
      `SELECT org_id FROM organization_purchase_managers 
       WHERE purchase_manager_id = $1 AND status = 'APPROVED'`,
      [purchaseManagerId],
    );

    if (orgCheck.rows.length === 0) {
      return res.status(403).json({ error: "No approved organization found" });
    }

    const orgId = orgCheck.rows[0].org_id;

    // Get all projects where purchase manager is APPROVED
    const result = await pool.query(
      `SELECT p.id, p.name, p.location_text, p.latitude, p.longitude, 
              p.start_date, p.end_date, p.budget, p.status, p.current_invested,
              ppm.status AS access_status, ppm.assigned_at,
              o.name AS org_name
       FROM projects p
       JOIN organizations o ON p.org_id = o.id
       JOIN project_purchase_managers ppm ON p.id = ppm.project_id
       WHERE ppm.purchase_manager_id = $1 AND ppm.status = 'APPROVED'
       ORDER BY ppm.assigned_at DESC`,
      [purchaseManagerId],
    );

    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET ALL ORGANIZATION PROJECTS (for joining) ---------------- */
router.get("/available-projects", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;

    // Get purchase manager's approved organization
    const orgResult = await pool.query(
      `SELECT org_id FROM organization_purchase_managers 
       WHERE purchase_manager_id = $1 AND status = 'APPROVED'`,
      [purchaseManagerId],
    );

    if (orgResult.rows.length === 0) {
      return res.status(403).json({
        error:
          "You must be approved in an organization before joining projects",
      });
    }

    const orgId = orgResult.rows[0].org_id;

    // Get all projects in the organization
    const result = await pool.query(
      `SELECT p.id, p.name, p.location_text, p.start_date, p.end_date, p.status,
              CASE 
                WHEN ppm.id IS NOT NULL THEN ppm.status
                ELSE 'NOT_JOINED'
              END AS join_status
       FROM projects p
       LEFT JOIN project_purchase_managers ppm ON p.id = ppm.project_id AND ppm.purchase_manager_id = $1
       WHERE p.org_id = $2 AND p.status != 'COMPLETED'
       ORDER BY p.created_at DESC`,
      [purchaseManagerId, orgId],
    );

    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- JOIN PROJECT ---------------- */
router.post("/join-project", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // Verify purchase manager has approved organization
    const orgCheck = await pool.query(
      `SELECT org_id FROM organization_purchase_managers 
       WHERE purchase_manager_id = $1 AND status = 'APPROVED'`,
      [purchaseManagerId],
    );

    if (orgCheck.rows.length === 0) {
      return res.status(403).json({
        error:
          "You must be approved in an organization before joining projects",
      });
    }

    const orgId = orgCheck.rows[0].org_id;

    // Verify project belongs to the organization
    const projectCheck = await pool.query(
      "SELECT id, org_id FROM projects WHERE id = $1",
      [projectId],
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (projectCheck.rows[0].org_id !== orgId) {
      return res.status(403).json({
        error: "Project does not belong to your organization",
      });
    }

    // Insert join request
    await pool.query(
      `INSERT INTO project_purchase_managers (project_id, purchase_manager_id, status)
       VALUES ($1, $2, 'PENDING')
       ON CONFLICT (project_id, purchase_manager_id) DO NOTHING`,
      [projectId, purchaseManagerId],
    );

    // Create audit log
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "PROJECT",
        projectId,
        "JOIN_REQUEST",
        "PURCHASE_MANAGER",
        purchaseManagerId,
        projectId,
        orgId,
        "ACCESS",
      ],
    );

    // Create notification for project managers
    const pmResult = await pool.query(
      `SELECT manager_id FROM project_managers WHERE project_id = $1 AND status = 'ACTIVE'`,
      [projectId],
    );

    for (const pm of pmResult.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, user_role, title, message, type, project_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          pm.manager_id,
          "MANAGER",
          "Purchase Manager Join Request",
          "A purchase manager has requested to join your project",
          "INFO",
          projectId,
        ],
      );
    }

    res.json({ message: "Join request sent to project successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
