const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");

// Check if engineer is ACTIVE in project
async function engineerProjectStatusCheck(engineerId, projectId) {
    const result = await pool.query(
        `SELECT COUNT(*) FROM project_site_engineers
     WHERE site_engineer_id = $1 
       AND project_id = $2 
       AND status = 'ACTIVE'`,
        [engineerId, projectId],
    );
    return parseInt(result.rows[0].count) > 0;
}

/* ---------------- CREATE MATERIAL REQUEST ---------------- */
router.post("/request", engineerCheck, async (req, res) => {
    try {
        const engineerId = req.user.id;
        const {
            project_id,
            dpr_id,
            title,
            category,
            quantity,
            description,
            request_image,
            request_image_mime
        } = req.body;

        const isActive = await engineerProjectStatusCheck(engineerId, project_id);
        if (!isActive) return res.status(403).json({ error: "Access denied." });

        const result = await pool.query(
            `INSERT INTO material_requests (project_id, site_engineer_id, dpr_id, title, category, quantity, description, request_image, request_image_mime)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [project_id, engineerId, dpr_id || null, title, category, quantity, description, request_image || null, request_image_mime || null]
        );

        res.status(201).json({ request: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- GET MY MATERIAL REQUESTS ---------------- */
router.get("/requests", engineerCheck, async (req, res) => {
    try {
        const engineerId = req.user.id;
        const { project_id } = req.query;

        let query = `SELECT mr.*, p.name as project_name 
                     FROM material_requests mr 
                     JOIN projects p ON mr.project_id = p.id 
                     WHERE mr.site_engineer_id = $1`;
        let params = [engineerId];

        if (project_id) {
            query += " AND mr.project_id = $2";
            params.push(project_id);
        }

        query += " ORDER BY mr.created_at DESC";
        const result = await pool.query(query, params);
        res.json({ requests: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- UPLOAD MATERIAL BILL ---------------- */
router.post("/upload-bill", engineerCheck, async (req, res) => {
    try {
        const engineerId = req.user.id;
        const {
            material_request_id,
            project_id,
            vendor_name,
            vendor_contact,
            bill_number,
            bill_amount,
            gst_percentage,
            gst_amount,
            total_amount,
            bill_image,
            bill_image_mime,
            category
        } = req.body;

        const isActive = await engineerProjectStatusCheck(engineerId, project_id);
        if (!isActive) return res.status(403).json({ error: "Access denied." });

        const result = await pool.query(
            `INSERT INTO material_bills (material_request_id, project_id, vendor_name, vendor_contact, bill_number, 
             bill_amount, gst_percentage, gst_amount, total_amount, bill_image, bill_image_mime, category, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [material_request_id || null, project_id, vendor_name, vendor_contact, bill_number, bill_amount,
                gst_percentage, gst_amount, total_amount, bill_image || null, bill_image_mime || null, category, engineerId]
        );

        res.status(201).json({ bill: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- GET MY MATERIAL BILLS ---------------- */
router.get("/bills", engineerCheck, async (req, res) => {
    try {
        const engineerId = req.user.id;
        const { project_id } = req.query;

        let query = `SELECT mb.*, p.name as project_name 
                     FROM material_bills mb 
                     JOIN projects p ON mb.project_id = p.id 
                     WHERE mb.uploaded_by = $1`;
        let params = [engineerId];

        if (project_id) {
            query += " AND mb.project_id = $2";
            params.push(project_id);
        }

        query += " ORDER BY mb.created_at DESC";
        const result = await pool.query(query, params);
        res.json({ bills: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
