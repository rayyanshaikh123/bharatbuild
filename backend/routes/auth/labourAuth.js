const router = require("express").Router();
const passport = require("passport");

const bcrypt = require("bcrypt");
const pool = require("../../db");
const { generateOtp, sendOtpSms } = require("../../util/otp");

// Initialize passport strategies for auth (kept inside auth folder by design)
require("./labourPassport");
router.post("/register", async (req, res) => {
  const {
    name,
    phone,
    skill_type,
    categories,
    primary_latitude,
    primary_longitude,
    travel_radius_meters,
  } = req.body;

  try {
    if (!name || !phone)
      return res.status(400).json({ error: "missing_fields" });

    // Validate skill_type if provided
    if (
      skill_type &&
      !["SKILLED", "SEMI_SKILLED", "UNSKILLED"].includes(skill_type)
    ) {
      return res.status(400).json({ error: "invalid_skill_type" });
    }

    // Check for duplicate phone
    const existingLabour = await pool.query(
      "SELECT id FROM labours WHERE phone = $1",
      [phone],
    );
    if (existingLabour.rows.length > 0) {
      return res.status(409).json({ error: "Phone number already registered" });
    }

    await pool.query(
      `INSERT INTO labours (name, phone, skill_type, categories, primary_latitude, primary_longitude, travel_radius_meters) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        name,
        phone,
        skill_type || null,
        categories || [],
        primary_latitude || null,
        primary_longitude || null,
        travel_radius_meters || null,
      ],
    );

    res.status(201).json({ message: "Labour registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.post("/otp/request", async (req, res) => {
  try {
    const { phone } = req.body;

    const labourRes = await pool.query(
      "SELECT id FROM labours WHERE phone = $1",
      [phone],
    );

    if (!labourRes.rows.length) {
      return res.status(404).json({ message: "Labour not found" });
    }

    const otp = generateOtp();
    console.log(`Generated OTP for ${phone}: ${otp}`); // For testing purposes
    const otpHash = await bcrypt.hash(String(otp), 10);

    await pool.query(
      `
      INSERT INTO otp_logs (phone, otp_hash, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
      `,
      [phone, otpHash],
    );

    // await sendOtpSms(phone, otp);

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- OTP LOGIN ---------------- */
router.post("/otp/verify", passport.authenticate("otp"), (req, res) => {
  res.json({
    message: "OTP login successful",
    user: req.user,
  });
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
