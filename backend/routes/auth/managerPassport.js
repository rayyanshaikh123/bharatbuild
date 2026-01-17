const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const pool = require("../../db");

// Configure manager-local strategy
passport.use(
  "manager-local",
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const result = await pool.query(
          "SELECT id, name, email, phone, password_hash, role FROM managers WHERE email = $1",
          [email]
        );

        if (result.rows.length === 0)
          return done(null, false, { message: "User not found" });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return done(null, false, { message: "Invalid password" });

        delete user.password_hash;
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;
