const pool = require("../db");

/**
 * Calculate wage for a given attendance record
 * Uses attendance_sessions to calculate worked time inside geo-fence
 * Fetches rate from wage_rates table based on project, skill_type, and category
 *
 * @param {Object} client - Database client (for transactions) or pool
 * @param {string} attendanceId - UUID of attendance record
 * @returns {Object} { worked_hours, hourly_rate, total_amount, is_ready_for_payment, category, skill_type }
 */
async function calculateWageForAttendance(client, attendanceId) {
  // 1. Get attendance details with labour info and project working hours
  const attendanceRes = await client.query(
    `SELECT a.*, a.check_out_time, l.skill_type, l.categories[1] as category,
            p.check_in_time as project_check_in, p.check_out_time as project_check_out
     FROM attendance a
     JOIN labours l ON a.labour_id = l.id
     JOIN projects p ON a.project_id = p.id
     WHERE a.id = $1`,
    [attendanceId],
  );

  if (attendanceRes.rows.length === 0) {
    throw new Error("Attendance not found");
  }

  const attendance = attendanceRes.rows[0];
  const {
    project_id,
    check_out_time,
    skill_type,
    is_manual,
    status,
    attendance_date,
  } = attendance;
  const category = attendance.category;
  const projectCheckOut = attendance.project_check_out;

  // 2. Manual attendance must be APPROVED before wage calculation
  if (is_manual && status !== "APPROVED") {
    return {
      worked_hours: 0,
      hourly_rate: 0,
      total_amount: 0,
      is_ready_for_payment: false,
      category,
      skill_type,
      message: "Manual attendance pending approval",
    };
  }

  // 3. Determine effective checkout time - cap at project check_out_time (max 18:00)
  let effectiveCheckoutTime = null;

  if (check_out_time) {
    effectiveCheckoutTime = new Date(check_out_time);
  } else {
    const today = new Date(attendance_date);
    if (projectCheckOut) {
      const [hour, minute, second] = projectCheckOut.split(":").map(Number);
      effectiveCheckoutTime = new Date(today);
      effectiveCheckoutTime.setHours(hour, minute, second || 0, 0);
    } else {
      effectiveCheckoutTime = new Date(today);
      effectiveCheckoutTime.setHours(18, 0, 0, 0);
    }
  }

  // Ensure checkout doesn't exceed 18:00
  const sixPM = new Date(attendance_date);
  sixPM.setHours(18, 0, 0, 0);
  if (effectiveCheckoutTime > sixPM) {
    effectiveCheckoutTime = sixPM;
  }

  // 4. Calculate worked hours from sessions, capped by effective checkout
  let worked_hours = 0;

  if (check_out_time) {
    worked_hours = parseFloat(attendance.work_hours || 0);
  } else {
    const sessionsRes = await client.query(
      `SELECT check_in_time, check_out_time
       FROM attendance_sessions
       WHERE attendance_id = $1
       ORDER BY check_in_time`,
      [attendanceId],
    );

    for (const session of sessionsRes.rows) {
      const sessionStart = new Date(session.check_in_time);
      let sessionEnd;

      if (session.check_out_time) {
        sessionEnd = new Date(session.check_out_time);
      } else {
        const now = new Date();
        sessionEnd = now < effectiveCheckoutTime ? now : effectiveCheckoutTime;
      }

      if (sessionEnd > effectiveCheckoutTime) {
        sessionEnd = effectiveCheckoutTime;
      }

      const durationMs = sessionEnd - sessionStart;
      const durationHours = Math.max(0, durationMs / (1000 * 60 * 60));
      worked_hours += durationHours;
    }
  }

  // 5. Fetch hourly rate from wage_rates
  const rateRes = await client.query(
    `SELECT hourly_rate FROM wage_rates
     WHERE project_id = $1 AND skill_type = $2 AND category = $3`,
    [project_id, skill_type, category],
  );

  if (rateRes.rows.length === 0) {
    throw new Error(
      `Wage rate not configured for project=${project_id}, skill=${skill_type}, category=${category}`,
    );
  }

  const hourly_rate = parseFloat(rateRes.rows[0].hourly_rate);
  const total_amount = worked_hours * hourly_rate;

  // 6. Determine if ready for payment
  const is_ready_for_payment = check_out_time !== null && status === "APPROVED";

  return {
    worked_hours: parseFloat(worked_hours.toFixed(2)),
    hourly_rate,
    total_amount: parseFloat(total_amount.toFixed(2)),
    is_ready_for_payment,
    category,
    skill_type,
  };
}

/**
 * Check if labour has capacity in the category for a given project
 * Returns the category and whether capacity is available
 *
 * @param {Object} client - Database client
 * @param {string} labourId - UUID of labour
 * @param {string} projectId - UUID of project
 * @returns {Object} { hasCapacity: boolean, category: string, currentCount: number, requiredCount: number }
 */
async function checkCategoryCapacity(client, labourId, projectId) {
  // 1. Find the labour request and category for this labour
  const participantRes = await client.query(
    `SELECT lr.id as request_id, lr.category, lr.required_count, lrp.status
     FROM labour_request_participants lrp
     JOIN labour_requests lr ON lrp.labour_request_id = lr.id
     WHERE lrp.labour_id = $1 AND lr.project_id = $2 AND lrp.status IN ('APPROVED', 'PENDING')
     ORDER BY lrp.joined_at DESC
     LIMIT 1`,
    [labourId, projectId],
  );

  if (participantRes.rows.length === 0) {
    return {
      hasCapacity: false,
      category: null,
      currentCount: 0,
      requiredCount: 0,
      error: "Labour not approved for any labour request in this project",
    };
  }

  const { request_id, category, required_count } = participantRes.rows[0];

  // 2. Count how many labourers are currently approved for this request
  const countRes = await client.query(
    `SELECT COUNT(*) as approved_count
     FROM labour_request_participants
     WHERE labour_request_id = $1 AND status = 'APPROVED'`,
    [request_id],
  );

  const currentCount = parseInt(countRes.rows[0].approved_count);

  // 3. Check if capacity is available
  const hasCapacity = currentCount <= required_count;

  return {
    hasCapacity,
    category,
    currentCount,
    requiredCount,
    requestId: request_id,
  };
}

module.exports = {
  calculateWageForAttendance,
  checkCategoryCapacity,
};
