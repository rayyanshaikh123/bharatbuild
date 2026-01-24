const express = require("express");
const router = express.Router();
const notificationService = require("../../services/notification.service");
const engineerCheck = require("../../middleware/engineerCheck");

/**
 * GET /engineer/notifications
 */
router.get("/", engineerCheck, async (req, res) => {
    try {
        const result = await notificationService.getUserNotifications(
            req.user.id,
            'SITE_ENGINEER',
            {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 20,
                unreadOnly: req.query.unreadOnly === 'true'
            }
        );
        res.json(result);
    } catch (error) {
        console.error("[Engineer Notifications] Error:", error.message);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * POST /engineer/notifications/:id/read
 */
router.post("/:id/read", engineerCheck, async (req, res) => {
    try {
        await notificationService.markAsRead(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * POST /engineer/notifications/read-all
 */
router.post("/read-all", engineerCheck, async (req, res) => {
    try {
        await notificationService.markAllAsRead(req.user.id, 'SITE_ENGINEER');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
