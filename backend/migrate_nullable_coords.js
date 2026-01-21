require("dotenv").config();
const pool = require("./db");

async function migrate() {
    try {
        console.log("🚀 Making latitude and longitude nullable in labour_addresses...");

        await pool.query(`
      ALTER TABLE labour_addresses 
      ALTER COLUMN latitude DROP NOT NULL,
      ALTER COLUMN longitude DROP NOT NULL;
    `);

        console.log("✅ Columns altered successfully.");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await pool.end();
        process.exit();
    }
}

migrate();
