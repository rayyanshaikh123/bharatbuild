const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");
const { validateGeofence } = require("../../util/geofence");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");
const { checkCategoryCapacity } = require("../../util/wageCalculator");
const { getISTDate, getISTHour } = require("../../util/dateUtils");

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

    // 1. Check if labour is blacklisted for this organization (within 3 days)
    const orgRes = await client.query(
      `SELECT org_id FROM projects WHERE id = $1`,
      [project_id],
    );
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const orgId = orgRes.rows[0].org_id;

    const blacklistCheck = await client.query(
      `SELECT id, created_at FROM organization_blacklist 
       WHERE org_id = $1 AND labour_id = $2 
       AND created_at + interval '3 days' > NOW()`,
      [orgId, labourId],
    );

    if (blacklistCheck.rows.length > 0) {
      const blacklistedAt = new Date(blacklistCheck.rows[0].created_at);
      const expiresAt = new Date(
        blacklistedAt.getTime() + 3 * 24 * 60 * 60 * 1000,
      );
      const remainingHours = Math.ceil(
        (expiresAt - new Date()) / (1000 * 60 * 60),
      );

      return res.status(403).json({
        error: "You are blacklisted from this organization",
        reason: "Exceeded maximum allowed exits",
        remaining_hours: remainingHours,
      });
    }

    // 2. Verify labour has applied and check category capacity
    const capacityCheck = await checkCategoryCapacity(
      client,
      labourId,
      project_id,
    );

    if (!capacityCheck.hasCapacity) {
      return res.status(403).json({
        error: capacityCheck.error || "Category capacity is full",
        category: capacityCheck.category,
        currentCount: capacityCheck.currentCount,
        requiredCount: capacityCheck.requiredCount,
      });
    }

    // 3. Validate geofence
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

    // 4. Check attendance creation time window (check_in_time + 2 hours buffer)
    const projectRes = await client.query(
      `SELECT check_in_time, check_out_time FROM projects WHERE id = $1`,
      [project_id],
    );

    // 4. Check attendance creation time window (Starting at 4 AM IST)
    const currentHour = getISTHour();
    const today = getISTDate();

    if (currentHour < 4) {
      return res.status(403).json({
        error: "Attendance creation not allowed yet",
        message: "Attendance can only be created after 04:00 AM",
      });
    }

    // 5. Check if project break is active
    const breakCheck = await client.query(
      `SELECT id, ended_at, reason FROM project_breaks 
       WHERE project_id = $1 AND NOW() BETWEEN started_at AND ended_at
       LIMIT 1`,
      [project_id],
    );

    if (breakCheck.rows.length > 0) {
      const activeBreak = breakCheck.rows[0];
      const endTime = new Date(activeBreak.ended_at);
      const remainingMinutes = Math.ceil((endTime - new Date()) / (1000 * 60));

      return res.status(403).json({
        status: "BREAK_ACTIVE",
        error: "Project break is currently active",
        message: `Project break active. Attendance paused until ${endTime.toLocaleTimeString()}`,
        break_ends_at: activeBreak.ended_at,
        remaining_minutes: remainingMinutes,
        reason: activeBreak.reason,
      });
    }

    await client.query("BEGIN");

    // 4. Get or create attendance record for today
    // GEO-FENCE ATTENDANCE: Auto-approved, is_manual=false
    let attendanceRes = await client.query(
      `SELECT id, entry_exit_count, max_allowed_exits FROM attendance 
             WHERE labour_id = $1 AND project_id = $2 AND attendance_date = $3`,
      [labourId, project_id, today],
    );

    let attendanceId;
    let isNewAttendance = false;
    if (attendanceRes.rows.length === 0) {
      // Create new attendance record - AUTO-APPROVED for geo-fence check-in
      const newAttendance = await client.query(
        `INSERT INTO attendance (labour_id, project_id, attendance_date, status, is_manual, last_event_at)
               VALUES ($1, $2, $3, 'APPROVED', false, CURRENT_TIMESTAMP)
               RETURNING id, entry_exit_count, max_allowed_exits`,
        [labourId, project_id, today],
      );
      attendanceId = newAttendance.rows[0].id;
      isNewAttendance = true;
    } else {
      attendanceId = attendanceRes.rows[0].id;
    }

    // 5. Check for active session (not checked out)
    const activeSession = await client.query(
      `SELECT id FROM attendance_sessions 
             WHERE attendance_id = $1 AND check_out_time IS NULL`,
      [attendanceId],
    );

    if (activeSession.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Already checked in" });
    }

    // 6. Create new session
    const sessionRes = await client.query(
      `INSERT INTO attendance_sessions (attendance_id, check_in_time)
             VALUES ($1, CURRENT_TIMESTAMP)
             RETURNING id, check_in_time`,
      [attendanceId],
    );

    // 7. Create wage record if this is a new attendance
    // Wage rate is fetched from wage_rates table (server-side)
    if (isNewAttendance) {
      const labourInfo = await client.query(
        `SELECT skill_type, categories[1] as category FROM labours WHERE id = $1`,
        [labourId],
      );

      const { skill_type, category } = labourInfo.rows[0];

      const rateRes = await client.query(
        `SELECT hourly_rate FROM wage_rates 
         WHERE project_id = $1 AND skill_type = $2 AND category = $3`,
        [project_id, skill_type, category],
      );

      if (rateRes.rows.length > 0) {
        const hourly_rate = rateRes.rows[0].hourly_rate;

        await client.query(
          `INSERT INTO wages (attendance_id, labour_id, project_id, wage_type, rate, total_amount, worked_hours, status)
           VALUES ($1, $2, $3, 'HOURLY', $4, 0, 0, 'PENDING')`,
          [attendanceId, labourId, project_id, hourly_rate],
        );
      }
    }

    // 8. Update attendance last_event_at and location
    await client.query(
      `UPDATE attendance SET last_event_at = CURRENT_TIMESTAMP, 
                            last_known_lat = $2, 
                            last_known_lng = $3,
                            is_currently_breached = false
       WHERE id = $1`,
      [attendanceId, latitude, longitude],
    );

    // 7. Fetch final attendance state for audit
    const finalAttendance = await client.query(
      `SELECT * FROM attendance WHERE id = $1`,
      [attendanceId],
    );

    // 8. Audit log (inside transaction)
    const organizationId = await getOrganizationIdFromProject(
      project_id,
      client,
    );
    await logAudit({
      entityType: "ATTENDANCE",
      entityId: attendanceId,
      category: "ATTENDANCE",
      action: "UPDATE",
      before: null, // Check-in creates/updates attendance
      after: finalAttendance.rows[0],
      user: req.user,
      projectId: project_id,
      organizationId,
      client,
    });

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

    // 2. Check exit limit (Removed enforcement)
    // if (entry_exit_count >= max_allowed_exits) { ... }

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

    // 7. Fetch final attendance state and project_id for audit
    const finalAttendance = await client.query(
      `SELECT a.*, a.project_id FROM attendance a WHERE a.id = $1`,
      [attendance_id],
    );

    const project_id = finalAttendance.rows[0].project_id;

    // 8. Audit log (inside transaction)
    const organizationId = await getOrganizationIdFromProject(
      project_id,
      client,
    );
    await logAudit({
      entityType: "ATTENDANCE",
      entityId: attendance_id,
      category: "ATTENDANCE",
      action: "UPDATE",
      before: null, // Could fetch before state if needed
      after: finalAttendance.rows[0],
      user: req.user,
      projectId: project_id,
      organizationId,
      client,
    });

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
    const today = getISTDate();
    const result = await pool.query(
      `SELECT a.id, a.project_id, a.labour_id, a.attendance_date, a.status,
              a.work_hours, a.entry_exit_count, a.max_allowed_exits,
              p.name as project_name, p.latitude, p.longitude, p.location_text, p.geofence, p.geofence_radius,
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
       WHERE a.labour_id = $1 AND a.attendance_date = $2
       ORDER BY a.id DESC LIMIT 1`,
      [labourId, today],
    );
    res.json({ attendance: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- TRACK LOCATION ---------------- */
router.post("/track", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Coordinates required" });
    }

    // 1. Find active attendance
    const today = getISTDate();
    const attendanceRes = await pool.query(
      `SELECT a.*, p.org_id 
       FROM attendance a
       JOIN projects p ON a.project_id = p.id
       WHERE a.labour_id = $1 AND a.attendance_date = $2 
       ORDER BY a.id DESC LIMIT 1`,
      [labourId, today],
    );

    if (attendanceRes.rows.length === 0) {
      return res.status(404).json({ error: "No active attendance for today" });
    }

    const attendance = attendanceRes.rows[0];
    const projectId = attendance.project_id;
    const orgId = attendance.org_id;
    const maxAllowedExits = attendance.max_allowed_exits || 3;

    // 2. Check if project break is active
    const breakCheck = await pool.query(
      `SELECT id, ended_at, reason FROM project_breaks 
       WHERE project_id = $1 AND NOW() BETWEEN started_at AND ended_at
       LIMIT 1`,
      [projectId],
    );

    if (breakCheck.rows.length > 0) {
      const activeBreak = breakCheck.rows[0];
      const endTime = new Date(activeBreak.ended_at);
      const remainingMinutes = Math.ceil((endTime - new Date()) / (1000 * 60));

      return res.json({
        success: true,
        status: "BREAK_ACTIVE",
        message: `Project break active. Attendance paused until ${endTime.toLocaleTimeString()}`,
        break_ends_at: activeBreak.ended_at,
        remaining_minutes: remainingMinutes,
        is_inside: null, // Not tracking during break
      });
    }

    // 3. Check if already blacklisted (within 3 days)
    const blacklistCheck = await pool.query(
      `SELECT id, created_at FROM organization_blacklist 
       WHERE org_id = $1 AND labour_id = $2 
       AND created_at + interval '3 days' > NOW()`,
      [orgId, labourId],
    );

    if (blacklistCheck.rows.length > 0) {
      const blacklistedAt = new Date(blacklistCheck.rows[0].created_at);
      const expiresAt = new Date(
        blacklistedAt.getTime() + 3 * 24 * 60 * 60 * 1000,
      );
      const remainingHours = Math.ceil(
        (expiresAt - new Date()) / (1000 * 60 * 60),
      );

      return res.status(403).json({
        error: "You are blacklisted from this organization",
        reason: "Exceeded maximum allowed exits",
        remaining_hours: remainingHours,
      });
    }

    // 3. Validate Geofence
    const geofenceResult = await validateGeofence(
      pool,
      projectId,
      latitude,
      longitude,
    );

    // 4. Handle geo-fence state changes
    let entryExitCount = attendance.entry_exit_count || 0;
    let isCurrentlyBreached = !geofenceResult.isValid;
    let blacklisted = false;
    let sessionClosed = false;
    let sessionStarted = false;
    let workedDuration = 0;

    // CASE 1: Labour EXITS geo-fence (was inside, now outside) - PAUSE
    if (isCurrentlyBreached && !attendance.is_currently_breached) {
      // Close current active session (PAUSE wage accumulation)
      const activeSessionRes = await pool.query(
        `SELECT id, check_in_time FROM attendance_sessions 
         WHERE attendance_id = $1 AND check_out_time IS NULL
         ORDER BY check_in_time DESC LIMIT 1`,
        [attendance.id],
      );

      if (activeSessionRes.rows.length > 0) {
        const sessionId = activeSessionRes.rows[0].id;
        const checkInTime = activeSessionRes.rows[0].check_in_time;

        // Close the session (PAUSE)
        await pool.query(
          `UPDATE attendance_sessions 
           SET check_out_time = CURRENT_TIMESTAMP,
               worked_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - check_in_time)) / 60
           WHERE id = $1`,
          [sessionId],
        );

        sessionClosed = true;

        // Calculate worked duration for this session
        const now = new Date();
        const start = new Date(checkInTime);
        workedDuration = Math.floor((now - start) / 60000); // minutes
      }

      // Increment entry/exit count
      entryExitCount += 1;

      // Update total work hours
      const totalRes = await pool.query(
        `SELECT SUM(worked_minutes) as total_minutes 
         FROM attendance_sessions 
         WHERE attendance_id = $1 AND check_out_time IS NOT NULL`,
        [attendance.id],
      );

      const work_hours = (totalRes.rows[0].total_minutes || 0) / 60;

      await pool.query(`UPDATE attendance SET work_hours = $1 WHERE id = $2`, [
        work_hours,
        attendance.id,
      ]);

      // Check for blacklisting: ONLY if entry_exit_count > max_allowed_exits (Removed enforcement)
      /*
      if (entryExitCount > maxAllowedExits) {
        await pool.query(
          `INSERT INTO organization_blacklist (org_id, labour_id, reason)
           VALUES ($1, $2, $3)
           ON CONFLICT (org_id, labour_id) DO NOTHING`,
          [orgId, labourId, "Exceeded maximum allowed exits"],
        );
        blacklisted = true;
      }
      */
    }

    // CASE 2: Labour RE-ENTERS geo-fence (was outside, now inside) - RESUME
    if (!isCurrentlyBreached && attendance.is_currently_breached) {
      // Check if labour can resume (not exceeding exit limit)
      if (entryExitCount <= maxAllowedExits) {
        // Check if there's no active session (should always be true after exit)
        const activeSessionCheck = await pool.query(
          `SELECT id FROM attendance_sessions 
           WHERE attendance_id = $1 AND check_out_time IS NULL`,
          [attendance.id],
        );

        if (activeSessionCheck.rows.length === 0) {
          // Create new session (RESUME wage accumulation)
          await pool.query(
            `INSERT INTO attendance_sessions (attendance_id, check_in_time)
             VALUES ($1, CURRENT_TIMESTAMP)`,
            [attendance.id],
          );
          sessionStarted = true;
        }
      }
    }

    // 5. Update attendance record with latest location and breach status
    await pool.query(
      `UPDATE attendance 
       SET last_known_lat = $1, 
           last_known_lng = $2, 
           is_currently_breached = $3,
           entry_exit_count = $4,
           last_event_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [latitude, longitude, isCurrentlyBreached, entryExitCount, attendance.id],
    );

    // 6. Prepare response
    const response = {
      success: true,
      is_inside: geofenceResult.isValid,
      entry_exit_count: entryExitCount,
      max_allowed_exits: maxAllowedExits,
      remaining_exits: Math.max(0, maxAllowedExits - entryExitCount),
      blacklisted,
    };

    if (sessionClosed) {
      response.status = "PAUSED";
      response.worked_duration_minutes = workedDuration;
      response.warning =
        "You have exited the geo-fence area. Your work session has been paused.";
    }

    if (sessionStarted) {
      response.status = "RESUMED";
      response.message =
        "You have re-entered the geo-fence area. Your work session has been resumed.";
    }

    if (blacklisted) {
      response.error =
        "You have been blacklisted from this organization for 3 days due to exceeding maximum allowed exits.";
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET LIVE STATUS ---------------- */
router.get("/live-status", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;

    const today = getISTDate();
    const result = await pool.query(
      `SELECT a.id, a.project_id, a.work_hours, a.is_currently_breached, a.geofence_breach_count,
              p.name as project_name, p.geofence, p.geofence_radius,
              p.check_in_time as shift_check_in, p.check_out_time as shift_check_out,
              l.skill_type, l.categories,
              (
                SELECT hourly_rate FROM wage_rates wr 
                WHERE wr.project_id = a.project_id 
                  AND wr.skill_type = l.skill_type 
                  AND wr.category = (
                    SELECT category FROM labour_requests lr 
                    JOIN labour_request_participants lrp ON lr.id = lrp.labour_request_id
                    WHERE lrp.labour_id = l.id AND lr.project_id = a.project_id AND lrp.status = 'APPROVED'
                    LIMIT 1
                  )
                LIMIT 1
              ) as hourly_rate,
              (
                SELECT check_in_time FROM attendance_sessions s 
                WHERE s.attendance_id = a.id AND s.check_out_time IS NULL
                ORDER BY s.check_in_time DESC LIMIT 1
              ) as current_session_start
       FROM attendance a
       JOIN projects p ON a.project_id = p.id
       JOIN labours l ON a.labour_id = l.id
       WHERE a.labour_id = $1 AND a.attendance_date = $2
       ORDER BY a.id DESC LIMIT 1`,
      [labourId, today],
    );

    if (result.rows.length === 0) {
      return res.json({ status: "INACTIVE", attendance: null });
    }

    const data = result.rows[0];
    const hourlyRate = parseFloat(data.hourly_rate || 0);
    const workHours = parseFloat(data.work_hours || 0);

    // Calculate current session duration if active
    let sessionMinutes = 0;
    if (data.current_session_start) {
      sessionMinutes = Math.floor(
        (new Date() - new Date(data.current_session_start)) / 60000,
      );
    }

    // Estimated earnings = (previously completed hours + current session hours) * rate
    const totalHours = workHours + sessionMinutes / 60;
    const estimatedWages = (totalHours * hourlyRate).toFixed(2);

    res.json({
      status: data.current_session_start ? "WORKING" : "ON_BREAK",
      project_id: data.project_id,
      project_name: data.project_name,
      latitude: data.latitude,
      longitude: data.longitude,
      geofence: data.geofence,
      geofence_radius: data.geofence_radius,
      is_inside: !data.is_currently_breached,
      breach_count: data.geofence_breach_count,
      work_hours_today: totalHours.toFixed(2),
      estimated_wages: estimatedWages,
      hourly_rate: hourlyRate,
      session_start: data.current_session_start,
      check_in: data.current_session_start, // for compatibility
      shift_start: data.shift_check_in,
      shift_end: data.shift_check_out,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
