const express = require("express");
const router = express.Router();
const auditService = require("../../services/audit.service");
const engineerCheck = require("../../middleware/engineerCheck");

/**
 * GET /engineer/audits
 * Get audit logs for projects assigned to this engineer
 */
router.get("/", engineerCheck, async (req, res) => {
    try {
        const engineerId = req.user.id;

        const filters = {
            project_id: req.query.project_id || null,
            category: req.query.category || null,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
        };

        const result = await auditService.getEngineerAudits(engineerId, filters);
        res.json(result);
    } catch (error) {
        console.error("[Engineer Audits] Error:", error.message);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
