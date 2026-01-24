require("dotenv").config();
const pool = require("./db");
(async () => {
    try {
        const result = await pool.query("SELECT id, title, is_read, created_at FROM notifications ORDER BY created_at DESC LIMIT 5");
        console.log("Notifications in DB:");
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
