const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");
const { validateGeofence } = require("../../util/geofence");

/* ---------------- CHECK-IN ---------------- */
router.post("/check-in", labourCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const labourId = req.user.id;
    const { project_id, latitude, longitude } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    if (latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    // 1. Verify if labour is approved for this project
    const approvedCheck = await client.query(
      `SELECT lrp.id 
             FROM labour_request_participants lrp
             JOIN labour_requests lr ON lrp.labour_request_id = lr.id
             WHERE lrp.labour_id = $1 AND lr.project_id = $2 AND lrp.status = 'APPROVED'`,
      [labourId, project_id],
    );

    if (approvedCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not approved for this project" });
    }

    // 2. Validate geofence
    const geofenceResult = await validateGeofence(
      client,
      project_id,
      latitude,
      longitude,
    );

    if (!geofenceResult.isValid) {
      return res.status(403).json({
        error: "You are outside the project geofence area",
        distance: geofenceResult.distance,
        allowedRadius: geofenceResult.allowedRadius,
      });
    }

    await client.query("BEGIN");

    // 3. Get or create attendance record for today
    let attendanceRes = await client.query(
      `SELECT id, entry_exit_count, max_allowed_exits FROM attendance 
             WHERE labour_id = $1 AND project_id = $2 AND attendance_date = CURRENT_DATE`,
      [labourId, project_id],
    );

    let attendanceId;
    if (attendanceRes.rows.length === 0) {
      // Create new attendance record
      const newAttendance = await client.query(
        `INSERT INTO attendance (labour_id, project_id, attendance_date, status, last_event_at)
               VALUES ($1, $2, CURRENT_DATE, 'PENDING', CURRENT_TIMESTAMP)
               RETURNING id, entry_exit_count, max_allowed_exits`,
        [labourId, project_id],
      );
      attendanceId = newAttendance.rows[0].id;
    } else {
      attendanceId = attendanceRes.rows[0].id;
    }

    // 4. Check for active session (not checked out)
    const activeSession = await client.query(
      `SELECT id FROM attendance_sessions 
             WHERE attendance_id = $1 AND check_out_time IS NULL`,
      [attendanceId],
    );

    if (activeSession.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Already checked in" });
    }

    // 5. Create new session
    const sessionRes = await client.query(
      `INSERT INTO attendance_sessions (attendance_id, check_in_time)
             VALUES ($1, CURRENT_TIMESTAMP)
             RETURNING id, check_in_time`,
      [attendanceId],
    );

    // 6. Update attendance last_event_at
    await client.query(
      `UPDATE attendance SET last_event_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [attendanceId],
    );

    await client.query("COMMIT");

    res.status(201).json({
      attendance_id: attendanceId,
      session: sessionRes.rows[0],
      message: "Checked in successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- CHECK-OUT ---------------- */
router.post("/check-out", labourCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const labourId = req.user.id;

    await client.query("BEGIN");

    // 1. Find active session
    const sessionRes = await client.query(
      `SELECT s.id, s.attendance_id, s.check_in_time, a.entry_exit_count, a.max_allowed_exits
             FROM attendance_sessions s
             JOIN attendance a ON s.attendance_id = a.id
             WHERE a.labour_id = $1 AND s.check_out_time IS NULL
             ORDER BY s.check_in_time DESC LIMIT 1`,
      [labourId],
    );

    if (sessionRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No active check-in found" });
    }

    const {
      id: sessionId,
      attendance_id,
      entry_exit_count,
      max_allowed_exits,
    } = sessionRes.rows[0];

    // 2. Check exit limit
    if (entry_exit_count >= max_allowed_exits) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Maximum exit limit reached for today",
        limit: max_allowed_exits,
      });
    }

    // 3. Close session
    const updatedSession = await client.query(
      `UPDATE attendance_sessions 
             SET check_out_time = CURRENT_TIMESTAMP,
                 worked_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - check_in_time)) / 60
             WHERE id = $1
             RETURNING *`,
      [sessionId],
    );

    // 4. Increment exit count and update last_event_at
    await client.query(
      `UPDATE attendance 
             SET entry_exit_count = entry_exit_count + 1,
                 last_event_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
      [attendance_id],
    );

    // 5. Calculate total work hours from all sessions
    const totalRes = await client.query(
      `SELECT SUM(worked_minutes) as total_minutes 
             FROM attendance_sessions 
             WHERE attendance_id = $1 AND check_out_time IS NOT NULL`,
      [attendance_id],
    );

    const work_hours = (totalRes.rows[0].total_minutes || 0) / 60;

    // 6. Update attendance work_hours
    await client.query(`UPDATE attendance SET work_hours = $1 WHERE id = $2`, [
      work_hours,
      attendance_id,
    ]);

    await client.query("COMMIT");

    res.json({
      session: updatedSession.rows[0],
      total_work_hours: work_hours,
      exits_used: entry_exit_count + 1,
      exits_remaining: max_allowed_exits - entry_exit_count - 1,
      message: "Checked out successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GET ATTENDANCE HISTORY ---------------- */
router.get("/history", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const result = await pool.query(
      `SELECT a.id, a.project_id, a.labour_id, a.attendance_date, a.status,
              a.work_hours, a.entry_exit_count, a.max_allowed_exits,
              p.name as project_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'session_id', s.id,
                    'check_in', s.check_in_time,
                    'check_out', s.check_out_time,
                    'worked_minutes', s.worked_minutes
                  ) ORDER BY s.check_in_time
                ) FILTER (WHERE s.id IS NOT NULL),
                '[]'
              ) as sessions
       FROM attendance a
       JOIN projects p ON a.project_id = p.id
       LEFT JOIN attendance_sessions s ON a.id = s.attendance_id
       WHERE a.labour_id = $1
       GROUP BY a.id, p.name
       ORDER BY a.attendance_date DESC`,
      [labourId],
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
      `SELECT a.id, a.project_id, a.labour_id, a.attendance_date, a.status,
              a.work_hours, a.entry_exit_count, a.max_allowed_exits,
              p.name as project_name, p.geofence_radius,
              (
                SELECT json_build_object(
                  'session_id', s.id,
                  'check_in', s.check_in_time,
                  'is_active', s.check_out_time IS NULL
                )
                FROM attendance_sessions s 
                WHERE s.attendance_id = a.id AND s.check_out_time IS NULL
                LIMIT 1
              ) as active_session
       FROM attendance a
       JOIN projects p ON a.project_id = p.id
       WHERE a.labour_id = $1 AND a.attendance_date = CURRENT_DATE
       ORDER BY a.id DESC LIMIT 1`,
      [labourId],
    );
    res.json({ attendance: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
