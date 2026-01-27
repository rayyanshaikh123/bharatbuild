const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");

// Check if manager is the creator of the project
async function isProjectCreator(managerId, projectId) {
  const result = await pool.query(
    `SELECT count(*) FROM projects WHERE id = $1 AND created_by = $2`,
    [projectId, managerId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- GET PROJECT WORKING HOURS ---------------- */
router.get("/:projectId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;

    // Verify manager has access to project
    const accessCheck = await pool.query(
      `SELECT 1 FROM project_managers 
       WHERE project_id = $1 AND manager_id = $2 AND status = 'ACTIVE'`,
      [projectId, managerId],
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `SELECT check_in_time, check_out_time FROM projects WHERE id = $1`,
      [projectId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ working_hours: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- UPDATE PROJECT WORKING HOURS ---------------- */
// Only PROJECT CREATOR can update working hours
router.put("/:projectId", managerCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;
    const { check_in_time, check_out_time } = req.body;

    // 1. Verify manager is the project creator
    const isCreator = await isProjectCreator(managerId, projectId);
    if (!isCreator) {
      return res.status(403).json({
        error: "Only the project creator can update working hours",
      });
    }

    // 2. Validate input
    if (!check_in_time || !check_out_time) {
      return res.status(400).json({
        error: "Both check_in_time and check_out_time are required",
      });
    }

    // 3. Parse times (format: HH:MM or HH:MM:SS)
    const parseTime = (timeStr) => {
      const parts = timeStr.split(":");
      return {
        hour: parseInt(parts[0]),
        minute: parseInt(parts[1] || 0),
        second: parseInt(parts[2] || 0),
      };
    };

    const checkIn = parseTime(check_in_time);
    const checkOut = parseTime(check_out_time);

    // 4. Validate check_out_time <= 18:00
    if (checkOut.hour > 18 || (checkOut.hour === 18 && checkOut.minute > 0)) {
      return res.status(400).json({
        error: "Check-out time cannot exceed 18:00 (6 PM)",
      });
    }

    // 5. Validate check_in_time < check_out_time
    const checkInMinutes = checkIn.hour * 60 + checkIn.minute;
    const checkOutMinutes = checkOut.hour * 60 + checkOut.minute;

    if (checkInMinutes >= checkOutMinutes) {
      return res.status(400).json({
        error: "Check-in time must be before check-out time",
      });
    }

    await client.query("BEGIN");

    // 6. Get before state for audit
    const beforeState = await client.query(
      `SELECT check_in_time, check_out_time FROM projects WHERE id = $1`,
      [projectId],
    );

    // 7. Update project working hours
    const result = await client.query(
      `UPDATE projects 
       SET check_in_time = $1, check_out_time = $2 
       WHERE id = $3 
       RETURNING *`,
      [check_in_time, check_out_time, projectId],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Project not found" });
    }

    const afterState = result.rows[0];

    // 8. Audit log
    const organizationId = await getOrganizationIdFromProject(
      projectId,
      client,
    );
    await logAudit({
      entityType: "PROJECT",
      entityId: projectId,
      category: "PROJECT_SETTINGS",
      action: "UPDATE",
      before: beforeState.rows[0],
      after: {
        check_in_time: afterState.check_in_time,
        check_out_time: afterState.check_out_time,
      },
      user: req.user,
      projectId,
      organizationId,
      client,
    });

    await client.query("COMMIT");

    res.json({
      message: "Working hours updated successfully",
      working_hours: {
        check_in_time: afterState.check_in_time,
        check_out_time: afterState.check_out_time,
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

module.exports = router;
