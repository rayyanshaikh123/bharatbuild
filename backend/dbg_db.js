const pool = require("./db");
(async () => {
    try {
        const res = await pool.query("SELECT id, name FROM projects");
        console.log("Projects in DB:");
        console.table(res.rows);
        const eng = await pool.query("SELECT id, name, email FROM site_engineers");
        console.log("Engineers in DB:");
        console.table(eng.rows);
        const assignments = await pool.query("SELECT * FROM project_site_engineers");
        console.log("Assignments in DB:");
        console.table(assignments.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
