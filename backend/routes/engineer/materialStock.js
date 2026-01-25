const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const { verifyEngineerAccess } = require("../../util/engineerPermissions");

/* ---------------- VIEW PROJECT MATERIAL STOCK (READ-ONLY) ---------------- */
router.get(
  "/projects/:projectId/material-stock",
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId } = req.params;

      // Verify engineer has access to this project
      const isActive = await verifyEngineerAccess(engineerId, projectId);
      if (!isActive.allowed) {
        return res.status(403).json({ error: isActive.error });
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

module.exports = router;
