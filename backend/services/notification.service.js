const pool = require("../db");

/**
 * Get notifications for a user
 */
async function getUserNotifications(userId, userRole, filters = {}) {
    const { page = 1, limit = 20, unreadOnly = false, types = [] } = filters;
    const offset = (page - 1) * limit;

    let query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 AND user_role = $2
    `;
    const values = [userId, userRole];

    if (unreadOnly) {
        query += ` AND is_read = false`;
    }

    if (types && types.length > 0) {
        query += ` AND type = ANY($${values.length + 1})`;
        values.push(types);
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    let countQuery = `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND user_role = $2`;
    const countValues = [userId, userRole];
    if (unreadOnly) {
        countQuery += ` AND is_read = false`;
    }
    if (types && types.length > 0) {
        countQuery += ` AND type = ANY($3)`;
        countValues.push(types);
    }

    const countResult = await pool.query(countQuery, countValues);

    return {
        notifications: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
    };
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
    await pool.query(
        `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
        [notificationId, userId]
    );
}

/**
 * Mark all as read
 */
async function markAllAsRead(userId, userRole) {
    await pool.query(
        `UPDATE notifications SET is_read = true WHERE user_id = $1 AND user_role = $2`,
        [userId, userRole]
    );
}

/**
 * Create a notification
 */
async function createNotification({ userId, userRole, title, message, type = 'INFO', projectId = null, metadata = {} }) {
    // 1. Save to DB
    await pool.query(
        `INSERT INTO notifications (user_id, user_role, title, message, type, project_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, userRole, title, message, type, projectId, JSON.stringify(metadata)]
    );

    // 2. Handle Email Notification for Site Engineer
    if (userRole === 'SITE_ENGINEER') {
        try {
            const userResult = await pool.query(
                "SELECT email, email_notifications_enabled FROM site_engineers WHERE id = $1",
                [userId]
            );

            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                if (user.email_notifications_enabled) {
                    const { sendNotificationEmail } = require("../util/mailer");
                    await sendNotificationEmail({
                        to: user.email,
                        subject: `[Bharat Build] ${title}`,
                        message: `<p>${message}</p>`
                    });
                }
            }
        } catch (emailErr) {
            console.error("Failed to send email notification:", emailErr.message);
            // Don't throw, just log. We don't want to break the main flow if email fails.
        }
    }
}

module.exports = {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
};
