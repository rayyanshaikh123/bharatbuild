const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

/* ---------------- GET ORGANIZATION BLACKLIST ---------------- */
router.get("/", ownerCheck, async (req, res) => {
    try {
        const ownerId = req.user.id;

        // 1. Get organizations owned by this owner
        const orgsResult = await pool.query(
            `SELECT id FROM organizations WHERE owner_id = $1`,
            [ownerId]
        );

        if (orgsResult.rows.length === 0) {
            return res.json({ blacklist: [] });
        }

        const orgIds = orgsResult.rows.map(row => row.id);

        // 2. Get blacklisted labourers
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

/* ---------------- REMOVE FROM BLACKLIST ---------------- */
router.delete("/:id", ownerCheck, async (req, res) => {
    try {
        const ownerId = req.user.id;
        const blacklistId = req.params.id;

        // Verify owner owns the organization of this blacklist entry
        const entryCheck = await pool.query(
            `SELECT o.id 
       FROM organization_blacklist ob
       JOIN organizations o ON ob.org_id = o.id
       WHERE ob.id = $1 AND o.owner_id = $2`,
            [blacklistId, ownerId]
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
