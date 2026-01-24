const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");

/* ---------------- GET WAGE HISTORY & ANALYTICS ---------------- */
router.get("/my-wages", labourCheck, async (req, res) => {
    try {
        const labourId = req.user.id;

        // 1. Get all wages for this labour with project details
        const wagesResult = await pool.query(
            `SELECT w.id, w.attendance_id, w.wage_type, w.rate, w.total_amount, 
              w.status, w.approved_at, w.created_at, w.worked_hours,
              w.is_ready_for_payment, w.paid_at,
              p.name as project_name, p.location_text,
              a.attendance_date
       FROM wages w
       JOIN projects p ON w.project_id = p.id
       JOIN attendance a ON w.attendance_id = a.id
       WHERE w.labour_id = $1
       ORDER BY a.attendance_date DESC`,
            [labourId],
        );

        // 2. Calculate Analytics
        const analyticsResult = await pool.query(
            `SELECT 
        COUNT(*) filter (where status = 'APPROVED') as total_approved_days,
        SUM(total_amount) filter (where status = 'APPROVED') as total_earnings,
        SUM(total_amount) filter (where status = 'PENDING') as pending_earnings,
        SUM(total_amount) filter (where status = 'APPROVED' AND paid_at IS NULL) as unpaid_earnings,
        SUM(total_amount) filter (where paid_at IS NOT NULL) as paid_earnings
       FROM wages
       WHERE labour_id = $1`,
            [labourId],
        );

        // 3. Weekly breakdown (last 4 weeks)
        const weeklyResult = await pool.query(
            `SELECT 
        DATE_TRUNC('week', a.attendance_date) as week_start,
        SUM(w.total_amount) as amount
       FROM wages w
       JOIN attendance a ON w.attendance_id = a.id
       WHERE w.labour_id = $1 AND w.status = 'APPROVED'
       GROUP BY week_start
       ORDER BY week_start DESC
       LIMIT 4`,
            [labourId],
        );

        res.json({
            wages: wagesResult.rows,
            summary: analyticsResult.rows[0],
            weekly_stats: weeklyResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
