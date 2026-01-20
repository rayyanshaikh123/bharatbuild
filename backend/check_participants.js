require('dotenv').config();
const pool = require('./db');

async function checkParticipantsTable() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'labour_request_participants'");
        console.log("Columns:", res.rows.map(r => r.column_name).join(', '));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkParticipantsTable();
