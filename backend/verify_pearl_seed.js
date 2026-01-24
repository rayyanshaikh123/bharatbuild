/**
 * ========================================
 * VERIFICATION SCRIPT FOR PEARL PROJECT
 * ========================================
 *
 * PURPOSE:
 * Quickly verify that the seed script created all expected data
 *
 * EXECUTION:
 * node verify_pearl_seed.js
 */

require("dotenv").config(); // Load environment variables
const pool = require("./db");

async function verifyPearlSeed() {
  const client = await pool.connect();

  try {
    console.log("🔍 Verifying PEARL project seed data...\n");

    // Get project ID
    const projectResult = await client.query(
      "SELECT id, name, status FROM projects WHERE name = 'pearl'",
    );

    if (projectResult.rows.length === 0) {
      console.log("❌ Project 'pearl' not found!");
      return;
    }

    const projectId = projectResult.rows[0].id;
    const projectStatus = projectResult.rows[0].status;

    console.log("✅ Project Found");
    console.log(`   ID:     ${projectId}`);
    console.log(`   Status: ${projectStatus}\n`);

    // Check organization
    const orgResult = await client.query(
      `SELECT o.id, o.name, o.owner_id
       FROM organizations o
       JOIN projects p ON o.id = p.org_id
       WHERE p.id = $1`,
      [projectId],
    );
    console.log("✅ Organization");
    console.log(`   Count: ${orgResult.rows.length}`);
    if (orgResult.rows.length > 0) {
      console.log(`   Name:  ${orgResult.rows[0].name}\n`);
    }

    // Check owner
    const ownerResult = await client.query(
      `SELECT id, name, email FROM owners WHERE email = 'owner@pearl.test'`,
    );
    console.log("✅ Owner");
    console.log(`   Count: ${ownerResult.rows.length}`);
    if (ownerResult.rows.length > 0) {
      console.log(`   Email: ${ownerResult.rows[0].email}\n`);
    }

    // Check manager
    const managerResult = await client.query(
      `SELECT m.id, m.name, m.email, pm.status
       FROM managers m
       JOIN project_managers pm ON m.id = pm.manager_id
       WHERE pm.project_id = $1`,
      [projectId],
    );
    console.log("✅ Manager");
    console.log(`   Count:  ${managerResult.rows.length}`);
    if (managerResult.rows.length > 0) {
      console.log(`   Email:  ${managerResult.rows[0].email}`);
      console.log(`   Status: ${managerResult.rows[0].status}\n`);
    }

    // Check site engineer
    const engineerResult = await client.query(
      `SELECT se.id, se.name, se.email, pse.status
       FROM site_engineers se
       JOIN project_site_engineers pse ON se.id = pse.site_engineer_id
       WHERE pse.project_id = $1`,
      [projectId],
    );
    console.log("✅ Site Engineer");
    console.log(`   Count:  ${engineerResult.rows.length}`);
    if (engineerResult.rows.length > 0) {
      console.log(`   Email:  ${engineerResult.rows[0].email}`);
      console.log(`   Status: ${engineerResult.rows[0].status}\n`);
    }

    // Check labourers
    const labourResult = await client.query(
      `SELECT COUNT(*) as count,
              COUNT(CASE WHEN skill_type = 'SKILLED' THEN 1 END) as skilled,
              COUNT(CASE WHEN skill_type = 'SEMI_SKILLED' THEN 1 END) as semi_skilled,
              COUNT(CASE WHEN skill_type = 'UNSKILLED' THEN 1 END) as unskilled
       FROM labours
       WHERE phone LIKE '+9198765010%'`,
    );
    console.log("✅ Labourers");
    console.log(`   Total:        ${labourResult.rows[0].count}`);
    console.log(`   SKILLED:      ${labourResult.rows[0].skilled}`);
    console.log(`   SEMI_SKILLED: ${labourResult.rows[0].semi_skilled}`);
    console.log(`   UNSKILLED:    ${labourResult.rows[0].unskilled}\n`);

    // Check wage rates
    const wageRateResult = await client.query(
      `SELECT COUNT(*) as count,
              MIN(hourly_rate) as min_rate,
              MAX(hourly_rate) as max_rate,
              AVG(hourly_rate) as avg_rate
       FROM wage_rates
       WHERE project_id = $1`,
      [projectId],
    );
    console.log("✅ Wage Rates");
    console.log(`   Count:   ${wageRateResult.rows[0].count}`);
    console.log(`   Min:     ₹${wageRateResult.rows[0].min_rate}/hr`);
    console.log(`   Max:     ₹${wageRateResult.rows[0].max_rate}/hr`);
    console.log(
      `   Average: ₹${parseFloat(wageRateResult.rows[0].avg_rate).toFixed(2)}/hr\n`,
    );

    // Check attendance
    const attendanceResult = await client.query(
      `SELECT COUNT(*) as count,
              COUNT(DISTINCT attendance_date) as unique_dates,
              COUNT(DISTINCT labour_id) as unique_labours,
              AVG(work_hours) as avg_hours,
              COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved
       FROM attendance
       WHERE project_id = $1`,
      [projectId],
    );
    console.log("✅ Attendance Records");
    console.log(`   Total Records: ${attendanceResult.rows[0].count}`);
    console.log(`   Unique Dates:  ${attendanceResult.rows[0].unique_dates}`);
    console.log(`   Unique Labour: ${attendanceResult.rows[0].unique_labours}`);
    console.log(
      `   Avg Hours:     ${parseFloat(attendanceResult.rows[0].avg_hours).toFixed(2)}`,
    );
    console.log(`   Approved:      ${attendanceResult.rows[0].approved}\n`);

    // Check attendance sessions
    const sessionResult = await client.query(
      `SELECT COUNT(*) as count
       FROM attendance_sessions
       WHERE attendance_id IN (SELECT id FROM attendance WHERE project_id = $1)`,
      [projectId],
    );
    console.log("✅ Attendance Sessions");
    console.log(`   Total: ${sessionResult.rows[0].count}\n`);

    // Check wages
    const wageResult = await client.query(
      `SELECT COUNT(*) as count,
              SUM(total_amount) as total_wages,
              AVG(total_amount) as avg_wage,
              COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
              COUNT(CASE WHEN is_ready_for_payment = true THEN 1 END) as ready_for_payment
       FROM wages
       WHERE project_id = $1`,
      [projectId],
    );
    console.log("✅ Wage Records");
    console.log(`   Total Records:       ${wageResult.rows[0].count}`);
    console.log(
      `   Total Wages:         ₹${parseFloat(wageResult.rows[0].total_wages).toFixed(2)}`,
    );
    console.log(
      `   Average Wage:        ₹${parseFloat(wageResult.rows[0].avg_wage).toFixed(2)}`,
    );
    console.log(`   Approved:            ${wageResult.rows[0].approved}`);
    console.log(
      `   Ready for Payment:   ${wageResult.rows[0].ready_for_payment}\n`,
    );

    // Check date range
    const dateRangeResult = await client.query(
      `SELECT MIN(attendance_date) as first_date,
              MAX(attendance_date) as last_date
       FROM attendance
       WHERE project_id = $1`,
      [projectId],
    );
    console.log("✅ Attendance Date Range");
    console.log(`   First: ${dateRangeResult.rows[0].first_date}`);
    console.log(`   Last:  ${dateRangeResult.rows[0].last_date}\n`);

    console.log("========================================");
    console.log("✅ VERIFICATION COMPLETE");
    console.log("========================================\n");
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyPearlSeed()
  .then(() => {
    console.log("✨ Verification finished");
    process.exit(0);
  })
  .catch((err) => {
    console.error("💥 Verification failed:", err);
    process.exit(1);
  });
