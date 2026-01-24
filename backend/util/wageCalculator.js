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
  // 1. Get attendance details with labour info
  const attendanceRes = await client.query(
    `SELECT a.*, a.check_out_time, l.skill_type, l.categories[1] as category
     FROM attendance a
     JOIN labours l ON a.labour_id = l.id
     WHERE a.id = $1`,
    [attendanceId],
  );

  if (attendanceRes.rows.length === 0) {
    throw new Error("Attendance not found");
  }

  const attendance = attendanceRes.rows[0];
  const { project_id, check_out_time, skill_type, is_manual, status } =
    attendance;
  const category = attendance.category;

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

  // 3. Calculate worked hours from attendance_sessions
  let worked_hours = 0;

  if (check_out_time) {
    // Attendance is complete - use stored work_hours (already calculated)
    worked_hours = parseFloat(attendance.work_hours || 0);
  } else {
    // Attendance is active - calculate from sessions
    const sessionsRes = await client.query(
      `SELECT 
        SUM(worked_minutes) FILTER (WHERE check_out_time IS NOT NULL) as completed_minutes,
        MAX(check_in_time) FILTER (WHERE check_out_time IS NULL) as active_session_start
       FROM attendance_sessions
       WHERE attendance_id = $1`,
      [attendanceId],
    );

    const completedMinutes = parseFloat(
      sessionsRes.rows[0].completed_minutes || 0,
    );
    const activeSessionStart = sessionsRes.rows[0].active_session_start;

    // Add completed session time
    worked_hours = completedMinutes / 60;

    // Add current active session time (if any)
    if (activeSessionStart) {
      const now = new Date();
      const sessionStart = new Date(activeSessionStart);
      const activeMinutes = (now - sessionStart) / 60000; // milliseconds to minutes
      worked_hours += activeMinutes / 60;
    }
  }

  // 4. Fetch hourly rate from wage_rates
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

  // 5. Determine if ready for payment
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
     WHERE lrp.labour_id = $1 AND lr.project_id = $2 AND lrp.status = 'APPROVED'
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
