const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");

// Verify site engineer has access to project
async function verifyEngineerAccess(engineerId, projectId) {
  const result = await pool.query(
    `SELECT 1 FROM project_site_engineers 
     WHERE site_engineer_id = $1 AND project_id = $2 AND status = 'ACTIVE'`,
    [engineerId, projectId],
  );
  return {
    allowed: result.rows.length > 0,
    error: result.rows.length === 0 ? "Access denied to this project" : null,
  };
}

/* ---------------- CREATE PROJECT BREAK ---------------- */
router.post("/projects/:projectId/break", engineerCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const engineerId = req.user.id;
    const { projectId } = req.params;
    const { duration_minutes, reason } = req.body;

    // Verify access
    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.error });
    }

    // Validate duration
    if (!duration_minutes || duration_minutes < 60 || duration_minutes > 120) {
      return res.status(400).json({
        error: "Duration must be between 60 and 120 minutes (1-2 hours)",
      });
    }

    // Check if project is active
    const projectCheck = await client.query(
      `SELECT status FROM projects WHERE id = $1`,
      [projectId],
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (projectCheck.rows[0].status !== "ACTIVE") {
      return res.status(400).json({
        error: "Cannot create break for inactive project",
      });
    }

    // Check if there's already an active break
    const activeBreakCheck = await client.query(
      `SELECT id, ended_at FROM project_breaks 
       WHERE project_id = $1 AND NOW() BETWEEN started_at AND ended_at`,
      [projectId],
    );

    if (activeBreakCheck.rows.length > 0) {
      return res.status(400).json({
        error: "A break is already active for this project",
        active_break_ends_at: activeBreakCheck.rows[0].ended_at,
      });
    }

    await client.query("BEGIN");

    // Calculate start and end times
    const startedAt = new Date();
    const endedAt = new Date(
      startedAt.getTime() + duration_minutes * 60 * 1000,
    );

    // Create break
    const result = await client.query(
      `INSERT INTO project_breaks 
       (project_id, started_at, ended_at, created_by, created_by_role, reason)
       VALUES ($1, $2, $3, $4, 'SITE_ENGINEER', $5)
       RETURNING *`,
      [projectId, startedAt, endedAt, engineerId, reason || null],
    );

    const projectBreak = result.rows[0];

    // Audit log
    const organizationId = await getOrganizationIdFromProject(
      projectId,
      client,
    );
    await logAudit({
      entityType: "PROJECT",
      entityId: projectId,
      category: "PROJECT_BREAK",
      action: "PROJECT_BREAK_CREATED",
      before: null,
      after: projectBreak,
      user: req.user,
      projectId: projectId,
      organizationId,
      client,
      changeSummary: JSON.stringify({
        duration_minutes: duration_minutes,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        reason: reason || "No reason provided",
      }),
    });

    await client.query("COMMIT");

    res.status(201).json({
      message: "Project break created successfully",
      break: {
        id: projectBreak.id,
        project_id: projectBreak.project_id,
        started_at: projectBreak.started_at,
        ended_at: projectBreak.ended_at,
        duration_minutes: duration_minutes,
        reason: projectBreak.reason,
        created_by: projectBreak.created_by,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GET ACTIVE BREAK ---------------- */
router.get(
  "/projects/:projectId/break/active",
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId } = req.params;

      // Verify access
      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({ error: access.error });
      }

      const result = await pool.query(
        `SELECT pb.*, se.name as created_by_name
       FROM project_breaks pb
       LEFT JOIN site_engineers se ON pb.created_by = se.id
       WHERE pb.project_id = $1 AND NOW() BETWEEN pb.started_at AND pb.ended_at
       ORDER BY pb.started_at DESC
       LIMIT 1`,
        [projectId],
      );

      if (result.rows.length === 0) {
        return res.json({ active_break: null });
      }

      const activeBreak = result.rows[0];
      const now = new Date();
      const endTime = new Date(activeBreak.ended_at);
      const remainingMinutes = Math.ceil((endTime - now) / (1000 * 60));

      res.json({
        active_break: {
          id: activeBreak.id,
          project_id: activeBreak.project_id,
          started_at: activeBreak.started_at,
          ended_at: activeBreak.ended_at,
          remaining_minutes: remainingMinutes,
          reason: activeBreak.reason,
          created_by: activeBreak.created_by,
          created_by_name: activeBreak.created_by_name,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET BREAK HISTORY ---------------- */
router.get("/projects/:projectId/breaks", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.params;

    // Verify access
    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.error });
    }

    const result = await pool.query(
      `SELECT pb.*, se.name as created_by_name
       FROM project_breaks pb
       LEFT JOIN site_engineers se ON pb.created_by = se.id
       WHERE pb.project_id = $1
       ORDER BY pb.started_at DESC
       LIMIT 50`,
      [projectId],
    );

    res.json({ breaks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
