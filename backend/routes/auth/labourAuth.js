const router = require("express").Router();
const passport = require("passport");

const bcrypt = require("bcrypt");
const pool = require("../../db");
const { generateOtp, sendOtpSms } = require("../../util/otp");

// Initialize passport strategies for auth (kept inside auth folder by design)
require("./labourPassport");
router.post("/register", async (req, res) => {
  const { name, phone } = req.body;

  try {
    if (!name || !phone)
      return res.status(400).json({ error: "missing_fields" });

    await pool.query("INSERT INTO labours (name, phone) VALUES ($1, $2)", [
      name,
      phone,
    ]);

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
      [phone]
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
      [phone, otpHash]
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
  // Attempt to destroy the session first, then logout and clear cookie.
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Failed to destroy session' });
      }

      if (typeof req.logout === 'function') {
        try {
          req.logout(() => {
            res.clearCookie('connect.sid');
            return res.json({ message: 'Logged out successfully' });
          });
        } catch (logoutErr) {
          console.warn('Logout error:', logoutErr);
          res.clearCookie('connect.sid');
          return res.json({ message: 'Logged out (with warnings)' });
        }
      } else {
        res.clearCookie('connect.sid');
        return res.json({ message: 'Logged out successfully' });
      }
    });
  } else {
    if (typeof req.logout === 'function') {
      try { req.logout(() => {}); } catch (_) {}
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out successfully' });
  }
});

module.exports = router;
