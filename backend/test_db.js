require('dotenv').config();
const pool = require('./db');

async function testConnection() {
    console.log('Testing connection...');
    try {
        const res = await pool.query('SELECT 1+1 AS result');
        console.log('Result:', res.rows[0].result);
        process.exit(0);
    } catch (err) {
        console.error('Connection error:', err);
        process.exit(1);
    }
}

testConnection();
