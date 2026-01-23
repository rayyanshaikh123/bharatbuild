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
// CORS Configuration for Live Server (testing harness) and Frontend
// Live Server runs on port 5500, Frontend on port 3000
// credentials: true is REQUIRED for session cookies to work cross-origin
// Note: Live Server can use either localhost or 127.0.0.1, so we allow both
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  }),
);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url} - Started`,
  );
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`,
    );
  });
  next();
});

/* ---------------- MIDDLEWARE ---------------- */
app.use(express.json());

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "session",
      createTableIfMissing: false, // Table already exists
    }),
    secret: process.env.SESSION_SECRET || "dev_secret_change_in_production",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      secure: false, // For development
      sameSite: "lax",
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Detailed logging and timeout prevention
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Set a server-side timeout to prevent indefinite hangs (fails safely before Flutter times out)
  res.setTimeout(25000, () => {
    if (!res.headersSent) {
      console.error(`[Timeout] Request ${req.method} ${req.url} timed out after 25s (RID: ${requestId})`);
      res.status(503).json({ error: "request_timeout", message: "Server took too long to respond." });
    }
  });

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Started (RID: ${requestId}, SID: ${req.sessionID || 'undefined'})`);

  if (req.user) {
    console.log(`[Auth Debug] User: ${req.user.id} (${req.user.role}) (RID: ${requestId})`);
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms) (RID: ${requestId})`);
  });
  next();
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

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
app.use("/owner/reports", require("./routes/owner/reports"));
app.use("/owner/blacklist", require("./routes/owner/blacklist"));
app.use("/owner/ai", require("./routes/owner/ai-special"));
app.use("/owner/ai", require("./routes/owner/ai"));
app.use("/owner/ledger", require("./routes/owner/ledger"));
app.use("/owner/delays", require("./routes/owner/delays"));
app.use("/owner/timeline", require("./routes/owner/timeline"));

/* ---------------- MANAGER ROUTES ---------------- */
app.use("/manager", require("./routes/manager/manager"));
app.use("/manager/dashboard", require("./routes/manager/dashboard"));
app.use("/manager/organization", require("./routes/manager/manOrganization"));
app.use("/manager/organization", require("./routes/manager/leaveOrganization"));
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
app.use("/manager/reports", require("./routes/manager/reports"));
app.use("/manager/blacklist", require("./routes/manager/blacklist"));
app.use("/manager/ai", require("./routes/manager/ai-special"));
app.use("/manager/ai", require("./routes/manager/ai"));
app.use("/manager/ledger", require("./routes/manager/ledger"));
app.use("/manager/delays", require("./routes/manager/delays"));
app.use("/manager/timeline", require("./routes/manager/timeline"));

/* ---------------- ENGINEER ROUTES ---------------- */
app.use("/engineer", require("./routes/engineer/engineer"));
app.use("/engineer/dashboard", require("./routes/engineer/dashboard"));
app.use("/engineer/organization", require("./routes/engineer/enOrganization"));
app.use(
  "/engineer/organization",
  require("./routes/engineer/leaveOrganization"),
);
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
app.use("/engineer/fast", require("./routes/engineer/fast/graphql"));
app.use("/engineer/ledger", require("./routes/engineer/ledger"));
app.use("/engineer/ai", require("./routes/engineer/ai"));
app.use("/engineer/audits", require("./routes/engineer/audit"));
app.use("/engineer/notifications", require("./routes/engineer/notifications"));

/* ---------------- LABOUR ROUTES ---------------- */
app.use("/labour", require("./routes/labour/labour"));
app.use("/labour/jobs", require("./routes/labour/jobs"));
app.use("/labour/projects", require("./routes/labour/projects"));
app.use("/labour/attendance", require("./routes/labour/attendance"));
app.use("/labour/wages", require("./routes/labour/wages"));
app.use("/labour/notifications", require("./routes/labour/notifications"));
app.use("/labour/address", require("./routes/labour/address"));
app.use("/labour/sync", require("./routes/labour/sync"));
app.use("/labour/fast", require("./routes/labour/fast/graphql"));
app.use("/labour/user", require("./routes/labour/user"));

/* ---------------- PROJECT ROUTES (cross-role) ---------------- */
/* Note: Project-level routes (ledger, delays, ai, timeline) moved to owner/* and manager/* */

/* ---------------- SYNC ROUTES (offline synchronization) ---------------- */
app.use("/sync/batch", require("./routes/sync/batch"));
app.use("/sync/labour", require("./routes/sync/labour"));
app.use("/sync/engineer", require("./routes/sync/engineer"));

/* ---------------- TESTING HARNESS (development only) ---------------- */
// Serve testing HTML/JS files at http://localhost:3001/testing/
// This ensures session cookies work correctly (same origin as backend)
// Access via: http://localhost:3001/testing/auth.html
const path = require("path");
app.use("/testing", express.static(path.join(__dirname, "testing")));

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
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`🧪 Testing harness: http://localhost:${port}/testing/auth.html`);
});
