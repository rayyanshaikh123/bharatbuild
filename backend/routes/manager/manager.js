const express = require("express");
const pool = require("../../db");
const router = express.Router();
const  managerCheck  = require("../../middleware/managerCheck");
router.get("/profile", managerCheck, async (req, res) => { 
    try {
        const managerId = req.user.id;
        const result = await pool.query(
            "SELECT id, name, email, phone, role FROM managers WHERE id = $1",
            [managerId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Manager not found" });
        }
        res.json({ manager: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
router.get("/check-auth", managerCheck, (req, res) => { 
    res.json({ authenticated: true, manager: req.user });
});
module.exports = router;