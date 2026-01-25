const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");
const { calculateWageForAttendance } = require("../../util/wageCalculator");

/* ---------------- GET WAGE HISTORY & ANALYTICS ---------------- */
router.get("/my-wages", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;

    // 1. Get all attendance records with wage info
    const attendanceResult = await pool.query(
      `SELECT a.id as attendance_id, a.attendance_date, a.status as attendance_status,
                    a.check_out_time, a.is_manual,
                    w.id as wage_id, w.status as wage_status, w.approved_at, w.paid_at,
                    p.name as project_name, p.location_text
             FROM attendance a
             LEFT JOIN wages w ON a.id = w.attendance_id
             JOIN projects p ON a.project_id = p.id
             WHERE a.labour_id = $1
             ORDER BY a.attendance_date DESC`,
      [labourId],
    );

    // 1.5 Get all sessions for these attendances to include in details
    const attendanceIds = attendanceResult.rows.map((r) => r.attendance_id);
    const sessionsByAttendance = {};

    if (attendanceIds.length > 0) {
      const sessionRes = await pool.query(
        `SELECT attendance_id, check_in_time, check_out_time, worked_minutes 
         FROM attendance_sessions 
         WHERE attendance_id = ANY($1)
         ORDER BY check_in_time ASC`,
        [attendanceIds],
      );
      sessionRes.rows.forEach((s) => {
        if (!sessionsByAttendance[s.attendance_id])
          sessionsByAttendance[s.attendance_id] = [];
        sessionsByAttendance[s.attendance_id].push(s);
      });
    }

    // 2. Calculate wages for each attendance (server-side)
    const wagesWithCalculation = [];
    for (const record of attendanceResult.rows) {
      try {
        const calculation = await calculateWageForAttendance(
          pool,
          record.attendance_id,
        );
        wagesWithCalculation.push({
          ...record,
          worked_hours: calculation.worked_hours,
          hourly_rate: calculation.hourly_rate,
          total_amount: calculation.total_amount,
          is_ready_for_payment: calculation.is_ready_for_payment,
          category: calculation.category,
          skill_type: calculation.skill_type,
          sessions: sessionsByAttendance[record.attendance_id] || [],
        });
      } catch (err) {
        // If wage calculation fails (e.g., no rate configured), skip this record
        console.error(
          `Wage calculation failed for attendance ${record.attendance_id}:`,
          err.message,
        );
      }
    }

    // 3. Calculate Analytics
    const totalApproved = wagesWithCalculation.filter(
      (w) => w.wage_status === "APPROVED",
    ).length;
    const totalEarnings = wagesWithCalculation
      .filter((w) => w.wage_status === "APPROVED")
      .reduce((sum, w) => sum + (w.total_amount || 0), 0);
    const pendingEarnings = wagesWithCalculation
      .filter((w) => w.wage_status === "PENDING")
      .reduce((sum, w) => sum + (w.total_amount || 0), 0);
    const unpaidEarnings = wagesWithCalculation
      .filter((w) => w.wage_status === "APPROVED" && !w.paid_at)
      .reduce((sum, w) => sum + (w.total_amount || 0), 0);
    const paidEarnings = wagesWithCalculation
      .filter((w) => w.paid_at)
      .reduce((sum, w) => sum + (w.total_amount || 0), 0);

    // 4. Weekly breakdown (last 4 weeks)
    const weeklyStats = {};
    wagesWithCalculation
      .filter((w) => w.wage_status === "APPROVED")
      .forEach((w) => {
        const date = new Date(w.attendance_date);
        const weekStart = new Date(
          date.setDate(date.getDate() - date.getDay()),
        );
        const weekKey = weekStart.toISOString().split("T")[0];

        if (!weeklyStats[weekKey]) {
          weeklyStats[weekKey] = { week_start: weekKey, amount: 0 };
        }
        weeklyStats[weekKey].amount += w.total_amount || 0;
      });

    const weeklyArray = Object.values(weeklyStats)
      .sort((a, b) => new Date(b.week_start) - new Date(a.week_start))
      .slice(0, 4);

    res.json({
      wages: wagesWithCalculation,
      summary: {
        total_approved_days: totalApproved,
        total_earnings: totalEarnings,
        pending_earnings: pendingEarnings,
        unpaid_earnings: unpaidEarnings,
        paid_earnings: paidEarnings,
      },
      weekly_stats: weeklyArray,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
