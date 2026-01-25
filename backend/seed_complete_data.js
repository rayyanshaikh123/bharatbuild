/**
 * ========================================
 * COMPLETE DATA SEEDING SCRIPT
 * ========================================
 *
 * PURPOSE:
 * Seeds comprehensive data for vasantdada patil project including:
 * 1. DPRs (Daily Progress Reports)
 * 2. Dangerous Work Permits
 * 3. Subcontractors
 * 4. Project Delays
 * 5. QA Inspections
 * 6. Manual Labour
 *
 * EXECUTION:
 * node seed_complete_data.js
 *
 * ⚠️ WARNING: DEVELOPMENT ONLY
 */

require("dotenv").config();
const pool = require("./db");
const fs = require("fs");
const path = require("path");

// ========================================
// PROVIDED IDS & CREDENTIALS (from seed_labour_wages.js)
// ========================================
const CONFIG = {
  owner_id: "0a3555e5-2c7f-4fb5-92fb-f9d2b0d4151a",
  owner_email: "test@test.com",
  organization_id: "16796142-4eac-40e8-a970-ea5796009b05",
  organization_name: "pyarelal Org",
  project_id: "6af1f371-2d37-486f-8f1c-c04d42f90c83",
  project_name: "vasantdada patil",
  manager_id: "239adc6b-f6fe-4134-a96a-49f6b0a868f0",
  manager_email: "manager@test.com",
  engineer_id: "4cfe936b-f454-4f0f-948c-70ebed4efcb6",
  engineer_name: "Rayyan",
  engineer_email: "rayyan.shaikhh@gmail.com",
  purchase_manager_id: "a9c5f575-d926-40af-9c3f-5cc50ebb79a4",
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function randomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toBase64(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer.toString("base64");
  } catch (err) {
    console.warn(`Warning: Could not read file ${filePath}:`, err.message);
    return null;
  }
}

// Read images from imgs folder
const IMAGES = {
  img1: toBase64(path.join(__dirname, "imgs", "IMG_3153.HEIC")),
  img2: toBase64(path.join(__dirname, "imgs", "IMG_3154.HEIC")),
  img3: toBase64(path.join(__dirname, "imgs", "IMG_3155.HEIC")),
  pdf: toBase64(path.join(__dirname, "imgs", "A372_Exp_2.pdf")),
};

// ========================================
// DANGEROUS WORK DEFINITIONS
// ========================================
const DANGEROUS_TASKS = [
  {
    name: "Electrical Work at Height",
    description: "Installing or repairing electrical systems above 6 feet",
  },
  {
    name: "Welding Operations",
    description: "Arc welding, gas welding, or cutting operations",
  },
  {
    name: "Deep Excavation Work",
    description: "Excavation deeper than 5 feet",
  },
  {
    name: "Chemical Handling",
    description: "Mixing or applying hazardous chemicals",
  },
  {
    name: "Heavy Equipment Operation",
    description: "Operating cranes, excavators, or heavy machinery",
  },
];

// ========================================
// SUBCONTRACTOR DATA
// ========================================
const SUBCONTRACTORS = [
  {
    name: "Elite Electrical Contractors",
    specialization: "Electrical",
    contact_name: "Rajesh Electricals",
    contact_phone: "+919823456701",
    contact_email: "contact@eliteelec.com",
  },
  {
    name: "Premium Plumbing Services",
    specialization: "Plumbing",
    contact_name: "Suresh Plumber",
    contact_phone: "+919823456702",
    contact_email: "info@premiumplumb.com",
  },
  {
    name: "Master Painters Co.",
    specialization: "Painting",
    contact_name: "Mahesh Painter",
    contact_phone: "+919823456703",
    contact_email: "sales@masterpaint.com",
  },
  {
    name: "Royal Tiling Works",
    specialization: "Tiling",
    contact_name: "Dinesh Tiles",
    contact_phone: "+919823456704",
    contact_email: "contact@royaltile.com",
  },
  {
    name: "Steel Fabricators Ltd",
    specialization: "Steel Work",
    contact_name: "Ganesh Steel",
    contact_phone: "+919823456705",
    contact_email: "info@steelfab.com",
  },
];

// ========================================
// MANUAL LABOUR DATA (Temporary Workers)
// ========================================
const MANUAL_LABOURS = [
  {
    name: "Temporary Worker 1",
    skill: "Helper",
  },
  {
    name: "Temporary Worker 2",
    skill: "Cleaner",
  },
  {
    name: "Temporary Worker 3",
    skill: "Helper",
  },
  {
    name: "Temporary Worker 4",
    skill: "Material Carrier",
  },
  {
    name: "Temporary Worker 5",
    skill: "Painter Helper",
  },
];

// ========================================
// PROJECT DELAY REASONS
// ========================================
const DELAY_REASONS = [
  "Heavy rainfall delayed foundation work",
  "Material delivery postponed by supplier",
  "Shortage of skilled labour",
  "Equipment breakdown",
  "Design changes from client",
  "Permit approval pending",
  "Worker illness/absence",
  "Power supply issues",
];

// ========================================
// MATERIAL DATA
// ========================================
const MATERIALS = [
  {
    name: "OPC 53 Grade Cement",
    category: "CEMENT",
    unit: "Bags",
    unit_price: 450,
  },
  { name: "TMT Bars 12mm", category: "STEEL", unit: "Kg", unit_price: 63 },
  { name: "River Sand", category: "SAND", unit: "CFT", unit_price: 45 },
  {
    name: "20mm Aggregate",
    category: "AGGREGATES",
    unit: "CFT",
    unit_price: 48,
  },
  { name: "Red Clay Bricks", category: "BRICKS", unit: "Nos", unit_price: 8 },
  {
    name: "Vitrified Tiles 2x2",
    category: "TILES",
    unit: "Box",
    unit_price: 850,
  },
];

const VENDORS = [
  {
    name: "Supreme Cement Co.",
    contact: "+919876543210",
    speciality: "CEMENT",
  },
  { name: "Steel India Ltd", contact: "+919876543211", speciality: "STEEL" },
  { name: "BuildMart Suppliers", contact: "+919876543212", speciality: "SAND" },
  {
    name: "Aggregate Solutions",
    contact: "+919876543213",
    speciality: "AGGREGATES",
  },
  { name: "Royal Tiles Depot", contact: "+919876543214", speciality: "TILES" },
];

function generatePONumber() {
  const timestamp = Date.now().toString().slice(-8);
  return `PO-${timestamp}`;
}

// ========================================
// MAIN SEEDING FUNCTION
// ========================================
async function seedCompleteData() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("\n========================================");
    console.log("STARTING COMPLETE DATA SEEDING");
    console.log("========================================\n");

    // Get existing data
    const labourResult = await client.query(
      `SELECT DISTINCT l.id, l.name, l.skill_type 
       FROM labours l
       JOIN attendance a ON a.labour_id = l.id
       WHERE a.project_id = $1 
       LIMIT 10`,
      [CONFIG.project_id],
    );
    const labours = labourResult.rows;

    const planResult = await client.query(
      `SELECT id FROM plans WHERE project_id = $1`,
      [CONFIG.project_id],
    );
    const planId = planResult.rows[0]?.id;

    if (!planId) {
      throw new Error("No plan found. Please run seed_plans_timeline.js first");
    }

    const planItemsResult = await client.query(
      `SELECT id, task_name, status FROM plan_items WHERE plan_id = $1 ORDER BY period_start`,
      [planId],
    );
    const planItems = planItemsResult.rows;

    console.log(`✓ Found ${labours.length} labours`);
    console.log(`✓ Found ${planItems.length} plan items\n`);

    // ========================================
    // 1. SEED DANGEROUS WORK PERMITS
    // ========================================
    console.log("1. Seeding Dangerous Work Permits...");
    const dangerousTaskIds = [];

    for (const task of DANGEROUS_TASKS) {
      const existingTask = await client.query(
        `SELECT id FROM dangerous_tasks WHERE project_id = $1 AND name = $2`,
        [CONFIG.project_id, task.name],
      );

      let taskId;
      if (existingTask.rows.length > 0) {
        taskId = existingTask.rows[0].id;
        console.log(`  - Task already exists: ${task.name}`);
      } else {
        const result = await client.query(
          `INSERT INTO dangerous_tasks (project_id, name, description, is_active, created_by, created_by_role)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            CONFIG.project_id,
            task.name,
            task.description,
            true,
            CONFIG.engineer_id,
            "SITE_ENGINEER",
          ],
        );
        taskId = result.rows[0].id;
        console.log(`  ✓ Created: ${task.name}`);
      }
      dangerousTaskIds.push({ id: taskId, name: task.name });
    }

    // Create dangerous work requests
    let dangerousRequestCount = 0;
    for (let i = 0; i < 15; i++) {
      const labour = randomChoice(labours);
      const task = randomChoice(dangerousTaskIds);
      const requestDate = randomDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date(),
      );

      const existing = await client.query(
        `SELECT id FROM dangerous_task_requests 
         WHERE labour_id = $1 AND dangerous_task_id = $2 AND DATE(requested_at) = DATE($3)`,
        [labour.id, task.id, requestDate],
      );

      if (existing.rows.length === 0) {
        const status = randomChoice([
          "REQUESTED",
          "APPROVED",
          "APPROVED",
          "APPROVED",
          "REJECTED",
        ]);

        const reqResult = await client.query(
          `INSERT INTO dangerous_task_requests (labour_id, dangerous_task_id, project_id, status, requested_at, approved_at, approved_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            labour.id,
            task.id,
            CONFIG.project_id,
            status,
            requestDate,
            status !== "REQUESTED"
              ? new Date(requestDate.getTime() + 60 * 60 * 1000)
              : null,
            status !== "REQUESTED" ? CONFIG.engineer_id : null,
          ],
        );

        // If approved, create OTP record
        if (status === "APPROVED") {
          const bcrypt = require("bcrypt");
          const otp = String(randomInt(100000, 999999));
          const otpHash = await bcrypt.hash(otp, 10);

          await client.query(
            `INSERT INTO dangerous_task_otps (task_request_id, otp_hash, expires_at, verified, verified_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              reqResult.rows[0].id,
              otpHash,
              new Date(requestDate.getTime() + 5 * 60 * 1000), // 5 minutes expiry
              Math.random() > 0.3, // 70% verified
              Math.random() > 0.3
                ? new Date(requestDate.getTime() + 3 * 60 * 1000)
                : null,
            ],
          );
        }

        dangerousRequestCount++;
      }
    }
    console.log(
      `  ✓ Created ${dangerousRequestCount} dangerous work requests\n`,
    );

    // ========================================
    // 2. SEED MATERIAL REQUESTS → POs → GRNs
    // ========================================
    console.log("2. Seeding Material Requests → Purchase Orders → GRNs...");

    const materialRequests = [];
    let materialRequestCount = 0;

    // Create 6 material requests (one for each material type)
    for (let i = 0; i < MATERIALS.length; i++) {
      const material = MATERIALS[i];
      const quantity = randomInt(50, 200);
      const requestDate = randomDate(
        new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      );

      // 80% approved, 20% pending
      const status = Math.random() < 0.8 ? "APPROVED" : "PENDING";

      const result = await client.query(
        `INSERT INTO material_requests (
          project_id, site_engineer_id, title, category, quantity,
          description, status, reviewed_by, reviewed_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, status`,
        [
          CONFIG.project_id,
          CONFIG.engineer_id,
          `${material.name} - ${quantity} ${material.unit}`,
          material.category,
          quantity,
          `Request for ${material.name} for construction work`,
          status,
          status === "APPROVED" ? CONFIG.manager_id : null,
          status === "APPROVED"
            ? new Date(requestDate.getTime() + 2 * 60 * 60 * 1000)
            : null,
          requestDate,
        ],
      );

      materialRequests.push({
        id: result.rows[0].id,
        material,
        quantity,
        status: result.rows[0].status,
        createdAt: requestDate,
      });
      materialRequestCount++;
    }

    console.log(`  ✓ Created ${materialRequestCount} material requests`);

    // Create Purchase Orders for approved requests
    const purchaseOrders = [];
    let poCount = 0;

    for (const request of materialRequests) {
      if (request.status !== "APPROVED") continue;

      const vendor = VENDORS.find(
        (v) => v.speciality === request.material.category,
      );
      if (!vendor) continue;

      const poNumber = generatePONumber();
      const items = [
        {
          material_name: request.material.name,
          category: request.material.category,
          quantity: request.quantity,
          unit: request.material.unit,
          unit_price: request.material.unit_price,
          total_price: request.quantity * request.material.unit_price,
        },
      ];

      const totalAmount = items[0].total_price;
      const sentAt = new Date(request.createdAt.getTime() + 4 * 60 * 60 * 1000);

      // Load image/PDF for attachment
      const imageFiles = [
        "IMG_3153.HEIC",
        "IMG_3154.HEIC",
        "IMG_3155.HEIC",
        "A372_Exp_2.pdf",
      ];
      const randomImage = randomChoice(imageFiles);
      const poPdfPath = path.join(__dirname, "imgs", randomImage);
      const poPdfData = fs.readFileSync(poPdfPath);
      const pdfMimeType = randomImage.endsWith(".pdf")
        ? "application/pdf"
        : "image/heic";

      const poResult = await client.query(
        `INSERT INTO purchase_orders (
          material_request_id, project_id, po_number, vendor_name, vendor_contact,
          items, total_amount, status, created_by, created_by_role, created_at, sent_at, po_pdf, po_pdf_mime
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'SENT', $8, 'PURCHASE_MANAGER', $9, $10, $11, $12)
        RETURNING id`,
        [
          request.id,
          CONFIG.project_id,
          poNumber,
          vendor.name,
          vendor.contact,
          JSON.stringify(items),
          totalAmount,
          CONFIG.purchase_manager_id,
          request.createdAt,
          sentAt,
          poPdfData,
          pdfMimeType,
        ],
      );

      purchaseOrders.push({
        id: poResult.rows[0].id,
        requestId: request.id,
        vendor,
        items,
        totalAmount,
        sentAt,
      });
      poCount++;
    }

    console.log(`  ✓ Created ${poCount} purchase orders`);

    // Create GRNs for POs
    let grnCount = 0;

    for (const po of purchaseOrders) {
      const receivedAt = new Date(
        po.sentAt.getTime() + randomInt(3, 6) * 24 * 60 * 60 * 1000,
      );

      const receivedItems = po.items.map((item) => ({
        ...item,
        received_quantity:
          Math.random() < 0.9 ? item.quantity : Math.floor(item.quantity * 0.8),
      }));

      // 80% approved, 20% pending
      const status = Math.random() < 0.8 ? "APPROVED" : "PENDING";

      // Load image for GRN
      const imageFiles = ["IMG_3153.HEIC", "IMG_3154.HEIC", "IMG_3155.HEIC"];
      const randomImage = randomChoice(imageFiles);
      const billImagePath = path.join(__dirname, "imgs", randomImage);
      const billImageData = fs.readFileSync(billImagePath);

      await client.query(
        `INSERT INTO goods_receipt_notes (
          project_id, purchase_order_id, material_request_id, received_items,
          received_at, received_by, status, reviewed_by, reviewed_at, created_at, bill_image, bill_image_mime
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          CONFIG.project_id,
          po.id,
          po.requestId,
          JSON.stringify(receivedItems),
          receivedAt,
          CONFIG.engineer_id,
          status,
          status === "APPROVED" ? CONFIG.manager_id : null,
          status === "APPROVED"
            ? new Date(receivedAt.getTime() + 3 * 60 * 60 * 1000)
            : null,
          receivedAt,
          billImageData,
          "image/heic",
        ],
      );

      grnCount++;
    }

    console.log(`  ✓ Created ${grnCount} GRNs with images\n`);

    // ========================================
    // 3. SEED SUBCONTRACTORS
    // ========================================
    console.log("3. Seeding Subcontractors...");
    const subcontractorIds = [];

    for (const sub of SUBCONTRACTORS) {
      const existing = await client.query(
        `SELECT id FROM subcontractors WHERE org_id = $1 AND contact_email = $2`,
        [CONFIG.organization_id, sub.contact_email],
      );

      let subId;
      if (existing.rows.length > 0) {
        subId = existing.rows[0].id;
        console.log(`  - Subcontractor already exists: ${sub.name}`);
      } else {
        const result = await client.query(
          `INSERT INTO subcontractors (org_id, name, specialization, contact_name, contact_phone, contact_email)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            CONFIG.organization_id,
            sub.name,
            sub.specialization,
            sub.contact_name,
            sub.contact_phone,
            sub.contact_email,
          ],
        );
        subId = result.rows[0].id;
        console.log(`  ✓ Created: ${sub.name}`);
      }
      subcontractorIds.push({
        id: subId,
        name: sub.name,
        specialization: sub.specialization,
      });
    }

    // Assign subcontractors to plan items
    let taskSubcontractorCount = 0;
    const completedItems = planItems.filter(
      (item) => item.status === "COMPLETED",
    );

    for (const item of completedItems.slice(0, 5)) {
      const sub = randomChoice(subcontractorIds);

      const existing = await client.query(
        `SELECT id FROM task_subcontractors WHERE task_id = $1`,
        [item.id],
      );

      if (existing.rows.length === 0) {
        const assignedDate = randomDate(
          new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        );

        const taskSubResult = await client.query(
          `INSERT INTO task_subcontractors 
           (task_id, subcontractor_id, assigned_by, assigned_at, task_start_date, task_completed_at)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            item.id,
            sub.id,
            CONFIG.manager_id,
            assignedDate,
            assignedDate,
            new Date(
              assignedDate.getTime() + randomInt(10, 20) * 24 * 60 * 60 * 1000,
            ),
          ],
        );

        taskSubcontractorCount++;
      }
    }
    console.log(
      `  ✓ Assigned ${taskSubcontractorCount} subcontractors to tasks\n`,
    );

    // ========================================
    // 4. SEED PROJECT BREAKS (Delays)
    // ========================================
    console.log("4. Seeding Project Breaks...");
    let breakCount = 0;

    for (let i = 0; i < 10; i++) {
      const breakDate = randomDate(
        new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      );

      const breakStart = new Date(breakDate);
      breakStart.setHours(randomInt(10, 14), 0, 0);

      const breakEnd = new Date(breakStart);
      breakEnd.setMinutes(breakStart.getMinutes() + randomInt(15, 120)); // 15 mins to 2 hours

      const existing = await client.query(
        `SELECT id FROM project_breaks WHERE project_id = $1 AND started_at = $2`,
        [CONFIG.project_id, breakStart],
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO project_breaks 
           (project_id, started_at, ended_at, created_by, created_by_role, reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            CONFIG.project_id,
            breakStart,
            breakEnd,
            CONFIG.engineer_id,
            "SITE_ENGINEER",
            randomChoice(DELAY_REASONS),
          ],
        );
        breakCount++;
      }
    }
    console.log(`  ✓ Created ${breakCount} project breaks\n`);

    // ========================================
    // 5. SKIP QA INSPECTIONS (No qa_inspections table in schema)
    // ========================================
    console.log("5. Skipping QA Inspections (table not in schema)\n");

    // ========================================
    // 6. SEED DPRs (Daily Progress Reports)
    // ========================================
    console.log("6. Seeding DPRs (Daily Progress Reports)...");
    let dprCount = 0;

    // Get material usage data
    const materialResult = await client.query(
      `SELECT id, material_name FROM project_material_stock WHERE project_id = $1 LIMIT 5`,
      [CONFIG.project_id],
    );
    const materials = materialResult.rows;

    for (let i = 0; i < 15; i++) {
      const dprDate = randomDate(
        new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      );

      const existing = await client.query(
        `SELECT id FROM dprs 
         WHERE project_id = $1 AND site_engineer_id = $2 AND DATE(report_date) = DATE($3)`,
        [CONFIG.project_id, CONFIG.engineer_id, dprDate],
      );

      if (existing.rows.length === 0) {
        const status = randomChoice(["PENDING", "APPROVED", "APPROVED"]);
        const item = randomChoice(planItems);

        const title = `Daily Progress - ${dprDate.toISOString().split("T")[0]}`;
        const description =
          `Work progress on ${item.task_name}. ` +
          `Team of ${randomInt(5, 15)} workers deployed. ` +
          randomChoice([
            "Good weather conditions, work progressing smoothly.",
            "Some material delay, but managed with available resources.",
            "Extra workers deployed to meet deadline.",
            "Quality checks performed, all satisfactory.",
          ]);

        // Create material usage JSON
        const materialUsage = [];
        if (materials.length > 0 && Math.random() < 0.6) {
          const material = randomChoice(materials);
          const quantityUsed = randomInt(10, 100);
          materialUsage.push({
            material_id: material.id,
            material_name: material.material_name,
            quantity_used: quantityUsed,
            remarks: `${quantityUsed} units used`,
          });
        }

        await client.query(
          `INSERT INTO dprs 
           (project_id, site_engineer_id, report_date, title, description, 
            material_usage, status, submitted_at, reviewed_by, reviewed_at, plan_item_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            CONFIG.project_id,
            CONFIG.engineer_id,
            dprDate,
            title,
            description,
            materialUsage.length > 0 ? JSON.stringify(materialUsage) : null,
            status,
            dprDate,
            status !== "PENDING" ? CONFIG.manager_id : null,
            status !== "PENDING"
              ? new Date(dprDate.getTime() + 12 * 60 * 60 * 1000)
              : null,
            item.id,
          ],
        );

        dprCount++;
      }
    }
    console.log(`  ✓ Created ${dprCount} DPRs with material usage\n`);

    // ========================================
    // 7. SEED MANUAL LABOUR
    // ========================================
    console.log("7. Seeding Manual Labour...");
    const manualLabourIds = [];

    for (const labour of MANUAL_LABOURS) {
      const existing = await client.query(
        `SELECT id FROM manual_attendance_labours WHERE project_id = $1 AND name = $2 AND skill = $3`,
        [CONFIG.project_id, labour.name, labour.skill],
      );

      let labourId;
      if (existing.rows.length > 0) {
        labourId = existing.rows[0].id;
        console.log(`  - Manual labour already exists: ${labour.name}`);
      } else {
        const result = await client.query(
          `INSERT INTO manual_attendance_labours (project_id, name, skill, created_by)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [CONFIG.project_id, labour.name, labour.skill, CONFIG.engineer_id],
        );
        labourId = result.rows[0].id;
        console.log(`  ✓ Created: ${labour.name}`);
      }
      manualLabourIds.push({ id: labourId, name: labour.name });
    }
    console.log(`  ✓ Created ${MANUAL_LABOURS.length} manual labour entries\n`);

    await client.query("COMMIT");

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n========================================");
    console.log("SEEDING COMPLETED SUCCESSFULLY!");
    console.log("========================================");
    console.log(`Project: ${CONFIG.project_name}`);
    console.log(`Organization: ${CONFIG.organization_name}`);
    console.log("\nData Created:");
    console.log(`  • ${DANGEROUS_TASKS.length} dangerous task types`);
    console.log(`  • ${dangerousRequestCount} dangerous work requests`);
    console.log(`  • ${materialRequestCount} material requests`);
    console.log(`  • ${poCount} purchase orders with attachments`);
    console.log(`  • ${grnCount} GRNs with images`);
    console.log(`  • ${SUBCONTRACTORS.length} subcontractors`);
    console.log(`  • ${taskSubcontractorCount} task assignments`);
    console.log(`  • ${breakCount} project breaks (delays)`);
    console.log(`  • ${MANUAL_LABOURS.length} manual labour entries`);
    console.log(`  • ${dprCount} DPRs with material usage`);
    console.log("\n========================================\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ ERROR:", err.message);
    console.error(err);
    throw err;
  } finally {
    client.release();
  }
}

// ========================================
// EXECUTION
// ========================================
seedCompleteData()
  .then(() => {
    console.log("✓ Script completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ Script failed:", err.message);
    process.exit(1);
  });
