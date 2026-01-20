require('dotenv').config();
const pool = require('./db');

async function checkTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("Tables:", res.rows.map(r => r.table_name));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkTables();
