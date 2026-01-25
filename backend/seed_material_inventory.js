/**
 * ========================================
 * MATERIAL INVENTORY SEED SCRIPT
 * ========================================
 *
 * PURPOSE:
 * Seeds complete material/inventory management data including:
 * - Material Requests
 * - Purchase Orders
 * - GRNs (Goods Receipt Notes)
 * - Material Bills
 * - Material Stock
 * - Material Ledger
 * - Consumption Records
 *
 * EXECUTION:
 * node seed_material_inventory.js
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
  organization_id: "16796142-4eac-40e8-a970-ea5796009b05",
  organization_name: "pyarelal Org",
  project_id: "6af1f371-2d37-486f-8f1c-c04d42f90c83",
  manager_id: "239adc6b-f6fe-4134-a96a-49f6b0a868f0",
  engineer_id: "4cfe936b-f454-4f0f-948c-70ebed4efcb6",
  purchase_manager_id: "a9c5f575-d926-40af-9c3f-5cc50ebb79a4",
};

// ========================================
// MATERIAL CATEGORIES & ITEMS
// ========================================
const MATERIAL_CATEGORIES = {
  CEMENT: [
    { name: "OPC 53 Grade Cement", unit: "Bags", unit_price: 450 },
    { name: "PPC Cement", unit: "Bags", unit_price: 420 },
    { name: "White Cement", unit: "Bags", unit_price: 580 },
  ],
  STEEL: [
    { name: "TMT Bars 8mm", unit: "Kg", unit_price: 65 },
    { name: "TMT Bars 10mm", unit: "Kg", unit_price: 64 },
    { name: "TMT Bars 12mm", unit: "Kg", unit_price: 63 },
    { name: "TMT Bars 16mm", unit: "Kg", unit_price: 62 },
    { name: "Steel Wire", unit: "Kg", unit_price: 55 },
  ],
  BRICKS: [
    { name: "Red Clay Bricks", unit: "Nos", unit_price: 8 },
    { name: "Fly Ash Bricks", unit: "Nos", unit_price: 6.5 },
    { name: "AAC Blocks", unit: "Nos", unit_price: 55 },
  ],
  SAND: [
    { name: "River Sand", unit: "CFT", unit_price: 45 },
    { name: "M Sand", unit: "CFT", unit_price: 42 },
    { name: "P Sand", unit: "CFT", unit_price: 40 },
  ],
  AGGREGATES: [
    { name: "20mm Aggregate", unit: "CFT", unit_price: 48 },
    { name: "40mm Aggregate", unit: "CFT", unit_price: 50 },
    { name: "Stone Chips", unit: "CFT", unit_price: 35 },
  ],
  TILES: [
    { name: "Vitrified Tiles 2x2", unit: "Box", unit_price: 850 },
    { name: "Ceramic Tiles 1x1", unit: "Box", unit_price: 450 },
    { name: "Bathroom Tiles", unit: "Box", unit_price: 650 },
  ],
  PAINT: [
    { name: "Exterior Emulsion", unit: "Litre", unit_price: 380 },
    { name: "Interior Emulsion", unit: "Litre", unit_price: 320 },
    { name: "Primer", unit: "Litre", unit_price: 180 },
    { name: "Putty", unit: "Kg", unit_price: 45 },
  ],
  ELECTRICAL: [
    { name: "Copper Wire 2.5mm", unit: "Metre", unit_price: 25 },
    { name: "PVC Conduit Pipe", unit: "Metre", unit_price: 18 },
    { name: "MCB 32A", unit: "Nos", unit_price: 180 },
    { name: "Modular Switches", unit: "Nos", unit_price: 120 },
  ],
  PLUMBING: [
    { name: "PVC Pipe 1 inch", unit: "Metre", unit_price: 45 },
    { name: "PVC Pipe 2 inch", unit: "Metre", unit_price: 85 },
    { name: "Brass Fittings", unit: "Nos", unit_price: 150 },
    { name: "Water Tank 500L", unit: "Nos", unit_price: 4500 },
  ],
  HARDWARE: [
    { name: "Door Hinges", unit: "Pairs", unit_price: 85 },
    { name: "Door Locks", unit: "Nos", unit_price: 450 },
    { name: "Nails", unit: "Kg", unit_price: 75 },
    { name: "Screws", unit: "Kg", unit_price: 95 },
  ],
};

// ========================================
// VENDORS DATABASE
// ========================================
const VENDORS = [
  {
    name: "Shree Cement Suppliers",
    contact: "+919876543101",
    speciality: "CEMENT",
  },
  {
    name: "Maharashtra Steel Corp",
    contact: "+919876543102",
    speciality: "STEEL",
  },
  { name: "Brick Works Ltd", contact: "+919876543103", speciality: "BRICKS" },
  {
    name: "Sand & Aggregates Co",
    contact: "+919876543104",
    speciality: "SAND",
  },
  {
    name: "Aggregate Suppliers",
    contact: "+919876543105",
    speciality: "AGGREGATES",
  },
  { name: "Tile Emporium", contact: "+919876543106", speciality: "TILES" },
  { name: "Asian Paints Depot", contact: "+919876543107", speciality: "PAINT" },
  {
    name: "Electric Solutions",
    contact: "+919876543108",
    speciality: "ELECTRICAL",
  },
  { name: "Plumbing Mart", contact: "+919876543109", speciality: "PLUMBING" },
  { name: "Hardware Center", contact: "+919876543110", speciality: "HARDWARE" },
];

// ========================================
// HELPER FUNCTIONS
// ========================================

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function formatTimestamp(date) {
  return date.toISOString();
}

function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10, 0, 0, 0);
  return date;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePONumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `PO-${timestamp}-${random}`;
}

function generateBillNumber(vendor) {
  const vendorCode = vendor.substring(0, 3).toUpperCase();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `BILL-${vendorCode}-${random}`;
}

// ========================================
// MAIN SEED FUNCTION
// ========================================
async function seedMaterialInventory() {
  const client = await pool.connect();

  try {
    console.log("🌱 Starting Material Inventory Seed Script\n");
    console.log("📋 Configuration:");
    console.log(`   Organization: ${CONFIG.organization_name}`);
    console.log(`   Project ID: ${CONFIG.project_id}`);
    console.log(`   Manager ID: ${CONFIG.manager_id}`);
    console.log(`   Engineer ID: ${CONFIG.engineer_id}`);
    console.log(`   Purchase Manager ID: ${CONFIG.purchase_manager_id}\n`);

    await client.query("BEGIN");

    // ========================================
    // 1. VERIFY PROJECT
    // ========================================
    console.log("1️⃣  Verifying project...");
    const projectCheck = await client.query(
      "SELECT id, name FROM projects WHERE id = $1",
      [CONFIG.project_id],
    );

    if (projectCheck.rows.length === 0) {
      throw new Error(`Project ${CONFIG.project_id} not found!`);
    }

    const projectName = projectCheck.rows[0].name;
    console.log(`   ✓ Project: ${projectName}\n`);

    // ========================================
    // 2. CREATE MATERIAL REQUESTS (Last 20 days)
    // ========================================
    console.log("2️⃣  Creating material requests...");
    const materialRequests = [];
    let requestsCreated = 0;

    // Create 15 material requests over last 20 days
    for (let i = 0; i < 15; i++) {
      const daysAgo = randomInt(1, 20);
      const requestDate = getDaysAgo(daysAgo);

      // Pick random category
      const categoryKeys = Object.keys(MATERIAL_CATEGORIES);
      const category = categoryKeys[randomInt(0, categoryKeys.length - 1)];
      const materials = MATERIAL_CATEGORIES[category];
      const material = materials[randomInt(0, materials.length - 1)];

      // Random quantity
      const quantity = randomInt(50, 500);

      // 80% approved, 15% pending, 5% rejected
      const rand = Math.random();
      let status, reviewedAt, reviewedBy, feedback;

      if (rand < 0.8) {
        status = "APPROVED";
        reviewedBy = CONFIG.manager_id;
        reviewedAt = new Date(requestDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
        feedback = "Approved for procurement";
      } else if (rand < 0.95) {
        status = "PENDING";
        reviewedBy = null;
        reviewedAt = null;
        feedback = null;
      } else {
        status = "REJECTED";
        reviewedBy = CONFIG.manager_id;
        reviewedAt = new Date(requestDate.getTime() + 1 * 60 * 60 * 1000);
        feedback = "Sufficient stock available";
      }

      const result = await client.query(
        `INSERT INTO material_requests (
          project_id, site_engineer_id, title, category, quantity,
          description, status, manager_feedback, reviewed_by, reviewed_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, status`,
        [
          CONFIG.project_id,
          CONFIG.engineer_id,
          `${material.name} - ${quantity} ${material.unit}`,
          category,
          quantity,
          `Request for ${material.name} for construction work`,
          status,
          feedback,
          reviewedBy,
          reviewedAt,
          requestDate,
        ],
      );

      materialRequests.push({
        id: result.rows[0].id,
        category,
        material,
        quantity,
        status: result.rows[0].status,
        createdAt: requestDate,
      });
      requestsCreated++;
    }

    console.log(`   ✓ Material requests created: ${requestsCreated}`);
    console.log(
      `     - Approved: ${materialRequests.filter((r) => r.status === "APPROVED").length}`,
    );
    console.log(
      `     - Pending: ${materialRequests.filter((r) => r.status === "PENDING").length}`,
    );
    console.log(
      `     - Rejected: ${materialRequests.filter((r) => r.status === "REJECTED").length}\n`,
    );

    // ========================================
    // 3. CREATE PURCHASE ORDERS (for approved requests)
    // ========================================
    console.log("3️⃣  Creating purchase orders...");
    const purchaseOrders = [];
    let posCreated = 0;

    const approvedRequests = materialRequests.filter(
      (r) => r.status === "APPROVED",
    );

    for (const request of approvedRequests) {
      // Get vendor for this category
      const vendor = VENDORS.find((v) => v.speciality === request.category);
      if (!vendor) continue;

      const poNumber = generatePONumber();
      const items = [
        {
          material_name: request.material.name,
          category: request.category,
          quantity: request.quantity,
          unit: request.material.unit,
          unit_price: request.material.unit_price,
          total_price: request.quantity * request.material.unit_price,
        },
      ];

      const totalAmount = items.reduce(
        (sum, item) => sum + item.total_price,
        0,
      );

      // 90% SENT, 10% DRAFT
      const status = Math.random() < 0.9 ? "SENT" : "DRAFT";
      const sentAt =
        status === "SENT"
          ? new Date(request.createdAt.getTime() + 4 * 60 * 60 * 1000) // 4 hours after request
          : null;

      const result = await client.query(
        `INSERT INTO purchase_orders (
          material_request_id, project_id, po_number, vendor_name, vendor_contact,
          items, total_amount, status, created_by, created_by_role, created_at, sent_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PURCHASE_MANAGER', $10, $11)
        RETURNING id, status`,
        [
          request.id,
          CONFIG.project_id,
          poNumber,
          vendor.name,
          vendor.contact,
          JSON.stringify(items),
          totalAmount,
          status,
          CONFIG.purchase_manager_id,
          request.createdAt,
          sentAt,
        ],
      );

      purchaseOrders.push({
        id: result.rows[0].id,
        poNumber,
        requestId: request.id,
        vendor,
        items,
        totalAmount,
        status: result.rows[0].status,
        sentAt,
      });
      posCreated++;
    }

    console.log(`   ✓ Purchase orders created: ${posCreated}`);
    console.log(
      `     - Sent: ${purchaseOrders.filter((po) => po.status === "SENT").length}`,
    );
    console.log(
      `     - Draft: ${purchaseOrders.filter((po) => po.status === "DRAFT").length}\n`,
    );

    // ========================================
    // 4. CREATE GRNs (for sent POs)
    // ========================================
    console.log("4️⃣  Creating Goods Receipt Notes...");
    let grnsCreated = 0;

    const sentPOs = purchaseOrders.filter((po) => po.status === "SENT");

    for (const po of sentPOs) {
      // 85% of sent POs have GRNs
      if (Math.random() > 0.85) continue;

      const receivedAt = po.sentAt
        ? new Date(po.sentAt.getTime() + randomInt(2, 5) * 24 * 60 * 60 * 1000) // 2-5 days later
        : new Date();

      // Received items (might be partial or full)
      const receivedItems = po.items.map((item) => ({
        ...item,
        received_quantity:
          Math.random() < 0.9
            ? item.quantity // Full delivery
            : Math.floor(item.quantity * (0.7 + Math.random() * 0.2)), // Partial: 70-90%
      }));

      // 70% APPROVED, 30% PENDING
      const status = Math.random() < 0.7 ? "APPROVED" : "PENDING";
      const reviewedBy = status === "APPROVED" ? CONFIG.manager_id : null;
      const reviewedAt =
        status === "APPROVED"
          ? new Date(receivedAt.getTime() + 3 * 60 * 60 * 1000) // 3 hours later
          : null;

      const grnResult = await client.query(
        `INSERT INTO goods_receipt_notes (
          project_id, purchase_order_id, material_request_id, received_items,
          received_at, received_by, status, reviewed_by, reviewed_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          CONFIG.project_id,
          po.id,
          po.requestId,
          JSON.stringify(receivedItems),
          receivedAt,
          CONFIG.engineer_id,
          status,
          reviewedBy,
          reviewedAt,
          receivedAt,
        ],
      );

      const grnId = grnResult.rows[0].id;
      grnsCreated++;

      // ========================================
      // 5. CREATE MATERIAL BILLS (for GRNs)
      // ========================================
      if (status === "APPROVED") {
        const billAmount = receivedItems.reduce(
          (sum, item) => sum + item.received_quantity * item.unit_price,
          0,
        );
        const gstPercentage = 18; // 18% GST
        const gstAmount = (billAmount * gstPercentage) / 100;
        const totalAmount = billAmount + gstAmount;

        await client.query(
          `INSERT INTO material_bills (
            material_request_id, project_id, vendor_name, vendor_contact,
            bill_number, bill_amount, gst_percentage, gst_amount, total_amount,
            category, status, uploaded_by, reviewed_by, reviewed_at, grn_id, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'APPROVED', $11, $12, $13, $14, $15)`,
          [
            po.requestId,
            CONFIG.project_id,
            po.vendor.name,
            po.vendor.contact,
            generateBillNumber(po.vendor.name),
            billAmount,
            gstPercentage,
            gstAmount,
            totalAmount,
            po.items[0].category,
            CONFIG.engineer_id,
            CONFIG.manager_id,
            reviewedAt,
            grnId,
            receivedAt,
          ],
        );

        // ========================================
        // 6. UPDATE PROJECT MATERIAL STOCK
        // ========================================
        for (const item of receivedItems) {
          // Check if material exists in stock
          const stockCheck = await client.query(
            `SELECT id, available_quantity FROM project_material_stock
             WHERE project_id = $1 AND material_name = $2 AND unit = $3`,
            [CONFIG.project_id, item.material_name, item.unit],
          );

          if (stockCheck.rows.length > 0) {
            // Update existing stock
            await client.query(
              `UPDATE project_material_stock
               SET available_quantity = available_quantity + $1,
                   last_updated_at = $2
               WHERE id = $3`,
              [item.received_quantity, receivedAt, stockCheck.rows[0].id],
            );
          } else {
            // Create new stock entry
            await client.query(
              `INSERT INTO project_material_stock (
                project_id, material_name, category, unit, available_quantity, last_updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                CONFIG.project_id,
                item.material_name,
                item.category,
                item.unit,
                item.received_quantity,
                receivedAt,
              ],
            );
          }

          // ========================================
          // 7. CREATE MATERIAL LEDGER ENTRY (IN)
          // ========================================
          await client.query(
            `INSERT INTO material_ledger (
              project_id, material_request_id, material_name, category,
              quantity, unit, movement_type, source, remarks,
              recorded_by, recorded_by_role, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'IN', 'BILL', $7, $8, 'MANAGER', $9)`,
            [
              CONFIG.project_id,
              po.requestId,
              item.material_name,
              item.category,
              item.received_quantity,
              item.unit,
              `Received via GRN - ${po.poNumber}`,
              CONFIG.manager_id,
              receivedAt,
            ],
          );
        }
      }
    }

    console.log(`   ✓ GRNs created: ${grnsCreated}\n`);

    // ========================================
    // 8. CREATE CONSUMPTION RECORDS (Simulated usage)
    // ========================================
    console.log("5️⃣  Creating material consumption records...");
    let consumptionRecords = 0;

    // Get all stock items
    const stockItems = await client.query(
      `SELECT id, material_name, category, unit, available_quantity
       FROM project_material_stock
       WHERE project_id = $1 AND available_quantity > 0`,
      [CONFIG.project_id],
    );

    // Create consumption for 60% of stock items
    for (const stock of stockItems.rows) {
      if (Math.random() > 0.6) continue;

      const consumptionDays = randomInt(3, 15); // Consumed over last 3-15 days

      for (let i = 0; i < randomInt(2, 5); i++) {
        const consumptionDate = getDaysAgo(randomInt(1, consumptionDays));
        const quantityUsed = Math.floor(
          stock.available_quantity * (0.05 + Math.random() * 0.15),
        ); // 5-20% each time

        if (quantityUsed === 0) continue;

        // Create consumption record
        await client.query(
          `INSERT INTO material_consumption_records (
            project_id, material_name, unit, quantity_used,
            recorded_at, recorded_by, recorded_by_role
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'SITE_ENGINEER')`,
          [
            CONFIG.project_id,
            stock.material_name,
            stock.unit,
            quantityUsed,
            consumptionDate,
            CONFIG.engineer_id,
          ],
        );

        // Update stock
        await client.query(
          `UPDATE project_material_stock
           SET available_quantity = available_quantity - $1,
               last_updated_at = $2
           WHERE id = $3`,
          [quantityUsed, consumptionDate, stock.id],
        );

        // Create ledger entry (OUT)
        await client.query(
          `INSERT INTO material_ledger (
            project_id, material_name, category, quantity, unit,
            movement_type, source, remarks, recorded_by, recorded_by_role, created_at
          )
          VALUES ($1, $2, $3, $4, $5, 'OUT', 'MANUAL', $6, $7, 'SITE_ENGINEER', $8)`,
          [
            CONFIG.project_id,
            stock.material_name,
            stock.category,
            quantityUsed,
            stock.unit,
            `Material used in construction`,
            CONFIG.engineer_id,
            consumptionDate,
          ],
        );

        consumptionRecords++;
      }
    }

    console.log(`   ✓ Consumption records created: ${consumptionRecords}\n`);

    // ========================================
    // COMMIT TRANSACTION
    // ========================================
    await client.query("COMMIT");

    // ========================================
    // FINAL STATISTICS
    // ========================================
    console.log("✅ SEED COMPLETED SUCCESSFULLY!\n");
    console.log("📊 Summary:");
    console.log(`   • Material Requests: ${requestsCreated}`);
    console.log(`   • Purchase Orders: ${posCreated}`);
    console.log(`   • GRNs Created: ${grnsCreated}`);
    console.log(`   • Consumption Records: ${consumptionRecords}\n`);

    // Get stock summary
    const stockSummary = await client.query(
      `SELECT 
         COUNT(*) as total_materials,
         SUM(available_quantity) as total_quantity
       FROM project_material_stock
       WHERE project_id = $1`,
      [CONFIG.project_id],
    );

    if (stockSummary.rows.length > 0) {
      console.log("📦 Material Stock:");
      console.log(
        `   • Total materials in stock: ${stockSummary.rows[0].total_materials}`,
      );
      console.log(
        `   • Total quantity units: ${stockSummary.rows[0].total_quantity}\n`,
      );
    }

    // Get bills summary
    const billsSummary = await client.query(
      `SELECT 
         COUNT(*) as total_bills,
         SUM(total_amount) as total_invested
       FROM material_bills
       WHERE project_id = $1 AND status = 'APPROVED'`,
      [CONFIG.project_id],
    );

    if (billsSummary.rows.length > 0) {
      console.log("💰 Financial Summary:");
      console.log(
        `   • Total approved bills: ${billsSummary.rows[0].total_bills}`,
      );
      console.log(
        `   • Total invested: ₹${parseFloat(billsSummary.rows[0].total_invested || 0).toFixed(2)}\n`,
      );
    }

    console.log("🎉 You can now test material/inventory features!");
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
seedMaterialInventory()
  .then(() => {
    console.log("\n✨ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error.message);
    process.exit(1);
  });
