// Run migration to add material_usage column to dprs table
const pool = require("./db");
const fs = require("fs");

(async () => {
  const client = await pool.connect();
  try {
    console.log("🔄 Running migration: add_material_usage_to_dprs.sql");

    const sql = fs.readFileSync(
      "./migrations/add_material_usage_to_dprs.sql",
      "utf8",
    );
    await client.query(sql);

    console.log(
      "✅ Migration successful: material_usage column added to dprs table",
    );

    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'dprs' AND column_name = 'material_usage'
    `);

    if (result.rows.length > 0) {
      console.log("✅ Verified: material_usage column exists");
      console.log("   Type:", result.rows[0].data_type);
      console.log("   Default:", result.rows[0].column_default);
    } else {
      console.log("⚠️  Warning: Could not verify column (might already exist)");
    }
  } catch (e) {
    console.error("❌ Migration error:", e.message);
    if (e.message.includes("already exists")) {
      console.log("ℹ️  Column already exists - migration already applied");
    }
  } finally {
    client.release();
    await pool.end();
  }
})();
