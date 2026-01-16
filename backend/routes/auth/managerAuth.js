const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const pool = require("../../db");

// Initialize passport strategies for auth (kept inside auth folder by design)
require("./passport");

const router = express.Router();

/* ---------------- REGISTER ---------------- */
router.post("/register", async (req, res) => {
	const { name, email, phone, password } = req.body;

	try {
		if (!name || !email || !phone || !password)
			return res.status(400).json({ error: "missing_fields" });

		const hash = await bcrypt.hash(password, 10);

		await pool.query(
			"INSERT INTO managers (name, email, phone, password_hash) VALUES ($1, $2, $3, $4)",
			[name, email, phone, hash]
		);

		res.status(201).json({ message: "Manager registered successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
});

/* ---------------- LOGIN ---------------- */
router.post("/login", passport.authenticate("manager-local"), (req, res) => {
	res.json({ message: "Login successful", user: req.user });
});

/* ---------------- LOGOUT ---------------- */
router.post("/logout", (req, res) => {
	req.logout(() => {
		req.session.destroy(() => {
			res.clearCookie("connect.sid");
			res.json({ message: "Logged out successfully" });
		});
	});
});

module.exports = router;

