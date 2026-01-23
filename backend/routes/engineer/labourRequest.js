const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");
const { verifyEngineerAccess } = require("../../util/engineerPermissions");

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
       AND status = 'APPROVED'`,
    [engineerId, projectId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- CREATE LABOUR REQUEST ---------------- */
router.post("/", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    let {
      project_id,
      category,
      required_count,
      search_radius_meters,
      request_date,
      copied_from,
    } = req.body;

    // If project_id not provided, try to find the first active project for this engineer
    if (!project_id) {
      const activeProject = await pool.query(
        `SELECT project_id FROM project_site_engineers 
         WHERE site_engineer_id = $1 AND status = 'APPROVED' LIMIT 1`,
        [engineerId],
      );
      if (activeProject.rows.length === 0) {
        return res.status(400).json({
          error: "No active project found. Please provide project_id.",
        });
      }
      project_id = activeProject.rows[0].project_id;
    }

    // Unified Permission Check
    const access = await verifyEngineerAccess(engineerId, project_id);
    if (!access.allowed) {
      return res.status(403).json({ error: access.error });
    }

    // Default search radius if not provided
    if (!search_radius_meters) search_radius_meters = 10000; // 10km

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
router.get("/", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    let { projectId } = req.query;

    if (!projectId) {
      const activeProject = await pool.query(
        `SELECT project_id FROM project_site_engineers 
         WHERE site_engineer_id = $1 AND status = 'APPROVED' LIMIT 1`,
        [engineerId],
      );
      if (activeProject.rows.length > 0) {
        projectId = activeProject.rows[0].project_id;
      }
    }

    let query = `SELECT lr.*, 
                 (SELECT COUNT(*) FROM labour_request_participants WHERE labour_request_id = lr.id) as applicants_count,
                 (SELECT COUNT(*) FROM attendance WHERE project_id = lr.project_id AND attendance_date = lr.request_date AND status = 'APPROVED') as approved_count
                 FROM labour_requests lr 
                 WHERE lr.site_engineer_id = $1`;
    let params = [engineerId];

    if (projectId) {
      query += ` AND lr.project_id = $2`;
      params.push(projectId);
    }

    query += ` ORDER BY lr.request_date DESC, lr.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET APPLICANTS ---------------- */
router.get("/:requestId/applicants", engineerCheck, async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await pool.query(
      `SELECT l.id as labour_id, l.name, l.phone, l.skill_type, l.categories, lrp.joined_at,
       (SELECT status FROM attendance WHERE labour_id = l.id AND project_id = lr.project_id AND attendance_date = lr.request_date LIMIT 1) as status
       FROM labour_request_participants lrp
       JOIN labours l ON lrp.labour_id = l.id
       JOIN labour_requests lr ON lrp.labour_request_id = lr.id
       WHERE lrp.labour_request_id = $1`,
      [requestId],
    );
    res.json({
      applicants: result.rows.map((row) => ({
        ...row,
        status: row.status || "PENDING",
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- APPROVE LABOURER ---------------- */
router.post(
  "/:requestId/approve/:labourId",
  engineerCheck,
  async (req, res) => {
    try {
      const { requestId, labourId } = req.params;
      const engineerId = req.user.id;

      // Get request details
      const reqResult = await pool.query(
        `SELECT project_id, request_date FROM labour_requests WHERE id = $1`,
        [requestId],
      );
      if (reqResult.rows.length === 0)
        return res.status(404).json({ error: "Request not found" });

      const { project_id, request_date } = reqResult.rows[0];

      // Create entry in attendance table (or update if exists)
      // In this system, "Approval" means we are creating a pending attendance record that allows them to check-in/out
      // or marking them as 'APPROVED' for that day.
      await pool.query(
        `INSERT INTO attendance (project_id, labour_id, site_engineer_id, attendance_date, status, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, 'APPROVED', $3, NOW())
       ON CONFLICT (project_id, labour_id, attendance_date) 
       DO UPDATE SET status = 'APPROVED', approved_by = $3, approved_at = NOW()`,
        [project_id, labourId, engineerId, request_date],
      );

      res.json({ message: "Labourer approved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- REJECT LABOURER ---------------- */
router.post("/:requestId/reject/:labourId", engineerCheck, async (req, res) => {
  try {
    const { requestId, labourId } = req.params;
    const engineerId = req.user.id;

    // Get request details
    const reqResult = await pool.query(
      `SELECT project_id, request_date FROM labour_requests WHERE id = $1`,
      [requestId],
    );
    if (reqResult.rows.length === 0)
      return res.status(404).json({ error: "Request not found" });

    const { project_id, request_date } = reqResult.rows[0];

    await pool.query(
      `INSERT INTO attendance (project_id, labour_id, site_engineer_id, attendance_date, status, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, 'REJECTED', $3, NOW())
       ON CONFLICT (project_id, labour_id, attendance_date) 
       DO UPDATE SET status = 'REJECTED', approved_by = $3, approved_at = NOW()`,
      [project_id, labourId, engineerId, request_date],
    );

    res.json({ message: "Labourer rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- UPDATE LABOUR REQUEST ---------------- */
router.put("/:id", engineerCheck, async (req, res) => {
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

    // Fetch before state
    const beforeResult = await pool.query(
      `SELECT * FROM labour_requests WHERE id = $1 AND site_engineer_id = $2`,
      [id, engineerId],
    );

    if (beforeResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Request not found or unauthorized" });
    }

    const beforeState = beforeResult.rows[0];
    const project_id = beforeState.project_id;

    const result = await pool.query(
      `UPDATE labour_requests SET 
       category = $1, 
       required_count = $2, 
       search_radius_meters = $3, 
       request_date = $4,
       status = $5
       WHERE id = $6 AND site_engineer_id = $7 RETURNING *`,
      [
        category,
        required_count,
        search_radius_meters,
        request_date,
        status,
        id,
        engineerId,
      ],
    );

    const afterState = result.rows[0];

    // Audit log
    const organizationId = await getOrganizationIdFromProject(project_id);
    await logAudit({
      entityType: "LABOUR_REQUEST",
      entityId: id,
      category: "LABOUR_REQUEST",
      action: "UPDATE",
      before: beforeState,
      after: afterState,
      user: req.user,
      projectId: project_id,
      organizationId,
    });

    res.json({ labour_request: afterState });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE LABOUR REQUEST ---------------- */
router.delete("/:id", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { id } = req.params;

    // Fetch before state
    const beforeResult = await pool.query(
      `SELECT * FROM labour_requests WHERE id = $1 AND site_engineer_id = $2`,
      [id, engineerId],
    );

    if (beforeResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Request not found or unauthorized" });
    }

    const beforeState = beforeResult.rows[0];
    const project_id = beforeState.project_id;

    const result = await pool.query(
      `DELETE FROM labour_requests WHERE id = $1 AND site_engineer_id = $2`,
      [id, engineerId],
    );

    // Audit log
    const organizationId = await getOrganizationIdFromProject(project_id);
    await logAudit({
      entityType: "LABOUR_REQUEST",
      entityId: id,
      category: "LABOUR_REQUEST",
      action: "DELETE",
      before: beforeState,
      after: null,
      user: req.user,
      projectId: project_id,
      organizationId,
    });

    res.json({ message: "Labour request deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
