const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function runSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Reading SQL file...");
    const sqlPath = path.join(__dirname, "dbupdated.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Connecting to database...");
    const client = await pool.connect();

    console.log("Executing schema...");
    await client.query(sql);

    console.log("✅ Schema applied successfully!");
    client.release();
  } catch (error) {
    console.error("❌ Error running schema:", error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

runSchema();
