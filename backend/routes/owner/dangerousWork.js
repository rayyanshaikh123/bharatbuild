const express = require("express");
const router = express.Router();
const pool = require("../../db");
const ownerCheck = require("../../middleware/ownerCheck");

/* ============================================================
   DANGEROUS WORK AUTHORIZATION - OWNER (READ-ONLY)
   ============================================================
   Purpose: Organization-wide compliance and safety oversight
   Access: View all dangerous tasks and requests across organization
   ============================================================ */

/* -------------------- GET DANGEROUS TASKS FOR ORGANIZATION -------------------- */
router.get("/tasks", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { organizationId, projectId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    // Verify owner owns this organization
    const orgCheck = await pool.query(
      `SELECT id FROM organizations WHERE id = $1 AND owner_id = $2`,
      [organizationId, ownerId],
    );

    if (orgCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You do not own this organization" });
    }

    // Build query
    let query = `
      SELECT 
        dt.id, 
        dt.project_id, 
        dt.name, 
        dt.description, 
        dt.is_active, 
        dt.created_by, 
        dt.created_by_role, 
        dt.created_at,
        se.name AS created_by_name,
        p.name AS project_name,
        p.location_text AS project_location,
        COUNT(DISTINCT dtr.id) AS total_requests,
        COUNT(DISTINCT CASE WHEN dtr.status = 'APPROVED' THEN dtr.id END) AS approved_requests,
        COUNT(DISTINCT CASE WHEN dtr.status = 'REQUESTED' THEN dtr.id END) AS pending_requests,
        COUNT(DISTINCT CASE WHEN dtr.status = 'REJECTED' THEN dtr.id END) AS rejected_requests,
        COUNT(DISTINCT CASE WHEN dtr.status = 'EXPIRED' THEN dtr.id END) AS expired_requests
      FROM dangerous_tasks dt
      JOIN site_engineers se ON dt.created_by = se.id
      JOIN projects p ON dt.project_id = p.id
      LEFT JOIN dangerous_task_requests dtr ON dt.id = dtr.dangerous_task_id
      WHERE p.org_id = $1
    `;

    const params = [organizationId];
    let paramIndex = 2;

    if (projectId) {
      query += ` AND dt.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    query += `
      GROUP BY dt.id, se.name, p.name, p.location_text
      ORDER BY dt.is_active DESC, dt.created_at DESC
    `;

    const result = await pool.query(query, params);

    res.json({ dangerous_tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------- GET TASK REQUESTS FOR ORGANIZATION -------------------- */
router.get("/requests", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const {
      organizationId,
      projectId,
      status,
      labourId,
      taskId,
      startDate,
      endDate,
    } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    // Verify owner owns this organization
    const orgCheck = await pool.query(
      `SELECT id FROM organizations WHERE id = $1 AND owner_id = $2`,
      [organizationId, ownerId],
    );

    if (orgCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You do not own this organization" });
    }

    // Build query with filters
    let query = `
      SELECT 
        dtr.id, 
        dtr.dangerous_task_id, 
        dtr.labour_id, 
        dtr.project_id,
        dtr.status, 
        dtr.requested_at, 
        dtr.approved_at, 
        dtr.approved_by,
        dtr.approval_method,
        dt.name AS task_name,
        dt.description AS task_description,
        dt.is_active AS task_is_active,
        l.name AS labour_name,
        l.phone AS labour_phone,
        l.skill_type AS labour_skill,
        ase.name AS approved_by_name,
        p.name AS project_name,
        p.location_text AS project_location
      FROM dangerous_task_requests dtr
      JOIN dangerous_tasks dt ON dtr.dangerous_task_id = dt.id
      JOIN labours l ON dtr.labour_id = l.id
      JOIN projects p ON dtr.project_id = p.id
      LEFT JOIN site_engineers ase ON dtr.approved_by = ase.id
      WHERE p.org_id = $1
    `;

    const params = [organizationId];
    let paramIndex = 2;

    if (projectId) {
      query += ` AND dtr.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    if (status) {
      query += ` AND dtr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (labourId) {
      query += ` AND dtr.labour_id = $${paramIndex}`;
      params.push(labourId);
      paramIndex++;
    }

    if (taskId) {
      query += ` AND dtr.dangerous_task_id = $${paramIndex}`;
      params.push(taskId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND dtr.requested_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND dtr.requested_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY dtr.requested_at DESC`;

    const result = await pool.query(query, params);

    res.json({ task_requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------- GET ORGANIZATION-WIDE STATISTICS -------------------- */
router.get("/statistics", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { organizationId, startDate, endDate } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    // Verify owner owns this organization
    const orgCheck = await pool.query(
      `SELECT id FROM organizations WHERE id = $1 AND owner_id = $2`,
      [organizationId, ownerId],
    );

    if (orgCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You do not own this organization" });
    }

    let dateFilter = "";
    const params = [organizationId];
    let paramIndex = 2;

    if (startDate) {
      dateFilter += ` AND dtr.requested_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      dateFilter += ` AND dtr.requested_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Get comprehensive organization-wide statistics
    const stats = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT p.id) AS total_projects,
        COUNT(DISTINCT dt.id) AS total_dangerous_tasks,
        COUNT(DISTINCT CASE WHEN dt.is_active = true THEN dt.id END) AS active_tasks,
        COUNT(DISTINCT dtr.id) AS total_requests,
        COUNT(DISTINCT CASE WHEN dtr.status = 'APPROVED' THEN dtr.id END) AS approved_requests,
        COUNT(DISTINCT CASE WHEN dtr.status = 'REQUESTED' THEN dtr.id END) AS pending_requests,
        COUNT(DISTINCT CASE WHEN dtr.status = 'REJECTED' THEN dtr.id END) AS rejected_requests,
        COUNT(DISTINCT CASE WHEN dtr.status = 'EXPIRED' THEN dtr.id END) AS expired_requests,
        COUNT(DISTINCT dtr.labour_id) AS unique_labours_involved,
        COUNT(DISTINCT dt.created_by) AS unique_engineers_involved,
        ROUND(
          AVG(EXTRACT(EPOCH FROM (dtr.approved_at - dtr.requested_at)) / 60)::numeric, 
          2
        ) AS avg_approval_time_minutes,
        ROUND(
          (COUNT(CASE WHEN dtr.status = 'APPROVED' THEN 1 END)::numeric / 
           NULLIF(COUNT(dtr.id), 0) * 100), 
          2
        ) AS approval_rate_percentage
      FROM projects p
      LEFT JOIN dangerous_tasks dt ON p.id = dt.project_id
      LEFT JOIN dangerous_task_requests dtr ON dt.id = dtr.dangerous_task_id ${dateFilter}
      WHERE p.org_id = $1
    `,
      params,
    );

    // Get project-wise breakdown
    const projectStats = await pool.query(
      `
      SELECT 
        p.id,
        p.name,
        p.location_text,
        p.status AS project_status,
        COUNT(DISTINCT dt.id) AS dangerous_tasks,
        COUNT(DISTINCT dtr.id) AS total_requests,
        COUNT(CASE WHEN dtr.status = 'APPROVED' THEN 1 END) AS approved_requests,
        COUNT(CASE WHEN dtr.status = 'REQUESTED' THEN 1 END) AS pending_requests
      FROM projects p
      LEFT JOIN dangerous_tasks dt ON p.id = dt.project_id
      LEFT JOIN dangerous_task_requests dtr ON dt.id = dtr.dangerous_task_id ${dateFilter}
      WHERE p.org_id = $1
      GROUP BY p.id, p.name, p.location_text, p.status
      ORDER BY total_requests DESC
    `,
      params,
    );

    // Get most dangerous tasks across organization
    const topTasks = await pool.query(
      `
      SELECT 
        dt.id,
        dt.name,
        dt.is_active,
        p.name AS project_name,
        COUNT(dtr.id) AS request_count,
        COUNT(CASE WHEN dtr.status = 'APPROVED' THEN 1 END) AS approved_count
      FROM dangerous_tasks dt
      JOIN projects p ON dt.project_id = p.id
      LEFT JOIN dangerous_task_requests dtr ON dt.id = dtr.dangerous_task_id ${dateFilter}
      WHERE p.org_id = $1
      GROUP BY dt.id, dt.name, dt.is_active, p.name
      ORDER BY request_count DESC
      LIMIT 10
    `,
      params,
    );

    // Get compliance by skill type
    const skillTypeStats = await pool.query(
      `
      SELECT 
        l.skill_type,
        COUNT(DISTINCT l.id) AS unique_labours,
        COUNT(dtr.id) AS total_requests,
        COUNT(CASE WHEN dtr.status = 'APPROVED' THEN 1 END) AS approved_requests,
        COUNT(CASE WHEN dtr.status = 'EXPIRED' THEN 1 END) AS expired_requests
      FROM dangerous_task_requests dtr
      JOIN labours l ON dtr.labour_id = l.id
      JOIN projects p ON dtr.project_id = p.id
      WHERE p.org_id = $1 ${dateFilter}
      GROUP BY l.skill_type
      ORDER BY total_requests DESC
    `,
      params,
    );

    res.json({
      organization_statistics: stats.rows[0],
      project_breakdown: projectStats.rows,
      top_dangerous_tasks: topTasks.rows,
      skill_type_compliance: skillTypeStats.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------- GET COMPLIANCE REPORT -------------------- */
router.get("/compliance-report", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { organizationId, startDate, endDate } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    // Verify owner owns this organization
    const orgCheck = await pool.query(
      `SELECT id, name FROM organizations WHERE id = $1 AND owner_id = $2`,
      [organizationId, ownerId],
    );

    if (orgCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You do not own this organization" });
    }

    let dateFilter = "";
    const params = [organizationId];
    let paramIndex = 2;

    if (startDate) {
      dateFilter += ` AND dtr.requested_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      dateFilter += ` AND dtr.requested_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Get all dangerous work requests for audit
    const requests = await pool.query(
      `
      SELECT 
        dtr.id AS request_id,
        dtr.status,
        dtr.requested_at,
        dtr.approved_at,
        dt.name AS task_name,
        dt.description AS task_description,
        l.name AS labour_name,
        l.phone AS labour_phone,
        l.skill_type AS labour_skill,
        p.name AS project_name,
        p.location_text AS project_location,
        se.name AS engineer_name,
        ase.name AS approved_by_name,
        EXTRACT(EPOCH FROM (dtr.approved_at - dtr.requested_at)) / 60 AS approval_time_minutes
      FROM dangerous_task_requests dtr
      JOIN dangerous_tasks dt ON dtr.dangerous_task_id = dt.id
      JOIN labours l ON dtr.labour_id = l.id
      JOIN projects p ON dtr.project_id = p.id
      JOIN site_engineers se ON dt.created_by = se.id
      LEFT JOIN site_engineers ase ON dtr.approved_by = ase.id
      WHERE p.org_id = $1 ${dateFilter}
      ORDER BY dtr.requested_at DESC
    `,
      params,
    );

    res.json({
      organization_name: orgCheck.rows[0].name,
      report_generated_at: new Date(),
      date_range: {
        start: startDate || "All time",
        end: endDate || "Present",
      },
      compliance_records: requests.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
