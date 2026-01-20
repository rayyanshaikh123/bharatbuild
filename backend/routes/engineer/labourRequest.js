const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");

// Check if engineer is APPROVED in organization
async function engineerOrgStatusCheck(engineerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM organization_site_engineers ose
     JOIN projects p ON ose.org_id = p.org_id
     WHERE ose.site_engineer_id = $1 
       AND p.id = $2 
       AND ose.status = 'APPROVED'`,
    [engineerId, projectId],
  );
  return parseInt(result.rows[0].count) > 0;
}

// Check if engineer is ACTIVE in project
async function engineerProjectStatusCheck(engineerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM project_site_engineers
     WHERE site_engineer_id = $1 
       AND project_id = $2 
       AND status = 'ACTIVE'`,
    [engineerId, projectId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- CREATE LABOUR REQUEST ---------------- */
router.post("/labour-requests", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const {
      project_id,
      category,
      required_count,
      search_radius_meters,
      request_date,
      copied_from,
    } = req.body;

    // Check if engineer is APPROVED in organization
    const isOrgApproved = await engineerOrgStatusCheck(engineerId, project_id);
    if (!isOrgApproved) {
      return res.status(403).json({
        error: "Access denied. Not an approved engineer in the organization.",
      });
    }

    // Check if engineer is ACTIVE in project
    const isProjectActive = await engineerProjectStatusCheck(
      engineerId,
      project_id,
    );
    if (!isProjectActive) {
      return res.status(403).json({
        error: "Access denied. Not an active engineer in the project.",
      });
    }

    const result = await pool.query(
      `INSERT INTO labour_requests (project_id, site_engineer_id, category, 
       required_count, search_radius_meters, request_date, copied_from)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        project_id,
        engineerId,
        category,
        required_count,
        search_radius_meters,
        request_date,
        copied_from || null,
      ],
    );

    res.status(201).json({ labour_request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET LABOUR REQUESTS ---------------- */
router.get("/labour-requests", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Check if engineer is APPROVED in organization
    const isOrgApproved = await engineerOrgStatusCheck(engineerId, projectId);
    if (!isOrgApproved) {
      return res.status(403).json({
        error: "Access denied. Not an approved engineer in the organization.",
      });
    }

    // Check if engineer is ACTIVE in project
    const isProjectActive = await engineerProjectStatusCheck(
      engineerId,
      projectId,
    );
    if (!isProjectActive) {
      return res.status(403).json({
        error: "Access denied. Not an active engineer in the project.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM labour_requests 
       WHERE project_id = $1 
       ORDER BY request_date DESC, created_at DESC`,
      [projectId],
    );

    res.json({ labour_requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET YESTERDAY'S LABOUR REQUESTS ---------------- */
router.get("/labour-requests/yesterday", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Check if engineer is APPROVED in organization
    const isOrgApproved = await engineerOrgStatusCheck(engineerId, projectId);
    if (!isOrgApproved) {
      return res.status(403).json({
        error: "Access denied. Not an approved engineer in the organization.",
      });
    }

    // Check if engineer is ACTIVE in project
    const isProjectActive = await engineerProjectStatusCheck(
      engineerId,
      projectId,
    );
    if (!isProjectActive) {
      return res.status(403).json({
        error: "Access denied. Not an active engineer in the project.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM labour_requests 
       WHERE project_id = $1 
         AND request_date = CURRENT_DATE - INTERVAL '1 day'
       ORDER BY created_at`,
      [projectId],
    );

    res.json({ labour_requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- UPDATE LABOUR REQUEST ---------------- */
router.put("/labour-requests/:id", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { id } = req.params;
    const {
      category,
      required_count,
      search_radius_meters,
      request_date,
      status,
    } = req.body;

    // Get project_id from labour request
    const requestCheck = await pool.query(
      `SELECT project_id FROM labour_requests WHERE id = $1`,
      [id],
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: "Labour request not found" });
    }

    const projectId = requestCheck.rows[0].project_id;

    // Check if engineer is APPROVED in organization
    const isOrgApproved = await engineerOrgStatusCheck(engineerId, projectId);
    if (!isOrgApproved) {
      return res.status(403).json({
        error: "Access denied. Not an approved engineer in the organization.",
      });
    }

    // Check if engineer is ACTIVE in project
    const isProjectActive = await engineerProjectStatusCheck(
      engineerId,
      projectId,
    );
    if (!isProjectActive) {
      return res.status(403).json({
        error: "Access denied. Not an active engineer in the project.",
      });
    }

    const result = await pool.query(
      `UPDATE labour_requests SET 
       category = $1, 
       required_count = $2, 
       search_radius_meters = $3, 
       request_date = $4,
       status = $5
       WHERE id = $6 RETURNING *`,
      [
        category,
        required_count,
        search_radius_meters,
        request_date,
        status,
        id,
      ],
    );

    res.json({ labour_request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE LABOUR REQUEST ---------------- */
router.delete("/labour-requests/:id", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { id } = req.params;

    // Get project_id from labour request
    const requestCheck = await pool.query(
      `SELECT project_id FROM labour_requests WHERE id = $1`,
      [id],
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: "Labour request not found" });
    }

    const projectId = requestCheck.rows[0].project_id;

    // Check if engineer is APPROVED in organization
    const isOrgApproved = await engineerOrgStatusCheck(engineerId, projectId);
    if (!isOrgApproved) {
      return res.status(403).json({
        error: "Access denied. Not an approved engineer in the organization.",
      });
    }

    // Check if engineer is ACTIVE in project
    const isProjectActive = await engineerProjectStatusCheck(
      engineerId,
      projectId,
    );
    if (!isProjectActive) {
      return res.status(403).json({
        error: "Access denied. Not an active engineer in the project.",
      });
    }

    await pool.query(`DELETE FROM labour_requests WHERE id = $1`, [id]);

    res.json({ message: "Labour request deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
