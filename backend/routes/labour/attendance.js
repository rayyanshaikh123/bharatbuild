const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");

/* ---------------- CHECK-IN ---------------- */
router.post("/check-in", labourCheck, async (req, res) => {
    try {
        const labourId = req.user.id;
        const { project_id, latitude, longitude } = req.body;

        if (!project_id) {
            return res.status(400).json({ error: "Project ID is required" });
        }

        // 1. Verify if labour is approved for this project (or a request tied to it)
        // For simplicity, we check if they have an APPROVED application for a request in this project
        const approvedCheck = await pool.query(
            `SELECT lrp.id 
             FROM labour_request_participants lrp
             JOIN labour_requests lr ON lrp.labour_request_id = lr.id
             WHERE lrp.labour_id = $1 AND lr.project_id = $2 AND lrp.status = 'APPROVED'`,
            [labourId, project_id]
        );

        if (approvedCheck.rows.length === 0) {
            return res.status(403).json({ error: "You are not approved for this project" });
        }

        // 2. Check if already checked in today (and not checked out)
        const activeCheck = await pool.query(
            `SELECT id FROM attendance 
             WHERE labour_id = $1 AND attendance_date = CURRENT_DATE AND check_out IS NULL`,
            [labourId]
        );

        if (activeCheck.rows.length > 0) {
            return res.status(400).json({ error: "Already checked in" });
        }

        // 3. Insert attendance record
        // We set status to 'PENDING_APPROVAL' as site engineers might need to verify
        const result = await pool.query(
            `INSERT INTO attendance (labour_id, project_id, attendance_date, check_in, status)
             VALUES ($1, $2, CURRENT_DATE, CURRENT_TIMESTAMP, 'PENDING')
             RETURNING *`,
            [labourId, project_id]
        );

        res.status(201).json({ attendance: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- CHECK-OUT ---------------- */
router.post("/check-out", labourCheck, async (req, res) => {
    try {
        const labourId = req.user.id;

        // Find active attendance
        const activeRes = await pool.query(
            `SELECT id, check_in FROM attendance 
             WHERE labour_id = $1 AND check_out IS NULL 
             ORDER BY check_in DESC LIMIT 1`,
            [labourId]
        );

        if (activeRes.rows.length === 0) {
            return res.status(400).json({ error: "No active check-in found" });
        }

        const attendanceId = activeRes.rows[0].id;

        // Update with check-out and calculate hours (simplified)
        const result = await pool.query(
            `UPDATE attendance 
             SET check_out = CURRENT_TIMESTAMP,
                 hours = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - check_in)) / 3600
             WHERE id = $1
             RETURNING *`,
            [attendanceId]
        );

        res.json({ attendance: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- GET ATTENDANCE HISTORY ---------------- */
router.get("/history", labourCheck, async (req, res) => {
    try {
        const labourId = req.user.id;
        const result = await pool.query(
            `SELECT a.*, p.name as project_name
             FROM attendance a
             JOIN projects p ON a.project_id = p.id
             WHERE a.labour_id = $1
             ORDER BY a.attendance_date DESC, a.check_in DESC`,
            [labourId]
        );
        res.json({ history: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- GET TODAY'S STATUS ---------------- */
router.get("/today", labourCheck, async (req, res) => {
    try {
        const labourId = req.user.id;
        const result = await pool.query(
            `SELECT a.*, p.name as project_name
             FROM attendance a
             JOIN projects p ON a.project_id = p.id
             WHERE a.labour_id = $1 AND a.attendance_date = CURRENT_DATE
             ORDER BY a.check_in DESC LIMIT 1`,
            [labourId]
        );
        res.json({ attendance: result.rows[0] || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
