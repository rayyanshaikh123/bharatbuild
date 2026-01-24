const express = require("express");
const router = express.Router();
const pool = require("../../db");
const managerCheck = require("../../middleware/managerCheck");

/* ============================================================
   DANGEROUS WORK AUTHORIZATION - MANAGER (READ-ONLY)
   ============================================================
   Purpose: Compliance and audit oversight of dangerous work
   Access: View all dangerous tasks and requests for assigned projects
   ============================================================ */

/* -------------------- GET DANGEROUS TASKS FOR PROJECT -------------------- */
router.get("/tasks", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Verify manager is assigned to this project
    const projectCheck = await pool.query(
      `SELECT pm.id 
       FROM project_managers pm
       WHERE pm.project_id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
      [projectId, managerId],
    );

    if (projectCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not assigned to this project" });
    }

    // Get all dangerous tasks for this project with statistics
    const result = await pool.query(
      `SELECT 
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
         COUNT(DISTINCT dtr.id) AS total_requests,
         COUNT(DISTINCT CASE WHEN dtr.status = 'APPROVED' THEN dtr.id END) AS approved_requests,
         COUNT(DISTINCT CASE WHEN dtr.status = 'REQUESTED' THEN dtr.id END) AS pending_requests,
         COUNT(DISTINCT CASE WHEN dtr.status = 'REJECTED' THEN dtr.id END) AS rejected_requests,
         COUNT(DISTINCT CASE WHEN dtr.status = 'EXPIRED' THEN dtr.id END) AS expired_requests
       FROM dangerous_tasks dt
       JOIN site_engineers se ON dt.created_by = se.id
       JOIN projects p ON dt.project_id = p.id
       LEFT JOIN dangerous_task_requests dtr ON dt.id = dtr.dangerous_task_id
       WHERE dt.project_id = $1
       GROUP BY dt.id, se.name, p.name
       ORDER BY dt.is_active DESC, dt.created_at DESC`,
      [projectId],
    );

    res.json({ dangerous_tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------- GET TASK REQUESTS FOR PROJECT -------------------- */
router.get("/requests", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId, status, labourId, taskId, startDate, endDate } =
      req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Verify manager is assigned to this project
    const projectCheck = await pool.query(
      `SELECT pm.id 
       FROM project_managers pm
       WHERE pm.project_id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
      [projectId, managerId],
    );

    if (projectCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not assigned to this project" });
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
        p.name AS project_name
      FROM dangerous_task_requests dtr
      JOIN dangerous_tasks dt ON dtr.dangerous_task_id = dt.id
      JOIN labours l ON dtr.labour_id = l.id
      JOIN projects p ON dtr.project_id = p.id
      LEFT JOIN site_engineers ase ON dtr.approved_by = ase.id
      WHERE dtr.project_id = $1
    `;

    const params = [projectId];
    let paramIndex = 2;

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

/* -------------------- GET DANGEROUS WORK STATISTICS -------------------- */
router.get("/statistics", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId, startDate, endDate } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Verify manager is assigned to this project
    const projectCheck = await pool.query(
      `SELECT pm.id 
       FROM project_managers pm
       WHERE pm.project_id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
      [projectId, managerId],
    );

    if (projectCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not assigned to this project" });
    }

    let dateFilter = "";
    const params = [projectId];
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

    // Get comprehensive statistics
    const stats = await pool.query(
      `
      SELECT 
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
        ) AS avg_approval_time_minutes
      FROM dangerous_tasks dt
      LEFT JOIN dangerous_task_requests dtr ON dt.id = dtr.dangerous_task_id ${dateFilter}
      WHERE dt.project_id = $1
    `,
      params,
    );

    // Get top dangerous tasks by request count
    const topTasks = await pool.query(
      `
      SELECT 
        dt.id,
        dt.name,
        dt.is_active,
        COUNT(dtr.id) AS request_count,
        COUNT(CASE WHEN dtr.status = 'APPROVED' THEN 1 END) AS approved_count
      FROM dangerous_tasks dt
      LEFT JOIN dangerous_task_requests dtr ON dt.id = dtr.dangerous_task_id ${dateFilter}
      WHERE dt.project_id = $1
      GROUP BY dt.id, dt.name, dt.is_active
      ORDER BY request_count DESC
      LIMIT 10
    `,
      params,
    );

    // Get labour safety compliance (who's requesting dangerous work most)
    const labourStats = await pool.query(
      `
      SELECT 
        l.id,
        l.name,
        l.skill_type,
        COUNT(dtr.id) AS total_requests,
        COUNT(CASE WHEN dtr.status = 'APPROVED' THEN 1 END) AS approved_requests,
        COUNT(CASE WHEN dtr.status = 'EXPIRED' THEN 1 END) AS expired_requests
      FROM dangerous_task_requests dtr
      JOIN labours l ON dtr.labour_id = l.id
      WHERE dtr.project_id = $1 ${dateFilter}
      GROUP BY l.id, l.name, l.skill_type
      ORDER BY total_requests DESC
      LIMIT 20
    `,
      params,
    );

    res.json({
      statistics: stats.rows[0],
      top_dangerous_tasks: topTasks.rows,
      labour_compliance: labourStats.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------- GET LABOUR DANGEROUS WORK HISTORY -------------------- */
router.get("/labour/:labourId/history", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { labourId } = req.params;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Verify manager is assigned to this project
    const projectCheck = await pool.query(
      `SELECT pm.id 
       FROM project_managers pm
       WHERE pm.project_id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
      [projectId, managerId],
    );

    if (projectCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not assigned to this project" });
    }

    // Get labour's dangerous work history
    const result = await pool.query(
      `
      SELECT 
        dtr.id,
        dtr.dangerous_task_id,
        dtr.status,
        dtr.requested_at,
        dtr.approved_at,
        dt.name AS task_name,
        dt.description AS task_description,
        se.name AS approved_by_name,
        p.name AS project_name
      FROM dangerous_task_requests dtr
      JOIN dangerous_tasks dt ON dtr.dangerous_task_id = dt.id
      JOIN projects p ON dtr.project_id = p.id
      LEFT JOIN site_engineers se ON dtr.approved_by = se.id
      WHERE dtr.labour_id = $1 AND dtr.project_id = $2
      ORDER BY dtr.requested_at DESC
    `,
      [labourId, projectId],
    );

    res.json({ history: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
