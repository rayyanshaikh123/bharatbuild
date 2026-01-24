require("dotenv").config();
const pool = require("./db");

async function checkSchema() {
    try {
        const tables = ['labour_requests', 'wage_rates', 'labours'];
        for (const table of tables) {
            const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [table]);
            console.log(`--- Table: ${table} ---`);
            console.table(res.rows);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
