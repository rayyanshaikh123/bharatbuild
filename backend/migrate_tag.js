require("dotenv").config();
const pool = require("./db");

async function migrate() {
    try {
        console.log("🚀 Starting migration: Adding 'tag' column to 'labour_addresses'...");

        // Check if column exists
        const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='labour_addresses' AND column_name='tag';
    `;
        const res = await pool.query(checkQuery);

        if (res.rows.length === 0) {
            console.log("➕ Column 'tag' does not exist. Adding it...");
            await pool.query("ALTER TABLE labour_addresses ADD COLUMN tag VARCHAR(50) DEFAULT 'Other';");
            console.log("✅ Column 'tag' added successfully.");
        } else {
            console.log("ℹ️ Column 'tag' already exists. Skipping.");
        }

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await pool.end();
        process.exit();
    }
}

migrate();
