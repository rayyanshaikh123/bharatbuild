const pool = require("./db");
const fs = require("fs");
const path = require("path");

(async () => {
  const client = await pool.connect();
  try {
    console.log("🔄 Running migration: 004_create_ledger_adjustments.sql");

    const sqlPath = path.join(__dirname, "migrations", "004_create_ledger_adjustments.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");

    console.log("✅ Migration successful: ledger_adjustments table created");

    // Verify
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'ledger_adjustments'
    `);

    if (result.rows.length > 0) {
      console.log("✅ Verified: ledger_adjustments table exists");
    } else {
      console.error("❌ Verification failed: Table not found");
    }

  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Migration error:", e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
