const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");

/* ---------------- GET ALL PROJECTS (for map view) ---------------- */
router.get("/all", labourCheck, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT p.id, p.name, p.location_text, p.latitude, p.longitude, 
              p.start_date, p.end_date, p.geofence, p.geofence_radius, p.created_at,
              (SELECT MAX(hourly_rate) * 8 FROM wage_rates wr WHERE wr.project_id = p.id) as wage
       FROM projects p
       JOIN labour_requests lr ON p.id = lr.project_id
       WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
       AND lr.status = 'OPEN'
       AND lr.request_date >= CURRENT_DATE
       AND (SELECT COUNT(*) FROM attendance WHERE project_id = lr.project_id AND attendance_date = lr.request_date AND status = 'APPROVED') < lr.required_count
       ORDER BY p.created_at DESC
       LIMIT 100`,
        );

        res.json({ projects: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
