require("dotenv").config();
const { Pool } = require("pg");

async function diagnose() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log("Connecting to:", process.env.DATABASE_URL);
        const client = await pool.connect();
        console.log("✅ Connected.");

        // Check tables
        const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log("Public tables:", tables.rows.map(r => r.table_name).join(", "));

        // Check columns of labour_addresses
        const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='labour_addresses'");
        console.log("Columns in labour_addresses:", cols.rows.map(r => r.column_name).join(", "));

        if (!cols.rows.find(r => r.column_name === 'tag')) {
            console.log("❌ 'tag' column missing. Running ALTER TABLE...");
            await client.query("ALTER TABLE labour_addresses ADD COLUMN tag VARCHAR(50) DEFAULT 'Other'");
            console.log("✅ Column added.");
        } else {
            console.log("✅ 'tag' column already exists.");
        }

        client.release();
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await pool.end();
    }
}

diagnose();
