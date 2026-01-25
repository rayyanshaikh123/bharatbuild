/**
 * ========================================
 * PLANS & TIMELINE SEED SCRIPT
 * ========================================
 *
 * PURPOSE:
 * Seeds project plans and plan items for timeline visualization
 *
 * EXECUTION:
 * node seed_plans_timeline.js
 *
 * ⚠️ WARNING: DEVELOPMENT ONLY
 */

require("dotenv").config();
const pool = require("./db");

// ========================================
// PROVIDED IDS
// ========================================
const CONFIG = {
  project_id: "6af1f371-2d37-486f-8f1c-c04d42f90c83",
  manager_id: "239adc6b-f6fe-4134-a96a-49f6b0a868f0",
  engineer_id: "4cfe936b-f454-4f0f-948c-70ebed4efcb6",
};

// ========================================
// PLAN ITEMS DATA
// ========================================
const PLAN_ITEMS = [
  // Foundation Phase (Weeks 1-4)
  {
    task_name: "Site Preparation & Excavation",
    description: "Clear site, mark boundaries, and excavate for foundation",
    period_type: "WEEK",
    week_offset: 0,
    duration_weeks: 1,
    planned_quantity: 100,
    planned_manpower: 15,
    planned_cost: 250000,
    status: "COMPLETED",
    priority: 5,
    completed_days_ago: 80,
  },
  {
    task_name: "Foundation Layout & PCC",
    description: "Layout foundation lines and pour plain cement concrete",
    period_type: "WEEK",
    week_offset: 1,
    duration_weeks: 1,
    planned_quantity: 200,
    planned_manpower: 20,
    planned_cost: 350000,
    status: "COMPLETED",
    priority: 5,
    completed_days_ago: 73,
  },
  {
    task_name: "Foundation Reinforcement",
    description: "Place steel reinforcement for foundation",
    period_type: "WEEK",
    week_offset: 2,
    duration_weeks: 1,
    planned_quantity: 5000,
    planned_manpower: 12,
    planned_cost: 400000,
    status: "COMPLETED",
    priority: 5,
    completed_days_ago: 66,
  },
  {
    task_name: "Foundation Concrete Pouring",
    description: "Pour concrete for foundation and footings",
    period_type: "WEEK",
    week_offset: 3,
    duration_weeks: 1,
    planned_quantity: 150,
    planned_manpower: 25,
    planned_cost: 500000,
    status: "COMPLETED",
    priority: 5,
    completed_days_ago: 59,
  },

  // Plinth & Ground Floor (Weeks 5-12)
  {
    task_name: "Plinth Beam Construction",
    description: "Construct plinth beams and backfilling",
    period_type: "WEEK",
    week_offset: 4,
    duration_weeks: 2,
    planned_quantity: 100,
    planned_manpower: 18,
    planned_cost: 450000,
    status: "COMPLETED",
    priority: 4,
    completed_days_ago: 52,
  },
  {
    task_name: "Ground Floor Slab",
    description: "Ground floor slab concreting",
    period_type: "WEEK",
    week_offset: 6,
    duration_weeks: 2,
    planned_quantity: 200,
    planned_manpower: 22,
    planned_cost: 600000,
    status: "COMPLETED",
    priority: 4,
    completed_days_ago: 38,
  },
  {
    task_name: "Ground Floor Walls - Brickwork",
    description: "Construct brick walls for ground floor",
    period_type: "WEEK",
    week_offset: 8,
    duration_weeks: 3,
    planned_quantity: 500,
    planned_manpower: 20,
    planned_cost: 550000,
    status: "COMPLETED",
    priority: 4,
    completed_days_ago: 24,
  },
  {
    task_name: "Ground Floor Plastering",
    description: "Internal and external plastering - ground floor",
    period_type: "WEEK",
    week_offset: 11,
    duration_weeks: 2,
    planned_quantity: 400,
    planned_manpower: 15,
    planned_cost: 350000,
    status: "IN_PROGRESS",
    priority: 4,
  },

  // First Floor Structure (Weeks 13-20)
  {
    task_name: "First Floor Column Casting",
    description: "RCC columns for first floor",
    period_type: "WEEK",
    week_offset: 13,
    duration_weeks: 2,
    planned_quantity: 80,
    planned_manpower: 18,
    planned_cost: 480000,
    status: "IN_PROGRESS",
    priority: 3,
  },
  {
    task_name: "First Floor Beam & Slab",
    description: "Construct beams and slab for first floor",
    period_type: "WEEK",
    week_offset: 15,
    duration_weeks: 3,
    planned_quantity: 180,
    planned_manpower: 25,
    planned_cost: 650000,
    status: "PENDING",
    priority: 3,
  },
  {
    task_name: "First Floor Brickwork",
    description: "Brick masonry for first floor walls",
    period_type: "WEEK",
    week_offset: 18,
    duration_weeks: 3,
    planned_quantity: 480,
    planned_manpower: 20,
    planned_cost: 520000,
    status: "PENDING",
    priority: 3,
  },

  // Second Floor Structure (Weeks 21-28)
  {
    task_name: "Second Floor Columns",
    description: "RCC columns for second floor",
    period_type: "WEEK",
    week_offset: 21,
    duration_weeks: 2,
    planned_quantity: 75,
    planned_manpower: 18,
    planned_cost: 460000,
    status: "PENDING",
    priority: 2,
  },
  {
    task_name: "Second Floor Beam & Slab",
    description: "Beams and slab construction - second floor",
    period_type: "WEEK",
    week_offset: 23,
    duration_weeks: 3,
    planned_quantity: 170,
    planned_manpower: 24,
    planned_cost: 630000,
    status: "PENDING",
    priority: 2,
  },
  {
    task_name: "Second Floor Brickwork",
    description: "Brick walls for second floor",
    period_type: "WEEK",
    week_offset: 26,
    duration_weeks: 3,
    planned_quantity: 460,
    planned_manpower: 19,
    planned_cost: 510000,
    status: "PENDING",
    priority: 2,
  },

  // Roofing & Finishing (Weeks 29-40)
  {
    task_name: "Roof Slab Construction",
    description: "Top roof slab with waterproofing",
    period_type: "WEEK",
    week_offset: 29,
    duration_weeks: 2,
    planned_quantity: 180,
    planned_manpower: 22,
    planned_cost: 580000,
    status: "PENDING",
    priority: 1,
  },
  {
    task_name: "Internal Plastering - All Floors",
    description: "Complete internal plastering work",
    period_type: "WEEK",
    week_offset: 31,
    duration_weeks: 4,
    planned_quantity: 1200,
    planned_manpower: 25,
    planned_cost: 850000,
    status: "PENDING",
    priority: 1,
  },
  {
    task_name: "External Plastering & Finishing",
    description: "External plastering and facade work",
    period_type: "WEEK",
    week_offset: 35,
    duration_weeks: 3,
    planned_quantity: 800,
    planned_manpower: 20,
    planned_cost: 650000,
    status: "PENDING",
    priority: 1,
  },
  {
    task_name: "Electrical Wiring - Conduit & Pipes",
    description: "Install electrical conduits and plumbing pipes",
    period_type: "WEEK",
    week_offset: 33,
    duration_weeks: 3,
    planned_quantity: 500,
    planned_manpower: 12,
    planned_cost: 380000,
    status: "PENDING",
    priority: 1,
  },
  {
    task_name: "Flooring Work",
    description: "Tile and marble flooring installation",
    period_type: "WEEK",
    week_offset: 38,
    duration_weeks: 4,
    planned_quantity: 600,
    planned_manpower: 18,
    planned_cost: 720000,
    status: "PENDING",
    priority: 0,
  },
  {
    task_name: "Painting Work",
    description: "Interior and exterior painting",
    period_type: "WEEK",
    week_offset: 42,
    duration_weeks: 3,
    planned_quantity: 1500,
    planned_manpower: 15,
    planned_cost: 450000,
    status: "PENDING",
    priority: 0,
  },
  {
    task_name: "Fixtures & Fittings",
    description: "Install doors, windows, sanitary fittings",
    period_type: "WEEK",
    week_offset: 45,
    duration_weeks: 2,
    planned_quantity: 100,
    planned_manpower: 10,
    planned_cost: 550000,
    status: "PENDING",
    priority: 0,
  },
];

// ========================================
// HELPER FUNCTIONS
// ========================================

function getWeekDates(startDate, weekOffset, durationWeeks) {
  const start = new Date(startDate);
  start.setDate(start.getDate() + weekOffset * 7);

  const end = new Date(start);
  end.setDate(end.getDate() + durationWeeks * 7 - 1);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getCompletedDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

// ========================================
// MAIN SEED FUNCTION
// ========================================
async function seedPlansTimeline() {
  const client = await pool.connect();

  try {
    console.log("🌱 Starting Plans & Timeline Seed Script\n");
    console.log("📋 Configuration:");
    console.log(`   Project ID: ${CONFIG.project_id}`);
    console.log(`   Manager ID: ${CONFIG.manager_id}\n`);

    await client.query("BEGIN");

    // ========================================
    // 1. VERIFY PROJECT
    // ========================================
    console.log("1️⃣  Verifying project...");
    const projectCheck = await client.query(
      "SELECT id, name, start_date, end_date FROM projects WHERE id = $1",
      [CONFIG.project_id],
    );

    if (projectCheck.rows.length === 0) {
      throw new Error(`Project ${CONFIG.project_id} not found!`);
    }

    const project = projectCheck.rows[0];
    console.log(`   ✓ Project: ${project.name}`);

    // Use project start date or set one
    let projectStartDate = project.start_date
      ? new Date(project.start_date)
      : new Date(new Date().setDate(new Date().getDate() - 90)); // 90 days ago

    console.log(
      `   ✓ Project start date: ${projectStartDate.toISOString().split("T")[0]}\n`,
    );

    // ========================================
    // 2. CREATE OR GET PLAN
    // ========================================
    console.log("2️⃣  Creating project plan...");

    // Check if plan exists
    const existingPlan = await client.query(
      "SELECT id FROM plans WHERE project_id = $1",
      [CONFIG.project_id],
    );

    let planId;
    if (existingPlan.rows.length > 0) {
      planId = existingPlan.rows[0].id;
      console.log(`   ⏭️  Plan already exists: ${planId}`);

      // Delete existing plan items to recreate
      await client.query("DELETE FROM plan_items WHERE plan_id = $1", [planId]);
      console.log(`   🗑️  Cleared existing plan items\n`);
    } else {
      // Calculate plan end date (1 year from start)
      const planEndDate = new Date(projectStartDate);
      planEndDate.setDate(planEndDate.getDate() + 365);

      const planResult = await client.query(
        `INSERT INTO plans (project_id, created_by, start_date, end_date)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          CONFIG.project_id,
          CONFIG.manager_id,
          projectStartDate.toISOString().split("T")[0],
          planEndDate.toISOString().split("T")[0],
        ],
      );
      planId = planResult.rows[0].id;
      console.log(`   ✓ Plan created: ${planId}\n`);
    }

    // ========================================
    // 3. CREATE PLAN ITEMS
    // ========================================
    console.log("3️⃣  Creating plan items...");
    let itemsCreated = 0;

    for (const item of PLAN_ITEMS) {
      const dates = getWeekDates(
        projectStartDate,
        item.week_offset,
        item.duration_weeks,
      );

      const completedAt =
        item.status === "COMPLETED" && item.completed_days_ago
          ? getCompletedDate(item.completed_days_ago)
          : null;

      await client.query(
        `INSERT INTO plan_items (
          plan_id, period_type, period_start, period_end,
          task_name, description, planned_quantity, planned_manpower, planned_cost,
          status, priority, completed_at, updated_by, updated_by_role
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'MANAGER')`,
        [
          planId,
          item.period_type,
          dates.start,
          dates.end,
          item.task_name,
          item.description,
          item.planned_quantity,
          item.planned_manpower,
          item.planned_cost,
          item.status,
          item.priority,
          completedAt,
          CONFIG.manager_id,
        ],
      );
      itemsCreated++;
    }

    console.log(`   ✓ Plan items created: ${itemsCreated}\n`);

    // ========================================
    // COMMIT TRANSACTION
    // ========================================
    await client.query("COMMIT");

    // ========================================
    // SUMMARY
    // ========================================
    console.log("✅ SEED COMPLETED SUCCESSFULLY!\n");
    console.log("📊 Summary:");
    console.log(`   • Plan ID: ${planId}`);
    console.log(`   • Total plan items: ${itemsCreated}`);

    const stats = PLAN_ITEMS.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    console.log(`   • Completed: ${stats.COMPLETED || 0}`);
    console.log(`   • In Progress: ${stats.IN_PROGRESS || 0}`);
    console.log(`   • Pending: ${stats.PENDING || 0}\n`);

    console.log("🎉 Timeline is now ready for viewing!");
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
seedPlansTimeline()
  .then(() => {
    console.log("\n✨ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error.message);
    process.exit(1);
  });
