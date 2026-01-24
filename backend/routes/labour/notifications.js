const express = require("express");
const router = express.Router();
const notificationService = require("../../services/notification.service");
const labourCheck = require("../../middleware/labourCheck");

/**
 * GET /labour/notifications
 * Special filtering for Labour: Only OTP and GEOFENCE alerts.
 */
router.get("/", labourCheck, async (req, res) => {
    try {
        const result = await notificationService.getUserNotifications(
            req.user.id,
            'LABOUR',
            {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 20,
                unreadOnly: req.query.unreadOnly === 'true',
                types: ['OTP', 'GEOFENCE'] // As per user requirement
            }
        );
        res.json(result);
    } catch (error) {
        console.error("[Labour Notifications] Error:", error.message);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * POST /labour/notifications/:id/read
 */
router.post("/:id/read", labourCheck, async (req, res) => {
    try {
        await notificationService.markAsRead(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * POST /labour/notifications/read-all
 */
router.post("/read-all", labourCheck, async (req, res) => {
    try {
        await notificationService.markAllAsRead(req.user.id, 'LABOUR');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
