const express = require("express");
const pool = require("../../db");
const router = express.Router();
const { labourCheck } = require("../../middleware/labourCheck");
router.get("/profile", labourCheck, async (req, res) => { 
    try {
        const labourId = req.user.id;
        const result = await pool.query(
            "SELECT id, name, email, phone, role FROM labours WHERE id = $1",
            [labourId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Labour not found" });
        }
        res.json({ labour: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
router.get("/check-auth", labourCheck, (req, res) => { 
    res.json({ authenticated: true, labour: req.user });
});
module.exports = router;