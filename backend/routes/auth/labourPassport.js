const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const pool = require("../../db");

passport.use(
  "otp",
  new LocalStrategy(
    {
      usernameField: "phone",
      passwordField: "otp",
    },
    async (phone, otp, done) => {
      try {
        const otpRes = await pool.query(
          `
          SELECT * FROM otp_logs
          WHERE phone = $1
            AND verified = false
            AND expires_at > NOW()
          ORDER BY created_at DESC
          LIMIT 1
          `,
          [phone]
        );

        if (!otpRes.rows.length) {
          return done(null, false, { message: "Invalid OTP" });
        }

        const otpRow = otpRes.rows[0];
        const validOtp = await bcrypt.compare(otp, otpRow.otp_hash);

        if (!validOtp) {
          return done(null, false, { message: "Invalid OTP" });
        }

        await pool.query("UPDATE otp_logs SET verified = true WHERE id = $1", [
          otpRow.id,
        ]);

        const labourRes = await pool.query(
          "SELECT * FROM labours WHERE phone = $1",
          [phone]
        );

        return done(null, labourRes.rows[0]);
      } catch (err) {
        done(err);
      }
    }
  )
);

module.exports = passport;
