/**
 * ========================================
 * LABOUR & WAGES SEED SCRIPT
 * ========================================
 *
 * PURPOSE:
 * Seeds labour, attendance, and wage data for the Pyarelal Org project
 *
 * EXECUTION:
 * node seed_labour_wages.js
 *
 * ⚠️ WARNING: DEVELOPMENT ONLY
 */

require("dotenv").config();
const pool = require("./db");

// ========================================
// PROVIDED IDS & CREDENTIALS
// ========================================
const CONFIG = {
  owner_id: "0a3555e5-2c7f-4fb5-92fb-f9d2b0d4151a",
  owner_email: "test@test.com",
  organization_id: "16796142-4eac-40e8-a970-ea5796009b05",
  organization_name: "pyarelal Org",
  project_id: "6af1f371-2d37-486f-8f1c-c04d42f90c83",
  manager_id: "239adc6b-f6fe-4134-a96a-49f6b0a868f0",
  manager_email: "manager@test.com",
  engineer_id: "4cfe936b-f454-4f0f-948c-70ebed4efcb6",
  engineer_name: "Rayyan",
  engineer_email: "rayyan.shaikhh@gmail.com",
};

// ========================================
// LABOUR DATA (20 Workers)
// ========================================
const LABOURERS = [
  // Skilled Workers (8)
  {
    name: "Rajesh Kumar",
    phone: "+919876501001",
    skill_type: "SKILLED",
    categories: ["Mason", "Bricklayer"],
    latitude: 19.076,
    longitude: 72.8777,
    travel_radius: 15000,
  },
  {
    name: "Suresh Patil",
    phone: "+919876501002",
    skill_type: "SKILLED",
    categories: ["Electrician", "Wiring"],
    latitude: 19.08,
    longitude: 72.88,
    travel_radius: 20000,
  },
  {
    name: "Mahesh Sharma",
    phone: "+919876501003",
    skill_type: "SKILLED",
    categories: ["Plumber", "Pipefitter"],
    latitude: 19.085,
    longitude: 72.885,
    travel_radius: 18000,
  },
  {
    name: "Rakesh Verma",
    phone: "+919876501004",
    skill_type: "SKILLED",
    categories: ["Carpenter", "Furniture"],
    latitude: 19.09,
    longitude: 72.89,
    travel_radius: 16000,
  },
  {
    name: "Ganesh Yadav",
    phone: "+919876501005",
    skill_type: "SKILLED",
    categories: ["Welder", "Metal Work"],
    latitude: 19.095,
    longitude: 72.895,
    travel_radius: 22000,
  },
  {
    name: "Dinesh Patel",
    phone: "+919876501006",
    skill_type: "SKILLED",
    categories: ["Mason", "Plastering"],
    latitude: 19.1,
    longitude: 72.9,
    travel_radius: 17000,
  },
  {
    name: "Ramesh Singh",
    phone: "+919876501007",
    skill_type: "SKILLED",
    categories: ["Electrician", "Panel Fitting"],
    latitude: 19.105,
    longitude: 72.905,
    travel_radius: 19000,
  },
  {
    name: "Naresh Gupta",
    phone: "+919876501008",
    skill_type: "SKILLED",
    categories: ["Carpenter", "Shuttering"],
    latitude: 19.11,
    longitude: 72.91,
    travel_radius: 21000,
  },

  // Semi-Skilled Workers (7)
  {
    name: "Mukesh Chauhan",
    phone: "+919876501009",
    skill_type: "SEMI_SKILLED",
    categories: ["Painter", "Wall Finishing"],
    latitude: 19.075,
    longitude: 72.875,
    travel_radius: 14000,
  },
  {
    name: "Lokesh Joshi",
    phone: "+919876501010",
    skill_type: "SEMI_SKILLED",
    categories: ["Helper", "Material Handler"],
    latitude: 19.082,
    longitude: 72.882,
    travel_radius: 15000,
  },
  {
    name: "Kamlesh Mishra",
    phone: "+919876501011",
    skill_type: "SEMI_SKILLED",
    categories: ["Tiles", "Flooring"],
    latitude: 19.087,
    longitude: 72.887,
    travel_radius: 16000,
  },
  {
    name: "Pankaj Tiwari",
    phone: "+919876501012",
    skill_type: "SEMI_SKILLED",
    categories: ["Helper", "Masonry Assistant"],
    latitude: 19.092,
    longitude: 72.892,
    travel_radius: 13000,
  },
  {
    name: "Anil Kumar",
    phone: "+919876501013",
    skill_type: "SEMI_SKILLED",
    categories: ["Painter", "Spray Painting"],
    latitude: 19.097,
    longitude: 72.897,
    travel_radius: 17000,
  },
  {
    name: "Vikas Pandey",
    phone: "+919876501014",
    skill_type: "SEMI_SKILLED",
    categories: ["Helper", "Electrical Assistant"],
    latitude: 19.102,
    longitude: 72.902,
    travel_radius: 15000,
  },
  {
    name: "Sunil Rao",
    phone: "+919876501015",
    skill_type: "SEMI_SKILLED",
    categories: ["Tiles", "Marble Cutting"],
    latitude: 19.107,
    longitude: 72.907,
    travel_radius: 18000,
  },

  // Unskilled Workers (5)
  {
    name: "Ravi Das",
    phone: "+919876501016",
    skill_type: "UNSKILLED",
    categories: ["Helper", "General Labour"],
    latitude: 19.078,
    longitude: 72.878,
    travel_radius: 12000,
  },
  {
    name: "Sanjay Pal",
    phone: "+919876501017",
    skill_type: "UNSKILLED",
    categories: ["Helper", "Material Loader"],
    latitude: 19.084,
    longitude: 72.884,
    travel_radius: 11000,
  },
  {
    name: "Deepak Sharma",
    phone: "+919876501018",
    skill_type: "UNSKILLED",
    categories: ["Cleaner", "Site Cleaning"],
    latitude: 19.089,
    longitude: 72.889,
    travel_radius: 10000,
  },
  {
    name: "Vijay Kumar",
    phone: "+919876501019",
    skill_type: "UNSKILLED",
    categories: ["Helper", "Watchman"],
    latitude: 19.094,
    longitude: 72.894,
    travel_radius: 13000,
  },
  {
    name: "Ajay Singh",
    phone: "+919876501020",
    skill_type: "UNSKILLED",
    categories: ["Helper", "Material Carrier"],
    latitude: 19.099,
    longitude: 72.899,
    travel_radius: 12000,
  },
];

// ========================================
// WAGE RATES CONFIGURATION
// ========================================
const WAGE_RATES = [
  // Skilled rates
  { skill_type: "SKILLED", category: "Mason", hourly_rate: 85 },
  { skill_type: "SKILLED", category: "Bricklayer", hourly_rate: 80 },
  { skill_type: "SKILLED", category: "Electrician", hourly_rate: 90 },
  { skill_type: "SKILLED", category: "Wiring", hourly_rate: 85 },
  { skill_type: "SKILLED", category: "Plumber", hourly_rate: 85 },
  { skill_type: "SKILLED", category: "Pipefitter", hourly_rate: 82 },
  { skill_type: "SKILLED", category: "Carpenter", hourly_rate: 88 },
  { skill_type: "SKILLED", category: "Furniture", hourly_rate: 90 },
  { skill_type: "SKILLED", category: "Shuttering", hourly_rate: 85 },
  { skill_type: "SKILLED", category: "Welder", hourly_rate: 95 },
  { skill_type: "SKILLED", category: "Metal Work", hourly_rate: 92 },
  { skill_type: "SKILLED", category: "Plastering", hourly_rate: 80 },
  { skill_type: "SKILLED", category: "Panel Fitting", hourly_rate: 88 },

  // Semi-skilled rates
  { skill_type: "SEMI_SKILLED", category: "Painter", hourly_rate: 60 },
  { skill_type: "SEMI_SKILLED", category: "Wall Finishing", hourly_rate: 62 },
  { skill_type: "SEMI_SKILLED", category: "Spray Painting", hourly_rate: 65 },
  { skill_type: "SEMI_SKILLED", category: "Helper", hourly_rate: 55 },
  { skill_type: "SEMI_SKILLED", category: "Material Handler", hourly_rate: 58 },
  {
    skill_type: "SEMI_SKILLED",
    category: "Masonry Assistant",
    hourly_rate: 57,
  },
  {
    skill_type: "SEMI_SKILLED",
    category: "Electrical Assistant",
    hourly_rate: 60,
  },
  { skill_type: "SEMI_SKILLED", category: "Tiles", hourly_rate: 65 },
  { skill_type: "SEMI_SKILLED", category: "Flooring", hourly_rate: 63 },
  { skill_type: "SEMI_SKILLED", category: "Marble Cutting", hourly_rate: 68 },

  // Unskilled rates
  { skill_type: "UNSKILLED", category: "Helper", hourly_rate: 45 },
  { skill_type: "UNSKILLED", category: "General Labour", hourly_rate: 42 },
  { skill_type: "UNSKILLED", category: "Material Loader", hourly_rate: 44 },
  { skill_type: "UNSKILLED", category: "Material Carrier", hourly_rate: 43 },
  { skill_type: "UNSKILLED", category: "Cleaner", hourly_rate: 40 },
  { skill_type: "UNSKILLED", category: "Site Cleaning", hourly_rate: 40 },
  { skill_type: "UNSKILLED", category: "Watchman", hourly_rate: 38 },
];

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get last N working days (excluding Sundays)
 */
function getLastWorkingDays(count) {
  const days = [];
  let current = new Date();
  current.setHours(0, 0, 0, 0);

  while (days.length < count) {
    if (current.getDay() !== 0) {
      // Skip Sundays
      days.push(new Date(current));
    }
    current.setDate(current.getDate() - 1);
  }

  return days.reverse(); // Oldest to newest
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Format timestamp
 */
function formatTimestamp(date, hours, minutes) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

/**
 * Random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random work hours (realistic variation)
 */
function getRandomWorkHours() {
  // Most workers: 7-9 hours, some partial days
  const patterns = [8, 8, 8, 9, 9, 7, 7.5, 6, 8.5];
  return patterns[randomInt(0, patterns.length - 1)];
}

// ========================================
// MAIN SEED FUNCTION
// ========================================
async function seedLabourWages() {
  const client = await pool.connect();

  try {
    console.log("🌱 Starting Labour & Wages Seed Script\n");
    console.log("📋 Configuration:");
    console.log(`   Organization: ${CONFIG.organization_name}`);
    console.log(`   Org ID: ${CONFIG.organization_id}`);
    console.log(`   Project ID: ${CONFIG.project_id}`);
    console.log(`   Manager ID: ${CONFIG.manager_id}\n`);

    await client.query("BEGIN");

    // ========================================
    // 1. VERIFY PROJECT EXISTS
    // ========================================
    console.log("1️⃣  Verifying project exists...");
    const projectCheck = await client.query(
      "SELECT id, name FROM projects WHERE id = $1",
      [CONFIG.project_id],
    );

    if (projectCheck.rows.length === 0) {
      throw new Error(`Project ${CONFIG.project_id} not found!`);
    }

    const projectName = projectCheck.rows[0].name;
    console.log(`   ✓ Project found: ${projectName}\n`);

    // ========================================
    // 2. VERIFY SITE ENGINEER
    // ========================================
    console.log("2️⃣  Verifying site engineer...");
    const engineerId = CONFIG.engineer_id;
    const engineerName = CONFIG.engineer_name;
    console.log(`   ✓ Engineer: ${engineerName} (${engineerId})\n`);

    // ========================================
    // 3. CREATE LABOURERS
    // ========================================
    console.log("3️⃣  Creating labourers...");
    const labourIds = [];

    for (const labour of LABOURERS) {
      // Check if labour already exists
      const existingLabour = await client.query(
        "SELECT id FROM labours WHERE phone = $1",
        [labour.phone],
      );

      let labourId;
      if (existingLabour.rows.length > 0) {
        labourId = existingLabour.rows[0].id;
        console.log(`   ⏭️  ${labour.name} already exists`);
      } else {
        const result = await client.query(
          `INSERT INTO labours (name, phone, role, skill_type, categories, 
                                primary_latitude, primary_longitude, travel_radius_meters)
           VALUES ($1, $2, 'LABOUR', $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            labour.name,
            labour.phone,
            labour.skill_type,
            labour.categories,
            labour.latitude,
            labour.longitude,
            labour.travel_radius,
          ],
        );
        labourId = result.rows[0].id;
        console.log(`   ✓ Created: ${labour.name} (${labour.skill_type})`);

        // Add labour address
        await client.query(
          `INSERT INTO labour_addresses (labour_id, latitude, longitude, 
                                         address_text, is_primary, tag)
           VALUES ($1, $2, $3, $4, true, 'Home')`,
          [
            labourId,
            labour.latitude,
            labour.longitude,
            `${labour.name}'s Home Address, Mumbai`,
          ],
        );
      }

      labourIds.push({ id: labourId, ...labour });
    }

    console.log(`   ✓ Total labourers ready: ${labourIds.length}\n`);

    // ========================================
    // 4. CREATE WAGE RATES
    // ========================================
    console.log("4️⃣  Setting up wage rates...");
    let wageRatesCreated = 0;

    for (const rate of WAGE_RATES) {
      const existing = await client.query(
        `SELECT id FROM wage_rates 
         WHERE project_id = $1 AND skill_type = $2 AND category = $3`,
        [CONFIG.project_id, rate.skill_type, rate.category],
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO wage_rates (project_id, skill_type, category, hourly_rate, created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            CONFIG.project_id,
            rate.skill_type,
            rate.category,
            rate.hourly_rate,
            CONFIG.manager_id,
          ],
        );
        wageRatesCreated++;
      }
    }

    console.log(`   ✓ Wage rates created: ${wageRatesCreated}\n`);

    // ========================================
    // 5. CREATE ATTENDANCE RECORDS (Last 15 working days)
    // ========================================
    console.log("5️⃣  Creating attendance records...");
    const workingDays = getLastWorkingDays(15);
    let attendanceCreated = 0;

    for (const day of workingDays) {
      // Each day, 60-80% of labourers attend
      const attendingCount = Math.floor(
        labourIds.length * (0.6 + Math.random() * 0.2),
      );
      const attendingLabourers = labourIds
        .sort(() => Math.random() - 0.5)
        .slice(0, attendingCount);

      for (const labour of attendingLabourers) {
        // Check if attendance already exists
        const existing = await client.query(
          `SELECT id FROM attendance 
           WHERE project_id = $1 AND labour_id = $2 AND attendance_date = $3`,
          [CONFIG.project_id, labour.id, formatDate(day)],
        );

        if (existing.rows.length > 0) {
          continue; // Skip if already exists
        }

        const workHours = getRandomWorkHours();
        const checkInHour = randomInt(6, 8); // 6-8 AM
        const checkInMinute = randomInt(0, 59);
        const checkOutHour = checkInHour + Math.floor(workHours);
        const checkOutMinute = Math.floor((workHours % 1) * 60);

        // 90% approved, 10% pending
        const status = Math.random() < 0.9 ? "APPROVED" : "PENDING";
        const approvedBy = status === "APPROVED" ? engineerId : null;
        const approvedAt =
          status === "APPROVED"
            ? formatTimestamp(day, checkOutHour + 1, 0)
            : null;

        const attendanceResult = await client.query(
          `INSERT INTO attendance (
            project_id, labour_id, site_engineer_id, attendance_date,
            check_in_time, check_out_time, work_hours, status,
            approved_by, approved_at, is_manual, source
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, 'ONLINE')
          RETURNING id`,
          [
            CONFIG.project_id,
            labour.id,
            engineerId,
            formatDate(day),
            formatTimestamp(day, checkInHour, checkInMinute),
            formatTimestamp(day, checkOutHour, checkOutMinute),
            workHours,
            status,
            approvedBy,
            approvedAt,
          ],
        );

        const attendanceId = attendanceResult.rows[0].id;
        attendanceCreated++;

        // Create attendance session
        await client.query(
          `INSERT INTO attendance_sessions (
            attendance_id, check_in_time, check_out_time, worked_minutes
          )
          VALUES ($1, $2, $3, $4)`,
          [
            attendanceId,
            formatTimestamp(day, checkInHour, checkInMinute),
            formatTimestamp(day, checkOutHour, checkOutMinute),
            Math.floor(workHours * 60),
          ],
        );

        // ========================================
        // 6. CREATE WAGE RECORDS
        // ========================================
        if (status === "APPROVED") {
          // Get wage rate for this labour's primary category
          const primaryCategory = labour.categories[0];
          const wageRateResult = await client.query(
            `SELECT hourly_rate FROM wage_rates 
             WHERE project_id = $1 AND skill_type = $2 AND category = $3`,
            [CONFIG.project_id, labour.skill_type, primaryCategory],
          );

          if (wageRateResult.rows.length > 0) {
            const hourlyRate = wageRateResult.rows[0].hourly_rate;
            const totalAmount = hourlyRate * workHours;

            // 80% wages approved, 20% pending
            const wageStatus = Math.random() < 0.8 ? "APPROVED" : "PENDING";
            const wageApprovedBy =
              wageStatus === "APPROVED" ? CONFIG.manager_id : null;
            const wageApprovedAt =
              wageStatus === "APPROVED" ? formatTimestamp(day, 20, 0) : null;

            await client.query(
              `INSERT INTO wages (
                attendance_id, labour_id, project_id, wage_type,
                rate, total_amount, worked_hours, status,
                approved_by, approved_at, is_ready_for_payment
              )
              VALUES ($1, $2, $3, 'HOURLY', $4, $5, $6, $7, $8, $9, $10)`,
              [
                attendanceId,
                labour.id,
                CONFIG.project_id,
                hourlyRate,
                totalAmount,
                workHours,
                wageStatus,
                wageApprovedBy,
                wageApprovedAt,
                wageStatus === "APPROVED",
              ],
            );
          }
        }
      }
    }

    console.log(`   ✓ Attendance records created: ${attendanceCreated}\n`);

    // ========================================
    // COMMIT TRANSACTION
    // ========================================
    await client.query("COMMIT");

    // ========================================
    // SUMMARY
    // ========================================
    console.log("✅ SEED COMPLETED SUCCESSFULLY!\n");
    console.log("📊 Summary:");
    console.log(`   • Labourers: ${labourIds.length}`);
    console.log(
      `     - Skilled: ${labourIds.filter((l) => l.skill_type === "SKILLED").length}`,
    );
    console.log(
      `     - Semi-skilled: ${labourIds.filter((l) => l.skill_type === "SEMI_SKILLED").length}`,
    );
    console.log(
      `     - Unskilled: ${labourIds.filter((l) => l.skill_type === "UNSKILLED").length}`,
    );
    console.log(`   • Wage rates: ${wageRatesCreated} created`);
    console.log(`   • Attendance records: ${attendanceCreated}`);
    console.log(`   • Working days seeded: ${workingDays.length}\n`);

    // Get final statistics
    const wagesStats = await client.query(
      `SELECT 
         COUNT(*) as total_wages,
         SUM(total_amount) as total_amount,
         COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_wages,
         COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_wages
       FROM wages WHERE project_id = $1`,
      [CONFIG.project_id],
    );

    if (wagesStats.rows.length > 0) {
      const stats = wagesStats.rows[0];
      console.log("💰 Wages Statistics:");
      console.log(`   • Total wage records: ${stats.total_wages}`);
      console.log(
        `   • Total amount: ₹${parseFloat(stats.total_amount || 0).toFixed(2)}`,
      );
      console.log(`   • Approved: ${stats.approved_wages}`);
      console.log(`   • Pending: ${stats.pending_wages}\n`);
    }

    console.log("🎉 You can now test labour and wage features!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// ========================================
// EXECUTE
// ========================================
seedLabourWages()
  .then(() => {
    console.log("\n✨ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error.message);
    process.exit(1);
  });
