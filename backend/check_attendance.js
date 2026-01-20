require('dotenv').config();
const pool = require('./db');

async function checkAttendanceTable() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance'");
        if (res.rows.length > 0) {
            console.log("Columns:", res.rows.map(r => r.column_name).join(', '));
        } else {
            console.log("None");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkAttendanceTable();
