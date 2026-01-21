require('dotenv').config();
const pool = require('./db');

async function migrate() {
    try {
        await pool.query(`
            ALTER TABLE labour_request_participants 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING'
        `);
        console.log("Migration successful: Added status to labour_request_participants");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}
migrate();
