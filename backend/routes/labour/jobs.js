const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");

/* ---------------- GET AVAILABLE JOBS ---------------- */
router.get("/available", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;

    // Get labour categories and location to suggest better jobs
    const labourResult = await pool.query(
      `SELECT categories, primary_latitude, primary_longitude FROM labours WHERE id = $1`,
      [labourId],
    );

    const labour = labourResult.rows[0];
    const categories = labour.categories || [];
    const lat = labour.primary_latitude;
    const lon = labour.primary_longitude;

    let query = `
      SELECT lr.*, p.name as project_name, p.location_text, p.latitude, p.longitude, p.geofence
    `;

    const params = [];
    let paramIdx = 1;

    if (lat && lon) {
      query += `, 
            (6371000 * acos(
              cos(radians($1)) * cos(radians(
                CASE 
                  WHEN p.geofence IS NOT NULL AND p.geofence->>'type' = 'CIRCLE' 
                  THEN CAST(p.geofence->'center'->>'lat' AS NUMERIC)
                  ELSE p.latitude 
                END
              )) * cos(radians(
                CASE 
                  WHEN p.geofence IS NOT NULL AND p.geofence->>'type' = 'CIRCLE' 
                  THEN CAST(p.geofence->'center'->>'lng' AS NUMERIC)
                  ELSE p.longitude 
                END
              ) - radians($2)) + sin(radians($1)) * sin(radians(
                CASE 
                  WHEN p.geofence IS NOT NULL AND p.geofence->>'type' = 'CIRCLE' 
                  THEN CAST(p.geofence->'center'->>'lat' AS NUMERIC)
                  ELSE p.latitude 
                END
              ))
            )) AS distance_meters
            `;
      params.push(lat, lon);
      paramIdx = 3;
    }

    query += `
      FROM labour_requests lr
      JOIN projects p ON lr.project_id = p.id
      WHERE lr.status = 'OPEN'
      AND lr.request_date >= CURRENT_DATE
    `;

    // Optional: Filter by labour's registered categories if any
    if (categories.length > 0) {
      query += ` AND lr.category = ANY($${paramIdx})`;
      params.push(categories);
      paramIdx++;
    }

    if (lat && lon) {
      query += ` ORDER BY distance_meters ASC, lr.created_at DESC LIMIT 20`;
    } else {
      query += ` ORDER BY lr.created_at DESC LIMIT 20`;
    }

    const result = await pool.query(query, params);
    res.json({ jobs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- APPLY FOR A JOB ---------------- */
router.post("/:id/apply", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const requestId = req.params.id;

    // Check if request is still OPEN
    const requestCheck = await pool.query(
      `SELECT status FROM labour_requests WHERE id = $1`,
      [requestId],
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (requestCheck.rows[0].status !== "OPEN") {
      return res.status(400).json({ error: "Job is no longer open" });
    }

    // Check if already applied
    const participantCheck = await pool.query(
      `SELECT * FROM labour_request_participants WHERE labour_request_id = $1 AND labour_id = $2`,
      [requestId, labourId],
    );

    if (participantCheck.rows.length > 0) {
      return res.status(400).json({ error: "Already applied" });
    }

    // Add to participants
    await pool.query(
      `INSERT INTO labour_request_participants (labour_request_id, labour_id, status) VALUES ($1, $2, 'PENDING')`,
      [requestId, labourId],
    );

    res.json({ message: "Applied successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET MY APPLICATIONS ---------------- */
router.get("/my-applications", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    // Return all applications with project geofence data, regardless of status
    const result = await pool.query(
      `SELECT lrp.*, lr.category, lr.request_date, lr.project_id, 
              p.name as project_name, p.location_text, p.latitude, p.longitude, p.geofence,
              p.status as project_status
             FROM labour_request_participants lrp
             JOIN labour_requests lr ON lrp.labour_request_id = lr.id
             JOIN projects p ON lr.project_id = p.id
             WHERE lrp.labour_id = $1
             ORDER BY 
               CASE lrp.status 
                 WHEN 'APPROVED' THEN 1 
                 WHEN 'PENDING' THEN 2 
                 WHEN 'REJECTED' THEN 3 
                 ELSE 4 
               END,
               lrp.joined_at DESC`,
      [labourId],
    );
    res.json({ applications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET JOB DETAILS ---------------- */
router.get("/:id", labourCheck, async (req, res) => {
  try {
    const requestId = req.params.id;
    const result = await pool.query(
      `SELECT lr.*, p.name as project_name, p.location_text, p.latitude, p.longitude, p.geofence,
                    p.description as project_description, p.budget, p.status as project_status
             FROM labour_requests lr
             JOIN projects p ON lr.project_id = p.id
             WHERE lr.id = $1`,
      [requestId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ job: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
