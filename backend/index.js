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

/* ---------------- OWNER ROUTES ---------------- */
app.use("/owner", require("./routes/owner/owner"));
app.use("/owner/dashboard", require("./routes/owner/dashboard"));
app.use("/owner/organization", require("./routes/owner/organization"));
app.use("/owner/requests", require("./routes/owner/organizationReq"));
app.use("/owner/project", require("./routes/owner/project"));
app.use(
  "/owner/organization-engineers",
  require("./routes/owner/organizationEngineers"),
);
app.use(
  "/owner/organization-managers",
  require("./routes/owner/organizationManagers"),
);
app.use("/owner/plan", require("./routes/owner/plan"));
app.use("/owner/labour-request", require("./routes/owner/labourRequest"));
app.use("/owner/dpr", require("./routes/owner/dpr"));
app.use("/owner/material", require("./routes/owner/material"));
app.use("/owner/wages", require("./routes/owner/wages"));
app.use("/owner/analytics", require("./routes/owner/analytics"));
app.use("/owner/audits", require("./routes/owner/audit"));

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
app.use("/manager/plan", require("./routes/manager/plan"));
app.use("/manager/labour-request", require("./routes/manager/labourRequest"));
app.use("/manager/dpr", require("./routes/manager/dpr"));
app.use("/manager/material", require("./routes/manager/material"));
app.use("/manager/wages", require("./routes/manager/wages"));
app.use("/manager/wage-rates", require("./routes/manager/wage-rates"));
app.use("/manager/analytics", require("./routes/manager/analytics"));
app.use("/manager/audits", require("./routes/manager/audit"));

/* ---------------- ENGINEER ROUTES ---------------- */
app.use("/engineer", require("./routes/engineer/engineer"));
app.use("/engineer/dashboard", require("./routes/engineer/dashboard"));
app.use("/engineer/organization", require("./routes/engineer/enOrganization"));
app.use("/engineer/project-requests", require("./routes/engineer/projectReq"));
app.use("/engineer/plan", require("./routes/engineer/plan"));
app.use(
  "/engineer/labour-requests",
  require("./routes/engineer/labourRequest"),
);
app.use("/engineer/dpr", require("./routes/engineer/dpr"));
app.use("/engineer/attendance", require("./routes/engineer/attendance"));
app.use("/engineer/material", require("./routes/engineer/material"));
app.use("/engineer/wages", require("./routes/engineer/wages"));

/* ---------------- LABOUR ROUTES ---------------- */
app.use("/labour", require("./routes/labour/labour"));
app.use("/labour/jobs", require("./routes/labour/jobs"));
app.use("/labour/attendance", require("./routes/labour/attendance"));

/* ---------------- PROJECT ROUTES (cross-role) ---------------- */
app.use("/project", require("./routes/project/ledger"));
app.use("/project", require("./routes/project/delays"));
app.use("/project", require("./routes/project/ai"));

/* ---------------- META (client config) ---------------- */

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
