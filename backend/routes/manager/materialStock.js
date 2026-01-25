const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

// Check if manager is ACTIVE in the project
async function managerProjectStatusCheck(managerId, projectId) {
  const statusResult = await pool.query(
    `SELECT count(*) FROM project_managers
     WHERE manager_id = $1 AND project_id = $2 AND status = 'ACTIVE'
     UNION
     SELECT count(*) FROM projects WHERE id = $2 AND created_by = $1`,
    [managerId, projectId],
  );
  return (
    statusResult.rows.length > 0 && parseInt(statusResult.rows[0].count) > 0
  );
}

/* ---------------- GET PROJECT MATERIAL STOCK ---------------- */
router.get(
  "/projects/:projectId/material-stock",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId } = req.params;

      // Check if manager is ACTIVE in project
      const isActive = await managerProjectStatusCheck(managerId, projectId);
      if (!isActive) {
        return res.status(403).json({
          error: "Access denied. Not an active manager in the project.",
        });
      }

      const result = await pool.query(
        `SELECT 
        id,
        project_id,
        material_name,
        category,
        unit,
        available_quantity,
        last_updated_at
       FROM project_material_stock
       WHERE project_id = $1
       ORDER BY material_name, unit`,
        [projectId],
      );

      res.json({ stock: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET MATERIAL CONSUMPTION RECORDS ---------------- */
router.get(
  "/projects/:projectId/material-consumption",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId } = req.params;

      // Check if manager is ACTIVE in project
      const isActive = await managerProjectStatusCheck(managerId, projectId);
      if (!isActive) {
        return res.status(403).json({
          error: "Access denied. Not an active manager in the project.",
        });
      }

      const result = await pool.query(
        `SELECT 
        mcr.id,
        mcr.project_id,
        mcr.dpr_id,
        mcr.material_name,
        mcr.unit,
        mcr.quantity_used,
        mcr.recorded_at,
        mcr.recorded_by,
        mcr.recorded_by_role,
        d.report_date,
        d.title as dpr_title,
        se.name as engineer_name
       FROM material_consumption_records mcr
       LEFT JOIN dprs d ON mcr.dpr_id = d.id
       LEFT JOIN site_engineers se ON d.site_engineer_id = se.id
       WHERE mcr.project_id = $1
       ORDER BY mcr.recorded_at DESC`,
        [projectId],
      );

      res.json({ consumption: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET MATERIAL STOCK SUMMARY ---------------- */
router.get(
  "/projects/:projectId/stock-summary",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId } = req.params;

      // Check if manager is ACTIVE in project
      const isActive = await managerProjectStatusCheck(managerId, projectId);
      if (!isActive) {
        return res.status(403).json({
          error: "Access denied. Not an active manager in the project.",
        });
      }

      // Get aggregated stock summary with consumption
      const result = await pool.query(
        `SELECT 
        s.material_name,
        s.category,
        s.unit,
        s.available_quantity as current_stock,
        COALESCE(SUM(c.quantity_used), 0) as total_consumed,
        s.last_updated_at
       FROM project_material_stock s
       LEFT JOIN material_consumption_records c 
         ON s.project_id = c.project_id 
         AND s.material_name = c.material_name
         AND s.unit = c.unit
       WHERE s.project_id = $1
       GROUP BY s.id, s.material_name, s.category, s.unit, s.available_quantity, s.last_updated_at
       ORDER BY s.material_name, s.unit`,
        [projectId],
      );

      res.json({ summary: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
