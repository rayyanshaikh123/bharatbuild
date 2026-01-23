const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");

const { verifyEngineerAccess } = require("../../util/engineerPermissions");

/* ---------------- GET PROJECT STOCK LEVELS ---------------- */
router.get("/stock/:projectId", engineerCheck, async (req, res) => {
    try {
        const engineerId = req.user.id;
        const { projectId } = req.params;

        const access = await verifyEngineerAccess(engineerId, projectId);
        if (!access.allowed) {
            return res.status(403).json({ error: access.error });
        }

        // Calculate aggregated stock (IN - OUT + ADJUSTMENT)
        // Note: This is a simplified view. In reality, we might want to group by material_name and category.
        const result = await pool.query(
            `SELECT material_name, category, unit,
              SUM(CASE WHEN movement_type = 'IN' THEN quantity 
                       WHEN movement_type = 'OUT' THEN -quantity 
                       WHEN movement_type = 'ADJUSTMENT' THEN quantity 
                       ELSE 0 END) as current_stock
       FROM material_ledger
       WHERE project_id = $1
       GROUP BY material_name, category, unit
       HAVING SUM(CASE WHEN movement_type = 'IN' THEN quantity 
                       WHEN movement_type = 'OUT' THEN -quantity 
                       WHEN movement_type = 'ADJUSTMENT' THEN quantity 
                       ELSE 0 END) != 0`,
            [projectId],
        );

        res.json({ stock: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- RECORD MANUAL MOVEMENT (e.g. ISSUE MATERIAL) ---------------- */
router.post("/movement", engineerCheck, async (req, res) => {
    try {
        const engineerId = req.user.id;
        const {
            project_id,
            material_name,
            category,
            quantity,
            unit,
            movement_type,
            source,
            remarks,
        } = req.body;

        const access = await verifyEngineerAccess(engineerId, project_id);
        if (!access.allowed) {
            return res.status(403).json({ error: access.error });
        }

        const result = await pool.query(
            `INSERT INTO material_ledger (project_id, material_name, category, quantity, unit, movement_type, source, remarks, recorded_by, recorded_by_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'SITE_ENGINEER') RETURNING *`,
            [
                project_id,
                material_name,
                category,
                quantity,
                unit,
                movement_type, // 'IN', 'OUT', 'ADJUSTMENT'
                source || 'MANUAL',
                remarks || null,
                engineerId,
            ],
        );

        res.status(201).json({ entry: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- GET LEDGER HISTORY ---------------- */
router.get("/history/:projectId", engineerCheck, async (req, res) => {
    try {
        const engineerId = req.user.id;
        const { projectId } = req.params;

        const access = await verifyEngineerAccess(engineerId, projectId);
        if (!access.allowed) {
            return res.status(403).json({ error: access.error });
        }

        const result = await pool.query(
            `SELECT * FROM material_ledger
       WHERE project_id = $1
       ORDER BY created_at DESC`,
            [projectId],
        );

        res.json({ history: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
