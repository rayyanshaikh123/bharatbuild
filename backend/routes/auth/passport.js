const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const pool = require("../../db");

// Load other role strategies (they register themselves on passport)
require("./managerPassport");
require("./engineerPassport");
require("./labourPassport");
require("./purchaseManagerPassport");

// Configure owner-local strategy
passport.use(
  "owner-local",
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const result = await pool.query(
          "SELECT id, name, email, phone, password_hash, role FROM owners WHERE email = $1",
          [email]
        );
        if (result.rows.length === 0)
          return done(null, false, { message: "User not found" });
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return done(null, false, { message: "Invalid password" });

        // remove password_hash before returning
        delete user.password_hash;
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Session handling (supports OWNER, MANAGER, SITE_ENGINEER)
passport.serializeUser((user, done) => {
  // store role with id so we can fetch from correct table
  done(null, { id: user.id, role: user.role });
});

passport.deserializeUser(async (key, done) => {
  try {
    if (!key || !key.id) return done(null, false);

    const role = key.role;
    let table;
    let columns;
    if (role === "OWNER") {
      table = "owners";
      columns = "id, name, email, phone, role";
    } else if (role === "MANAGER") {
      table = "managers";
      columns = "id, name, email, phone, role";
    } else if (role === "SITE_ENGINEER") {
      table = "site_engineers";
      columns = "id, name, email, phone, role";
    } else if (role === "LABOUR") {
      table = "labours";
      columns = "id, name, phone, role";
    } else if (role === "PURCHASE_MANAGER") {
      table = "purchase_managers";
      columns = "id, name, email, phone, role";
    } else return done(null, false);

    const result = await pool.query(
      `SELECT ${columns} FROM ${table} WHERE id = $1`,
      [key.id]
    );
    if (result.rows.length === 0) return done(null, false);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
