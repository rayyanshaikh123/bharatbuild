require("dotenv").config();
const { Pool } = require("pg");

async function test() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query("SELECT current_database(), current_schema()");
        console.log("Database:", res.rows[0].current_database);
        console.log("Schema:", res.rows[0].current_schema);

        const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'labour_addresses'");
        console.log("Columns:", columns.rows.map(r => r.column_name).join(", "));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

test();
