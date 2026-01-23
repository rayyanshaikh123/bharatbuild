const express = require("express");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const ocrService = require("../../services/ocr.service");
const { verifyEngineerAccess } = require("../../util/engineerPermissions");

// Apply engineer middleware
router.use(engineerCheck);

/**
 * POST /engineer/ai/ocr-bill
 * Extract data from bill image
 */
router.post("/ocr-bill", async (req, res) => {
    try {
        const { image, project_id } = req.body;

        if (!image) {
            return res.status(400).json({ error: "Image (base64) is required" });
        }

        if (!project_id) {
            return res.status(400).json({ error: "project_id is required" });
        }

        // Verify access
        const access = await verifyEngineerAccess(req.user.id, project_id);
        if (!access.allowed) {
            return res.status(403).json({ error: access.error });
        }

        const data = await ocrService.extractBillData(image);
        res.json({ data });
    } catch (error) {
        console.error("[Engineer AI OCR] Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
