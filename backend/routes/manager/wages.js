const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

/* ---------------- GET APPROVED ATTENDANCE FOR WAGES ---------------- */
// Gets attendance records that are APPROVED but don't have a wage record yet
router.get("/unprocessed", managerCheck, async (req, res) => {
    try {
        const managerId = req.user.id;
        const { project_id } = req.query;

        let query = `SELECT a.*, l.name as labour_name, l.phone as labour_phone, l.skill_type, p.name as project_name
                     FROM attendance a
                     JOIN labours l ON a.labour_id = l.id
                     JOIN projects p ON a.project_id = p.id
                     JOIN project_managers pm ON p.id = pm.project_id
                     LEFT JOIN wages w ON a.id = w.attendance_id
                     WHERE pm.manager_id = $1 AND pm.status = 'ACTIVE' 
                       AND a.status = 'APPROVED' 
                       AND w.id IS NULL`;

        const params = [managerId];
        if (project_id) {
            query += " AND a.project_id = $2";
            params.push(project_id);
        }

        const result = await pool.query(query, params);
        res.json({ attendance: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- GENERATE WAGES ---------------- */
router.post("/generate", managerCheck, async (req, res) => {
    const client = await pool.connect();
    try {
        const managerId = req.user.id;
        const { wage_data } = req.body; // Array of { attendance_id, wage_type, rate }

        if (!Array.isArray(wage_data)) {
            return res.status(400).json({ error: "wage_data must be an array" });
        }

        await client.query("BEGIN");

        const createdWages = [];
        for (const item of wage_data) {
            const { attendance_id, wage_type, rate } = item;

            // Get attendance details to calculate total_amount
            const attRes = await client.query(
                `SELECT a.* FROM attendance a 
                 JOIN project_managers pm ON a.project_id = pm.project_id
                 WHERE a.id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
                [attendance_id, managerId]
            );

            if (attRes.rows.length === 0) continue;

            const att = attRes.rows[0];
            let total_amount = rate;
            if (wage_type === 'HOURLY') {
                total_amount = rate * (att.work_hours || 0);
            }

            const wageRes = await client.query(
                `INSERT INTO wages (attendance_id, labour_id, project_id, wage_type, rate, total_amount, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
                 ON CONFLICT (attendance_id) DO NOTHING
                 RETURNING *`,
                [attendance_id, att.labour_id, att.project_id, wage_type, rate, total_amount]
            );

            if (wageRes.rows.length > 0) {
                createdWages.push(wageRes.rows[0]);
            }
        }

        await client.query("COMMIT");
        res.status(201).json({ wages: createdWages });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
    }
});

/* ---------------- GET WAGE HISTORY ---------------- */
router.get("/history", managerCheck, async (req, res) => {
    try {
        const managerId = req.user.id;
        const { project_id, status } = req.query;

        let query = `SELECT w.*, l.name as labour_name, p.name as project_name, a.attendance_date
                     FROM wages w
                     JOIN labours l ON w.labour_id = l.id
                     JOIN projects p ON w.project_id = p.id
                     JOIN project_managers pm ON p.id = pm.project_id
                     JOIN attendance a ON w.attendance_id = a.id
                     WHERE pm.manager_id = $1 AND pm.status = 'ACTIVE'`;

        let params = [managerId];

        if (project_id) {
            query += " AND w.project_id = $2";
            params.push(project_id);
        }

        if (status) {
            query += ` AND w.status = $${params.length + 1}`;
            params.push(status);
        }

        query += " ORDER BY w.created_at DESC";
        const result = await pool.query(query, params);
        res.json({ wages: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- APPROVE/REJECT WAGE ---------------- */
router.patch("/review/:id", managerCheck, async (req, res) => {
    try {
        const managerId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const verifyRes = await pool.query(
            `SELECT w.id FROM wages w
             JOIN project_managers pm ON w.project_id = pm.project_id
             WHERE w.id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
            [id, managerId]
        );

        if (verifyRes.rows.length === 0) {
            return res.status(403).json({ error: "Access denied" });
        }

        const result = await pool.query(
            `UPDATE wages SET status = $1, approved_by = $2, approved_at = NOW()
             WHERE id = $3 RETURNING *`,
            [status, managerId, id]
        );

        res.json({ wage: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
