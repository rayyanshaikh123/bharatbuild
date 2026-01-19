require("dotenv").config(); // ✅ MUST be first
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const cors = require("cors");
const pool = require("./db");
const passport = require("passport");

// Initialize passport strategies (OWNER/MANAGER/SITE_ENGINEER)
require("./routes/auth/passport");

const app = express();
const port = process.env.PORT || 3001;
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  }),
);

/* ---------------- MIDDLEWARE ---------------- */
app.use(express.json());

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET || "dev_secret_change_in_production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      secure: false, // 1 day
      sameSite: "lax",
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

/* ---------------- AUTH ROUTES ---------------- */
app.use("/auth/owner", require("./routes/auth/ownerAuth"));
app.use("/auth/manager", require("./routes/auth/managerAuth"));
app.use("/auth/engineer", require("./routes/auth/engineerAuth"));
app.use("/auth/labour", require("./routes/auth/labourAuth"));
app.use("/auth/labour", require("./routes/auth/labourAuth"));

/* ---------------- OWNER ROUTES ---------------- */
app.use("/owner", require("./routes/owner/owner"));
app.use("/owner/dashboard", require("./routes/owner/dashboard"));
app.use("/owner/organization", require("./routes/owner/organization"));
app.use("/owner/requests", require("./routes/owner/organizationReq"));
app.use("/owner/project", require("./routes/owner/project"));

/* ---------------- MANAGER ROUTES ---------------- */
app.use("/manager", require("./routes/manager/manager"));
app.use("/manager/dashboard", require("./routes/manager/dashboard"));
app.use("/manager/organization", require("./routes/manager/manOrganization"));
app.use(
  "/manager/organization-requests",
  require("./routes/manager/enOrganiztionReq"),
);
app.use("/manager/project", require("./routes/manager/project"));
app.use("/manager/projects", require("./routes/manager/managerProject"));
app.use(
  "/manager/project-requests",
  require("./routes/manager/managerProjectReq"),
);
app.use(
  "/manager/project-engineer-requests",
  require("./routes/manager/projectEngineerReq"),
);

/* ---------------- ENGINEER ROUTES ---------------- */
app.use("/engineer", require("./routes/engineer/engineer"));
app.use("/engineer/dashboard", require("./routes/engineer/dashboard"));
app.use("/engineer/organization", require("./routes/engineer/enOrganization"));
app.use("/engineer/project-requests", require("./routes/engineer/projectReq"));

/* ---------------- LABOUR ROUTES ---------------- */
app.use("/labour", require("./routes/labour/labour"));
/* ---------------- HEALTH ---------------- */

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1+1 AS result");
    res.status(200).json({ status: "ok", message: "Healthy" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

/* ---------------- ROOT ---------------- */
app.get("/", (req, res) => {
  res.send("Hello World!");
});

/* ---------------- START SERVER ---------------- */
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
