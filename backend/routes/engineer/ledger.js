const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");

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

/* ---------------- GET PROJECT STOCK LEVELS ---------------- */
router.get("/stock/:projectId", engineerCheck, async (req, res) => {
    try {
        const engineerId = req.user.id;
        const { projectId } = req.params;

        const isActive = await engineerProjectStatusCheck(engineerId, projectId);
        if (!isActive) return res.status(403).json({ error: "Access denied." });

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

        const isActive = await engineerProjectStatusCheck(engineerId, project_id);
        if (!isActive) return res.status(403).json({ error: "Access denied." });

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

        const isActive = await engineerProjectStatusCheck(engineerId, projectId);
        if (!isActive) return res.status(403).json({ error: "Access denied." });

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
