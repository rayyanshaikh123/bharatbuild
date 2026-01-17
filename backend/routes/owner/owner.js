const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

/* ---------------- GET OWNER PROFILE ---------------- */
router.get("/profile", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const result = await pool.query(
      "SELECT id, name, email, phone, role FROM owners WHERE id = $1",
      [ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Owner not found" });
    }

    res.json({ owner: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/check-auth", ownerCheck, (req, res) => {
  res.json({ authenticated: true, owner: req.user });
});


module.exports = router;
