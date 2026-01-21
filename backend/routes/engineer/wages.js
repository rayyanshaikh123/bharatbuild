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

/* ---------------- GET WAGE QUEUE (PRESENT LABOURERS) ---------------- */
router.get("/queue", engineerCheck, async (req, res) => {
    try {
        const engineerId = req.user.id;
        const { projectId, date } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];

        if (!projectId) return res.status(400).json({ error: "projectId is required" });

        const isActive = await engineerProjectStatusCheck(engineerId, projectId);
        if (!isActive) return res.status(403).json({ error: "Access denied." });

        // Get approved attendance records for which wages aren't set yet
        const result = await pool.query(
            `SELECT a.id as attendance_id, a.labour_id, l.name, l.phone, l.skill_type, w.rate, w.id as wage_id
             FROM attendance a
             JOIN labours l ON a.labour_id = l.id
             LEFT JOIN wages w ON a.id = w.attendance_id
             WHERE a.project_id = $1 
               AND a.attendance_date = $2 
               AND a.status = 'APPROVED'`,
            [projectId, reportDate]
        );

        res.json({ queue: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- SUBMIT WAGE RATE ---------------- */
router.post("/submit", engineerCheck, async (req, res) => {
    try {
        const engineerId = req.user.id;
        const { attendanceId, rate, labourId, projectId } = req.body;

        if (!attendanceId || !rate) return res.status(400).json({ error: "Missing required fields" });

        // Verify attendance exists and is approved
        const attCheck = await pool.query(
            "SELECT project_id FROM attendance WHERE id = $1 AND status = 'APPROVED'",
            [attendanceId]
        );
        if (attCheck.rows.length === 0) return res.status(404).json({ error: "Approved attendance not found" });

        const isActive = await engineerProjectStatusCheck(engineerId, attCheck.rows[0].project_id);
        if (!isActive) return res.status(403).json({ error: "Access denied." });

        const totalAmount = parseFloat(rate); // For daily, rate = total

        const result = await pool.query(
            `INSERT INTO wages (attendance_id, labour_id, project_id, rate, total_amount, status)
             VALUES ($1, $2, $3, $4, $5, 'PENDING')
             ON CONFLICT (attendance_id) 
             DO UPDATE SET rate = $4, total_amount = $5, status = 'PENDING'
             RETURNING *`,
            [attendanceId, labourId, projectId, rate, totalAmount]
        );

        res.json({ wage: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
