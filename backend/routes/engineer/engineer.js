const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
router.get("/profile", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const result = await pool.query(
      "SELECT id, name, email, phone, role, push_notifications_enabled, email_notifications_enabled FROM site_engineers WHERE id = $1",
      [engineerId],
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

router.patch("/profile", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { name, email, phone, push_notifications_enabled, email_notifications_enabled } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (push_notifications_enabled !== undefined) {
      updates.push(`push_notifications_enabled = $${paramCount++}`);
      values.push(push_notifications_enabled);
    }
    if (email_notifications_enabled !== undefined) {
      updates.push(`email_notifications_enabled = $${paramCount++}`);
      values.push(email_notifications_enabled);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(engineerId);
    const query = `UPDATE site_engineers SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING id, name, email, phone, role, push_notifications_enabled, email_notifications_enabled`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Engineer not found" });
    }

    // Update session user data
    req.user = result.rows[0];

    res.json({ engineer: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      // Unique constraint violation
      return res.status(400).json({ error: "email_already_exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
