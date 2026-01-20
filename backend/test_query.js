require("dotenv").config();
const { Pool } = require("pg");

async function test() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query("SELECT * FROM labour_addresses LIMIT 0");
        console.log("Success! Columns:", res.fields.map(f => f.name).join(", "));
    } catch (err) {
        console.error("Error running query:", err.message);
    } finally {
        await pool.end();
    }
}

test();
