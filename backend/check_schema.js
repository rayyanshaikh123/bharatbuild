require("dotenv").config();
const pool = require("./db");

async function check() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'labour_addresses';
    `);
        console.log("Columns in labour_addresses:");
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
