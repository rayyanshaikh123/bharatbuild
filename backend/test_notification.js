require("dotenv").config();
const { createNotification } = require("./services/notification.service");
const pool = require("./db");

(async () => {
    try {
        // Find a site engineer
        const engResult = await pool.query("SELECT id, email, email_notifications_enabled FROM site_engineers LIMIT 1");
        if (engResult.rows.length === 0) {
            console.log("No site engineers found.");
            process.exit(0);
        }

        const engineer = engResult.rows[0];
        console.log(`Creating test notification for: ${engineer.email}`);
        console.log(`Email enabled: ${engineer.email_notifications_enabled}`);

        await createNotification({
            userId: engineer.id,
            userRole: 'SITE_ENGINEER',
            title: "Test System Notification",
            message: "This is a test notification to verify the BharatBuild notification system is working.",
            type: 'INFO'
        });

        console.log("Notification created successfully.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
