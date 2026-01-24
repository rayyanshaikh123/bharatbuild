const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");

/* ---------------- GET ALL PROJECTS (for map view) ---------------- */
router.get("/all", labourCheck, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, location_text, latitude, longitude, 
              start_date, end_date, geofence, geofence_radius,
              (SELECT MAX(hourly_rate) * 8 FROM wage_rates wr WHERE wr.project_id = projects.id) as wage
       FROM projects 
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 100`,
        );

        res.json({ projects: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
