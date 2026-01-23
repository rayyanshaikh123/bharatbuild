const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");

/* ---------------- CONSTANTS ---------------- */
const DEFAULT_LABOUR_RADIUS = 50000; // 50km

/* ---------------- GET AVAILABLE JOBS ---------------- */
router.get("/available", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;

    // Get labour categories and location
    const labourResult = await pool.query(
      `SELECT categories, primary_latitude, primary_longitude FROM labours WHERE id = $1`,
      [labourId],
    );

    const labour = labourResult.rows[0];
    const categories = labour.categories || [];
    const lat = labour.primary_latitude;
    const lon = labour.primary_longitude;

    let query = `
      SELECT lr.*, p.name as project_name, p.location_text, p.latitude, p.longitude, p.geofence, p.geofence_radius
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
      query += ` ORDER BY distance_meters ASC, lr.created_at DESC`;
    } else {
      query += ` ORDER BY lr.created_at DESC`;
    }

    const { rows } = await pool.query(query, params);

    // Calculate can_apply for each job
    const jobs = rows.map((job) => {
      let canApply = true;
      if (lat && lon && job.distance_meters !== null) {
        const projRadius = job.geofence_radius ||
          (job.geofence && job.geofence.type === 'CIRCLE' ? job.geofence.radius_meters : 0) || 0;

        // Union logic: Distance <= LabourRange + ProjectRange
        canApply = parseFloat(job.distance_meters) <= (DEFAULT_LABOUR_RADIUS + projRadius);
      }
      return { ...job, can_apply: canApply };
    });

    res.json({ jobs });
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

    // Check if application is allowed based on distance
    const labourLoc = await pool.query(
      `SELECT primary_latitude, primary_longitude FROM labours WHERE id = $1`,
      [labourId],
    );
    const { primary_latitude: lLat, primary_longitude: lLon } = labourLoc.rows[0];

    if (lLat && lLon) {
      const projLoc = await pool.query(
        `SELECT latitude, longitude, geofence, geofence_radius FROM projects WHERE id = (SELECT project_id FROM labour_requests WHERE id = $1)`,
        [requestId],
      );
      const { latitude: pLat, longitude: pLon, geofence, geofence_radius } = projLoc.rows[0];

      // Use Haversine distance calculation (similar to SQL logic but in JS for validation)
      const R = 6371000; // meters
      const dLat = (pLat - lLat) * Math.PI / 180;
      const dLon = (pLon - lLon) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lLat * Math.PI / 180) * Math.cos(pLat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      const projRadius = geofence_radius ||
        (geofence && geofence.type === 'CIRCLE' ? geofence.radius_meters : 0) || 0;

      if (distance > (DEFAULT_LABOUR_RADIUS + projRadius)) {
        return res.status(403).json({ error: "Job is too far from your primary location" });
      }
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
