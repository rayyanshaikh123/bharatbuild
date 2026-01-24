const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

/* ---------------- GET ORGANIZATION BLACKLIST ---------------- */
router.get("/", managerCheck, async (req, res) => {
    try {
        const managerId = req.user.id;

        // 1. Get organizations where this manager is active
        const orgsResult = await pool.query(
            `SELECT DISTINCT org_id FROM organization_managers WHERE manager_id = $1 AND status = 'APPROVED'`,
            [managerId]
        );

        if (orgsResult.rows.length === 0) {
            return res.json({ blacklist: [] });
        }

        const orgIds = orgsResult.rows.map(row => row.org_id);

        // 2. Get blacklisted labourers for these organizations
        const result = await pool.query(
            `SELECT ob.*, l.name as labour_name, l.phone as labour_phone, l.skill_type, o.name as organization_name
       FROM organization_blacklist ob
       JOIN labours l ON ob.labour_id = l.id
       JOIN organizations o ON ob.org_id = o.id
       WHERE ob.org_id = ANY($1)
       ORDER BY ob.created_at DESC`,
            [orgIds]
        );

        res.json({ blacklist: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- ADD TO BLACKLIST ---------------- */
router.post("/", managerCheck, async (req, res) => {
    try {
        const managerId = req.user.id;
        const { labour_id, org_id, reason } = req.body;

        if (!labour_id || !org_id) {
            return res.status(400).json({ error: "labour_id and org_id are required" });
        }

        // Verify manager belongs to this organization
        const orgCheck = await pool.query(
            `SELECT 1 FROM organization_managers WHERE manager_id = $1 AND org_id = $2 AND status = 'APPROVED'`,
            [managerId, org_id]
        );

        if (orgCheck.rows.length === 0) {
            return res.status(403).json({ error: "Unauthorized. You are not a manager of this organization." });
        }

        const result = await pool.query(
            `INSERT INTO organization_blacklist (org_id, labour_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (org_id, labour_id) 
       DO UPDATE SET reason = $3, created_at = NOW()
       RETURNING *`,
            [org_id, labour_id, reason || 'Manually blacklisted']
        );

        res.status(201).json({ blacklist_entry: result.rows[0], message: "Labourer blacklisted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------- REMOVE FROM BLACKLIST ---------------- */
router.delete("/:id", managerCheck, async (req, res) => {
    try {
        const managerId = req.user.id;
        const blacklistId = req.params.id;

        // Verify manager belongs to the organization of this blacklist entry
        const entryCheck = await pool.query(
            `SELECT om.id 
       FROM organization_blacklist ob
       JOIN organization_managers om ON ob.org_id = om.org_id
       WHERE ob.id = $1 AND om.manager_id = $2 AND om.status = 'APPROVED'`,
            [blacklistId, managerId]
        );

        if (entryCheck.rows.length === 0) {
            return res.status(403).json({ error: "Unauthorized or entry not found" });
        }

        await pool.query("DELETE FROM organization_blacklist WHERE id = $1", [blacklistId]);

        res.json({ message: "Labourer removed from blacklist" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
