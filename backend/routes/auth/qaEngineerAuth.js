const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const pool = require("../../db");

// Initialize passport strategies for auth
require("./passport");

const router = express.Router();

/* ---------------- REGISTER ---------------- */
router.post("/register", async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    if (!name || !email || !phone || !password)
      return res.status(400).json({ error: "missing_fields" });

    // Check if email already exists
    const existingUser = await pool.query(
      "SELECT id FROM qa_engineers WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "email_already_exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO qa_engineers (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, role",
      [name, email, phone, hash],
    );

    const user = newUser.rows[0];

    req.login(user, (err) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Login failed after registration" });
      }
      res
        .status(201)
        .json({ message: "QA Engineer registered successfully", user });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- LOGIN ---------------- */
router.post(
  "/login",
  passport.authenticate("qa-engineer-local"),
  (req, res) => {
    console.log("QA Engineer logged in:", req.user);
    res.json({ message: "Login successful", user: req.user });
  },
);

/* ---------------- FORGOT PASSWORD ---------------- */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if user exists
    const userResult = await pool.query(
      "SELECT id, email FROM qa_engineers WHERE email = $1",
      [email],
    );

    // Always return same response to prevent email enumeration
    const response = {
      message: "If the email exists, a reset link has been sent.",
    };

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      // Generate cryptographically secure random token
      const crypto = require("crypto");
      const rawToken = crypto.randomBytes(32).toString("hex");

      // Hash token before storing
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      // Insert token into database with 15 minute expiry
      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, user_role, token_hash, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')`,
        [user.id, "QA_ENGINEER", tokenHash],
      );

      // Construct reset link
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&role=qa-engineer`;

      // Send email
      const { sendPasswordResetEmail } = require("../../util/mailer");
      await sendPasswordResetEmail({
        to: user.email,
        resetLink,
      });
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- RESET PASSWORD ---------------- */
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "Token and new password are required" });
    }

    // Validate password length
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    // Hash the incoming token
    const crypto = require("crypto");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find valid token
    const tokenResult = await pool.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = $1 
         AND user_role = $2
         AND used = false
         AND expires_at > NOW()`,
      [tokenHash, "QA_ENGINEER"],
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const userId = tokenResult.rows[0].user_id;

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      "UPDATE qa_engineers SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [passwordHash, userId],
    );

    // Mark token as used
    await pool.query(
      "UPDATE password_reset_tokens SET used = true WHERE token_hash = $1",
      [tokenHash],
    );

    res.json({
      message:
        "Password reset successful. Please login with your new password.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET ME ---------------- */
router.get("/me", (req, res) => {
  if (req.isAuthenticated() && req.user && req.user.role === "QA_ENGINEER") {
    return res.json({ user: req.user });
  }
  return res.status(401).json({ error: "unauthorized" });
});

/* ---------------- LOGOUT ---------------- */
router.post("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({ error: "Failed to destroy session" });
      }
      if (typeof req.logout === "function") {
        try {
          req.logout(() => {
            res.clearCookie("connect.sid");
            return res.json({ message: "Logged out successfully" });
          });
        } catch (logoutErr) {
          console.warn("Logout error:", logoutErr);
          res.clearCookie("connect.sid");
          return res.json({ message: "Logged out (with warnings)" });
        }
      } else {
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully" });
      }
    });
  } else {
    if (typeof req.logout === "function") {
      try {
        req.logout(() => {});
      } catch (_) {}
    }
    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out successfully" });
  }
});

module.exports = router;
