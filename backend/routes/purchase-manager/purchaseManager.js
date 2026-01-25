const express = require("express");
const router = express.Router();
const purchaseManagerCheck = require("../../middleware/purchaseManagerCheck");

/* ---------------- CHECK AUTH ---------------- */
const pool = require("../../db");

/* ---------------- CHECK AUTH ---------------- */
router.get("/check-auth", purchaseManagerCheck, (req, res) => {
  res.json({
    authenticated: true,
    user: req.user,
  });
});

/* ---------------- GET PROFILE ---------------- */
router.get("/profile", purchaseManagerCheck, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, role FROM purchase_managers WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ purchase_manager: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
