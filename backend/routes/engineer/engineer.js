const express = require("express");
const pool = require("../../db");
const router = express.Router();
const  engineerCheck  = require("../../middleware/engineerCheck");
router.get("/profile", engineerCheck, async (req, res) => { 
    try {
        const engineerId = req.user.id;
        const result = await pool.query(
            "SELECT id, name, email, phone, role FROM engineers WHERE id = $1",
            [engineerId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Engineer not found" });
        }
        res.json({ engineer: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
router.get("/check-auth", engineerCheck, (req, res) => { 
    res.json({ authenticated: true, engineer: req.user });
});
module.exports = router;