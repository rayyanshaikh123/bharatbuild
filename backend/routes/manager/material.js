const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

/* ---------------- LIST MATERIAL REQUESTS ---------------- */
router.get("/requests", managerCheck, async (req, res) => {
    try {
        const managerId = req.user.id;
        const { project_id, status } = req.query;

        let query = `SELECT mr.*, p.name as project_name, e.name as engineer_name
                     FROM material_requests mr
                     JOIN projects p ON mr.project_id = p.id
                     JOIN project_managers pm ON p.id = pm.project_id
                     JOIN site_engineers e ON mr.site_engineer_id = e.id
                     WHERE pm.manager_id = $1 AND pm.status = 'ACTIVE'`;

        let params = [managerId];

        if (project_id) {
            query += " AND mr.project_id = $2";
            params.push(project_id);
        }

        if (status) {
            query += ` AND mr.status = $${params.length + 1}`;
            params.push(status);
        } else {
            query += " AND mr.status = 'PENDING'";
        }

        query += " ORDER BY mr.created_at DESC";
        const result = await pool.query(query, params);
        res.json({ requests: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- REVIEW MATERIAL REQUEST ---------------- */
router.patch("/requests/:id", managerCheck, async (req, res) => {
    try {
        const managerId = req.user.id;
        const { id } = req.params;
        const { status, manager_feedback } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        // Verify manager has access to the project of this request
        const verifyRes = await pool.query(
            `SELECT mr.project_id FROM material_requests mr
             JOIN project_managers pm ON mr.project_id = pm.project_id
             WHERE mr.id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
            [id, managerId]
        );

        if (verifyRes.rows.length === 0) {
            return res.status(403).json({ error: "Access denied or request not found" });
        }

        const result = await pool.query(
            `UPDATE material_requests 
             SET status = $1, manager_feedback = $2, reviewed_by = $3, reviewed_at = NOW()
             WHERE id = $4 RETURNING *`,
            [status, manager_feedback, managerId, id]
        );

        res.json({ request: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- LIST MATERIAL BILLS ---------------- */
router.get("/bills", managerCheck, async (req, res) => {
    try {
        const managerId = req.user.id;
        const { project_id, status } = req.query;

        let query = `SELECT mb.*, p.name as project_name, e.name as engineer_name
                     FROM material_bills mb
                     JOIN projects p ON mb.project_id = p.id
                     JOIN project_managers pm ON p.id = pm.project_id
                     JOIN site_engineers e ON mb.uploaded_by = e.id
                     WHERE pm.manager_id = $1 AND pm.status = 'ACTIVE'`;

        let params = [managerId];

        if (project_id) {
            query += " AND mb.project_id = $2";
            params.push(project_id);
        }

        if (status) {
            query += ` AND mb.status = $${params.length + 1}`;
            params.push(status);
        } else {
            query += " AND mb.status = 'PENDING'";
        }

        query += " ORDER BY mb.created_at DESC";
        const result = await pool.query(query, params);
        res.json({ bills: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- REVIEW MATERIAL BILL ---------------- */
router.patch("/bills/:id", managerCheck, async (req, res) => {
    try {
        const managerId = req.user.id;
        const { id } = req.params;
        const { status, manager_feedback } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        // Verify manager has access to the project of this bill
        const verifyRes = await pool.query(
            `SELECT mb.project_id FROM material_bills mb
             JOIN project_managers pm ON mb.project_id = pm.project_id
             WHERE mb.id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
            [id, managerId]
        );

        if (verifyRes.rows.length === 0) {
            return res.status(403).json({ error: "Access denied or bill not found" });
        }

        const result = await pool.query(
            `UPDATE material_bills 
             SET status = $1, manager_feedback = $2, reviewed_by = $3, reviewed_at = NOW()
             WHERE id = $4 RETURNING *`,
            [status, manager_feedback, managerId, id]
        );

        res.json({ bill: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
