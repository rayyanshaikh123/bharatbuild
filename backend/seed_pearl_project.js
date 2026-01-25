/**
 * ========================================
 * SEED SCRIPT FOR "PEARL" PROJECT
 * ========================================
 *
 * PURPOSE:
 * Creates realistic test data for development/testing of the "pearl" project
 * including organization, owner, manager, site engineer, labourers, attendance,
 * wage rates, and wages.
 *
 * EXECUTION:
 * node seed_pearl_project.js
 *
 * REQUIREMENTS:
 * - PostgreSQL database running
 * - Database connection configured in ../db.js
 * - bcrypt package installed (npm install bcrypt)
 *
 * SAFETY:
 * - Re-runnable (checks existence before insert)
 * - Uses transactions (rolls back on error)
 * - Development/testing only
 *
 * ⚠️ WARNING: DO NOT RUN IN PRODUCTION
 */

require("dotenv").config(); // Load environment variables
const pool = require("./db");
const bcrypt = require("bcrypt");

// Configuration
const SALT_ROUNDS = 10;
const PROJECT_NAME = "pearl";

// Test credentials (DEVELOPMENT ONLY)
const CREDENTIALS = {
  owner: {
    name: "Pearl Owner",
    email: "owner@pearl.test",
    phone: "+919876543210",
    password: "Pearl@Owner123",
  },
  manager: {
    name: "Pearl Project Manager",
    email: "manager@pearl.test",
    phone: "+919876543211",
    password: "Pearl@Manager123",
  },
  engineer: {
    name: "Pearl Site Engineer",
    email: "engineer@pearl.test",
    phone: "+919876543212",
    password: "Pearl@Engineer123",
  },
};

// Labour data
const LABOURERS = [
  {
    name: "Rajesh Kumar",
    phone: "+919876501001",
    skill_type: "SKILLED",
    categories: ["Masonry", "Carpentry"],
    latitude: 28.6139,
    longitude: 77.209,
  },
  {
    name: "Suresh Sharma",
    phone: "+919876501002",
    skill_type: "SKILLED",
    categories: ["Electrical", "Plumbing"],
    latitude: 28.6149,
    longitude: 77.21,
  },
  {
    name: "Ramesh Verma",
    phone: "+919876501003",
    skill_type: "SEMI_SKILLED",
    categories: ["Civil", "Carpentry"],
    latitude: 28.6159,
    longitude: 77.211,
  },
  {
    name: "Mukesh Singh",
    phone: "+919876501004",
    skill_type: "SEMI_SKILLED",
    categories: ["Electrical", "Masonry"],
    latitude: 28.6169,
    longitude: 77.212,
  },
  {
    name: "Dinesh Yadav",
    phone: "+919876501005",
    skill_type: "UNSKILLED",
    categories: ["Civil"],
    latitude: 28.6179,
    longitude: 77.213,
  },
  {
    name: "Mahesh Gupta",
    phone: "+919876501006",
    skill_type: "SKILLED",
    categories: ["Masonry", "Plumbing"],
    latitude: 28.6189,
    longitude: 77.214,
  },
  {
    name: "Ganesh Patel",
    phone: "+919876501007",
    skill_type: "SEMI_SKILLED",
    categories: ["Carpentry", "Electrical"],
    latitude: 28.6199,
    longitude: 77.215,
  },
  {
    name: "Lokesh Joshi",
    phone: "+919876501008",
    skill_type: "UNSKILLED",
    categories: ["Civil"],
    latitude: 28.6209,
    longitude: 77.216,
  },
  {
    name: "Rakesh Mishra",
    phone: "+919876501009",
    skill_type: "SKILLED",
    categories: ["Electrician", "AC Mechanic"],
    latitude: 28.6219,
    longitude: 77.217,
  },
  {
    name: "Naresh Pandey",
    phone: "+919876501010",
    skill_type: "SEMI_SKILLED",
    categories: ["Plumber", "Helper"],
    latitude: 28.6229,
    longitude: 77.218,
  },
  {
    name: "Kamlesh Tiwari",
    phone: "+919876501011",
    skill_type: "UNSKILLED",
    categories: ["Helper", "Watchman"],
    latitude: 28.6239,
    longitude: 77.219,
  },
  {
    name: "Pankaj Kumar",
    phone: "+919876501012",
    skill_type: "SKILLED",
    categories: ["Welder", "Fabricator"],
    latitude: 28.6249,
    longitude: 77.22,
  },
];

// Wage rates
const WAGE_RATES = [
  { skill_type: "SKILLED", category: "Mason", hourly_rate: 75 },
  { skill_type: "SKILLED", category: "Electrician", hourly_rate: 80 },
  { skill_type: "SKILLED", category: "Welder", hourly_rate: 70 },
  { skill_type: "SEMI_SKILLED", category: "Helper", hourly_rate: 50 },
  { skill_type: "SEMI_SKILLED", category: "Painter", hourly_rate: 55 },
  { skill_type: "UNSKILLED", category: "Helper", hourly_rate: 40 },
  { skill_type: "UNSKILLED", category: "Cleaner", hourly_rate: 35 },
];

/**
 * Helper: Get last N working days (excluding Sundays)
 */
function getLastWorkingDays(count) {
  const days = [];
  let current = new Date();
  current.setHours(0, 0, 0, 0);

  while (days.length < count) {
    // Skip Sundays (0 = Sunday)
    if (current.getDay() !== 0) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() - 1);
  }

  return days.reverse(); // Oldest to newest
}

/**
 * Helper: Format date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Helper: Format timestamp
 */
function formatTimestamp(date, hours, minutes) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

/**
 * Main seed function
 */
async function seedPearlProject() {
  const client = await pool.connect();
  let ownerId, orgId, managerId, engineerId, projectId;

  try {
    console.log("🌱 Starting seed script for PEARL project...\n");
    await client.query("BEGIN");

    // ========================================
    // 1. CREATE OWNER
    // ========================================
    console.log("1️⃣  Creating Owner...");
    const ownerCheck = await client.query(
      "SELECT id FROM owners WHERE email = $1",
      [CREDENTIALS.owner.email],
    );

    if (ownerCheck.rows.length > 0) {
      ownerId = ownerCheck.rows[0].id;
      console.log(`   ✓ Owner already exists: ${ownerId}`);
    } else {
      const hashedPassword = await bcrypt.hash(
        CREDENTIALS.owner.password,
        SALT_ROUNDS,
      );
      const ownerResult = await client.query(
        `INSERT INTO owners (name, email, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, 'OWNER')
         RETURNING id`,
        [
          CREDENTIALS.owner.name,
          CREDENTIALS.owner.email,
          CREDENTIALS.owner.phone,
          hashedPassword,
        ],
      );
      ownerId = ownerResult.rows[0].id;
      console.log(`   ✓ Owner created: ${ownerId}`);
    }

    // ========================================
    // 2. CREATE ORGANIZATION
    // ========================================
    console.log("\n2️⃣  Creating Organization...");
    const orgCheck = await client.query(
      "SELECT id FROM organizations WHERE owner_id = $1",
      [ownerId],
    );

    if (orgCheck.rows.length > 0) {
      orgId = orgCheck.rows[0].id;
      console.log(`   ✓ Organization already exists: ${orgId}`);
    } else {
      const orgResult = await client.query(
        `INSERT INTO organizations (name, address, office_phone, org_type, owner_id, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          "Pearl Construction Pvt. Ltd.",
          "123 Builder Street, New Delhi, India",
          "+911234567890",
          "CONSTRUCTION",
          ownerId,
          28.6139,
          77.209,
        ],
      );
      orgId = orgResult.rows[0].id;
      console.log(`   ✓ Organization created: ${orgId}`);
    }

    // ========================================
    // 3. CREATE MANAGER
    // ========================================
    console.log("\n3️⃣  Creating Manager...");
    const managerCheck = await client.query(
      "SELECT id FROM managers WHERE email = $1 OR phone = $2",
      [CREDENTIALS.manager.email, CREDENTIALS.manager.phone],
    );

    if (managerCheck.rows.length > 0) {
      managerId = managerCheck.rows[0].id;
      console.log(`   ✓ Manager already exists: ${managerId}`);
    } else {
      const hashedPassword = await bcrypt.hash(
        CREDENTIALS.manager.password,
        SALT_ROUNDS,
      );
      const managerResult = await client.query(
        `INSERT INTO managers (name, email, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, 'MANAGER')
         RETURNING id`,
        [
          CREDENTIALS.manager.name,
          CREDENTIALS.manager.email,
          CREDENTIALS.manager.phone,
          hashedPassword,
        ],
      );
      managerId = managerResult.rows[0].id;
      console.log(`   ✓ Manager created: ${managerId}`);
    }

    // Link Manager to Organization
    const orgManagerCheck = await client.query(
      "SELECT id FROM organization_managers WHERE org_id = $1 AND manager_id = $2",
      [orgId, managerId],
    );

    if (orgManagerCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO organization_managers (org_id, manager_id, status, approved_at)
         VALUES ($1, $2, 'APPROVED', NOW())`,
        [orgId, managerId],
      );
      console.log(`   ✓ Manager linked to organization (APPROVED)`);
    } else {
      console.log(`   ✓ Manager already linked to organization`);
    }

    // ========================================
    // 4. CREATE PROJECT
    // ========================================
    console.log("\n4️⃣  Creating Project...");
    const projectCheck = await client.query(
      "SELECT id FROM projects WHERE name = $1 AND org_id = $2",
      [PROJECT_NAME, orgId],
    );

    if (projectCheck.rows.length > 0) {
      projectId = projectCheck.rows[0].id;
      console.log(`   ✓ Project already exists: ${projectId}`);
    } else {
      const projectResult = await client.query(
        `INSERT INTO projects 
         (org_id, name, location_text, latitude, longitude, geofence_radius, 
          start_date, end_date, budget, status, created_by, check_in_time, check_out_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          orgId,
          PROJECT_NAME,
          "Pearl Tower, Sector 15, Noida, UP, India",
          28.6139,
          77.209,
          500, // 500 meters geofence
          "2026-01-01",
          "2026-12-31",
          50000000, // 5 Crore budget
          "ACTIVE",
          managerId, // created_by should be manager, not owner
          "06:00:00",
          "18:00:00",
        ],
      );
      projectId = projectResult.rows[0].id;
      console.log(`   ✓ Project created: ${projectId}`);
    }

    // Assign Manager to Project
    const projectManagerCheck = await client.query(
      "SELECT id FROM project_managers WHERE project_id = $1 AND manager_id = $2",
      [projectId, managerId],
    );

    if (projectManagerCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO project_managers (project_id, manager_id, status, assigned_at)
         VALUES ($1, $2, 'ACTIVE', NOW())`,
        [projectId, managerId],
      );
      console.log(`   ✓ Manager assigned to project (ACTIVE)`);
    } else {
      console.log(`   ✓ Manager already assigned to project`);
    }

    // ========================================
    // 5. CREATE SITE ENGINEER
    // ========================================
    console.log("\n5️⃣  Creating Site Engineer...");
    const engineerCheck = await client.query(
      "SELECT id FROM site_engineers WHERE email = $1 OR phone = $2",
      [CREDENTIALS.engineer.email, CREDENTIALS.engineer.phone],
    );

    if (engineerCheck.rows.length > 0) {
      engineerId = engineerCheck.rows[0].id;
      console.log(`   ✓ Site Engineer already exists: ${engineerId}`);
    } else {
      const hashedPassword = await bcrypt.hash(
        CREDENTIALS.engineer.password,
        SALT_ROUNDS,
      );
      const engineerResult = await client.query(
        `INSERT INTO site_engineers (name, email, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, 'SITE_ENGINEER')
         RETURNING id`,
        [
          CREDENTIALS.engineer.name,
          CREDENTIALS.engineer.email,
          CREDENTIALS.engineer.phone,
          hashedPassword,
        ],
      );
      engineerId = engineerResult.rows[0].id;
      console.log(`   ✓ Site Engineer created: ${engineerId}`);
    }

    // Link Engineer to Organization
    const orgEngineerCheck = await client.query(
      "SELECT id FROM organization_site_engineers WHERE org_id = $1 AND site_engineer_id = $2",
      [orgId, engineerId],
    );

    if (orgEngineerCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO organization_site_engineers (org_id, site_engineer_id, approved_by, status, approved_at)
         VALUES ($1, $2, $3, 'APPROVED', NOW())`,
        [orgId, engineerId, managerId], // approved_by should be manager
      );
      console.log(`   ✓ Engineer linked to organization (APPROVED)`);
    } else {
      console.log(`   ✓ Engineer already linked to organization`);
    }

    // Assign Engineer to Project
    const projectEngineerCheck = await client.query(
      "SELECT id FROM project_site_engineers WHERE project_id = $1 AND site_engineer_id = $2",
      [projectId, engineerId],
    );

    if (projectEngineerCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO project_site_engineers (project_id, site_engineer_id, status, assigned_at)
         VALUES ($1, $2, 'APPROVED', NOW())`,
        [projectId, engineerId],
      );
      console.log(`   ✓ Engineer assigned to project (APPROVED)`);
    } else {
      console.log(`   ✓ Engineer already assigned to project`);
    }

    // ========================================
    // 6. CREATE LABOURERS
    // ========================================
    console.log("\n6️⃣  Creating Labourers...");
    const labourIds = [];

    for (const labour of LABOURERS) {
      const labourCheck = await client.query(
        "SELECT id FROM labours WHERE phone = $1",
        [labour.phone],
      );

      let labourId;
      if (labourCheck.rows.length > 0) {
        labourId = labourCheck.rows[0].id;
        console.log(`   ✓ Labour already exists: ${labour.name} (${labourId})`);
      } else {
        const labourResult = await client.query(
          `INSERT INTO labours (name, phone, role, skill_type, categories, primary_latitude, primary_longitude, travel_radius_meters)
           VALUES ($1, $2, 'LABOUR', $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            labour.name,
            labour.phone,
            labour.skill_type,
            labour.categories,
            labour.latitude,
            labour.longitude,
            5000, // 5km travel radius
          ],
        );
        labourId = labourResult.rows[0].id;
        console.log(`   ✓ Created: ${labour.name} (${labourId})`);
      }
      labourIds.push({
        id: labourId,
        skill_type: labour.skill_type,
        categories: labour.categories,
      });
    }

    // ========================================
    // 7. CREATE WAGE RATES
    // ========================================
    console.log("\n7️⃣  Creating Wage Rates...");
    for (const rate of WAGE_RATES) {
      const rateCheck = await client.query(
        "SELECT id FROM wage_rates WHERE project_id = $1 AND skill_type = $2 AND category = $3",
        [projectId, rate.skill_type, rate.category],
      );

      if (rateCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO wage_rates (project_id, skill_type, category, hourly_rate, created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            projectId,
            rate.skill_type,
            rate.category,
            rate.hourly_rate,
            managerId,
          ],
        );
        console.log(
          `   ✓ ${rate.skill_type} - ${rate.category}: ₹${rate.hourly_rate}/hr`,
        );
      } else {
        console.log(
          `   ✓ Already exists: ${rate.skill_type} - ${rate.category}`,
        );
      }
    }

    // ========================================
    // 8. CREATE ATTENDANCE & WAGES
    // ========================================
    console.log("\n8️⃣  Creating Attendance Records & Wages...");
    const workingDays = getLastWorkingDays(5);
    console.log(`   Creating attendance for ${workingDays.length} days...`);

    for (const day of workingDays) {
      const dateStr = formatDate(day);
      console.log(`\n   📅 ${dateStr}:`);

      for (const labour of labourIds) {
        // Check if attendance exists
        const attendanceCheck = await client.query(
          "SELECT id FROM attendance WHERE project_id = $1 AND labour_id = $2 AND attendance_date = $3",
          [projectId, labour.id, dateStr],
        );

        if (attendanceCheck.rows.length > 0) {
          console.log(
            `      ✓ Attendance exists for labour ${labour.id.substring(0, 8)}...`,
          );
          continue;
        }

        // Random work hours between 8-10 hours
        const workHours = 8 + Math.random() * 2;
        const checkInTime = formatTimestamp(
          day,
          6,
          0 + Math.floor(Math.random() * 30),
        );
        const checkOutTime = formatTimestamp(
          day,
          14 + Math.floor(workHours),
          Math.floor((workHours % 1) * 60),
        );

        // Create attendance
        const attendanceResult = await client.query(
          `INSERT INTO attendance 
           (project_id, labour_id, site_engineer_id, attendance_date, check_in_time, check_out_time, 
            work_hours, status, approved_by, approved_at, is_manual, entry_exit_count, max_allowed_exits, 
            source, geofence_breach_count, face_verification_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'APPROVED', $8, NOW(), false, 2, 3, 'ONLINE', 0, 'VERIFIED')
           RETURNING id`,
          [
            projectId,
            labour.id,
            engineerId,
            dateStr,
            checkInTime,
            checkOutTime,
            workHours,
            engineerId,
          ],
        );

        const attendanceId = attendanceResult.rows[0].id;

        // Create attendance sessions
        const morningCheckIn = formatTimestamp(
          day,
          6,
          0 + Math.floor(Math.random() * 30),
        );
        const lunchOut = formatTimestamp(day, 12, 0);
        const lunchIn = formatTimestamp(day, 13, 0);
        const finalCheckOut = checkOutTime;

        // Morning session
        await client.query(
          `INSERT INTO attendance_sessions (attendance_id, check_in_time, check_out_time, worked_minutes)
           VALUES ($1, $2, $3, $4)`,
          [
            attendanceId,
            morningCheckIn,
            lunchOut,
            6 * 60, // 6 hours = 360 minutes
          ],
        );

        // Afternoon session
        await client.query(
          `INSERT INTO attendance_sessions (attendance_id, check_in_time, check_out_time, worked_minutes)
           VALUES ($1, $2, $3, $4)`,
          [
            attendanceId,
            lunchIn,
            finalCheckOut,
            Math.floor((workHours - 6) * 60),
          ],
        );

        // Get wage rate for this labour
        const primaryCategory = labour.categories[0];
        const rateResult = await client.query(
          "SELECT hourly_rate FROM wage_rates WHERE project_id = $1 AND skill_type = $2 AND category = $3",
          [projectId, labour.skill_type, primaryCategory],
        );

        const hourlyRate =
          rateResult.rows.length > 0 ? rateResult.rows[0].hourly_rate : 50; // Default 50
        const totalAmount = workHours * hourlyRate;

        // Create wage
        const wageCheck = await client.query(
          "SELECT id FROM wages WHERE attendance_id = $1",
          [attendanceId],
        );

        if (wageCheck.rows.length === 0) {
          await client.query(
            `INSERT INTO wages 
             (attendance_id, labour_id, project_id, wage_type, rate, total_amount, 
              status, approved_by, approved_at, worked_hours, is_ready_for_payment)
             VALUES ($1, $2, $3, 'HOURLY', $4, $5, 'APPROVED', $6, NOW(), $7, true)`,
            [
              attendanceId,
              labour.id,
              projectId,
              hourlyRate,
              totalAmount.toFixed(2),
              managerId, // approved_by should be manager
              workHours,
            ],
          );
        }

        console.log(
          `      ✓ Labour ${labour.id.substring(0, 8)}...: ${workHours.toFixed(1)}hrs, ₹${totalAmount.toFixed(2)}`,
        );
      }
    }

    // ========================================
    // COMMIT TRANSACTION
    // ========================================
    await client.query("COMMIT");
    console.log("\n✅ SEED SCRIPT COMPLETED SUCCESSFULLY!\n");

    // ========================================
    // SUMMARY
    // ========================================
    console.log("========================================");
    console.log("📊 SUMMARY");
    console.log("========================================");
    console.log(`Owner ID:          ${ownerId}`);
    console.log(`Organization ID:   ${orgId}`);
    console.log(`Manager ID:        ${managerId}`);
    console.log(`Site Engineer ID:  ${engineerId}`);
    console.log(`Project ID:        ${projectId}`);
    console.log(`Project Name:      ${PROJECT_NAME}`);
    console.log(`Labourers:         ${labourIds.length}`);
    console.log(`Wage Rates:        ${WAGE_RATES.length}`);
    console.log(`Working Days:      ${workingDays.length}`);
    console.log(`Total Attendance:  ${labourIds.length * workingDays.length}`);
    console.log("========================================\n");

    console.log("🔑 TEST CREDENTIALS:");
    console.log("========================================");
    console.log("Owner:");
    console.log(`  Email:    ${CREDENTIALS.owner.email}`);
    console.log(`  Password: ${CREDENTIALS.owner.password}`);
    console.log("\nManager:");
    console.log(`  Email:    ${CREDENTIALS.manager.email}`);
    console.log(`  Password: ${CREDENTIALS.manager.password}`);
    console.log("\nSite Engineer:");
    console.log(`  Email:    ${CREDENTIALS.engineer.email}`);
    console.log(`  Password: ${CREDENTIALS.engineer.password}`);
    console.log("========================================\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ ERROR:", err.message);
    console.error(err.stack);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute seed script
seedPearlProject()
  .then(() => {
    console.log("✨ Seed script finished successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("💥 Seed script failed:", err);
    process.exit(1);
  });
