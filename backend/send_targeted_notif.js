require("dotenv").config();
const { createNotification } = require("./services/notification.service");
const pool = require("./db");

(async () => {
    try {
        const userId = "4cfe936b-f454-4f0f-948c-70ebed4efcb6";
        const userResult = await pool.query("SELECT email, name FROM site_engineers WHERE id = $1", [userId]);

        if (userResult.rows.length === 0) {
            console.error("User not found!");
            process.exit(1);
        }

        console.log(`Sending notification to ${userResult.rows[0].email}...`);

        await createNotification({
            userId: userId,
            userRole: 'SITE_ENGINEER',
            title: "DPR Approved",
            message: "Your Daily Progress Report for yesterday has been reviewed and approved by the project manager.",
            type: 'SUCCESS'
        });

        console.log("Notification sent successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error sending notification:", err);
        process.exit(1);
    }
})();
