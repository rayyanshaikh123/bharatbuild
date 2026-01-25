const express = require("express");
const pool = require("../../db");
const router = express.Router();
const qaEngineerCheck = require("../../middleware/qaEngineerCheck");

/* ---------------- 5️⃣ VIEW PROJECTS OF APPROVED ORGANIZATION ---------------- */
router.get("/available", qaEngineerCheck, async (req, res) => {
  try {
      const qaEngineerId = req.user.id;
      console.log("QA Engineer ID:", qaEngineerId);

    // Get QA's APPROVED organization
    const orgResult = await pool.query(
      `SELECT org_id FROM organization_qa_engineers 
       WHERE qa_engineer_id = $1 AND status = 'APPROVED'`,
      [qaEngineerId],
    );

    if (orgResult.rows.length === 0) {
      return res.status(403).json({
        error:
          "You must be approved by an organization before viewing projects",
      });
    }

    const orgId = orgResult.rows[0].org_id;

    // Get all projects in that organization
    const result = await pool.query(
      `SELECT p.id, p.name, p.location_text, p.latitude, p.longitude, 
              p.start_date, p.end_date, p.status, p.org_id
       FROM projects p
       WHERE p.org_id = $1
       ORDER BY p.created_at DESC`,
      [orgId],
    );

    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- 6️⃣ REQUEST TO JOIN PROJECT ---------------- */
router.post("/:projectId/join", qaEngineerCheck, async (req, res) => {
  try {
    const qaEngineerId = req.user.id;
    const { projectId } = req.params;

    // Verify QA has APPROVED organization membership
    const orgResult = await pool.query(
      `SELECT org_id FROM organization_qa_engineers 
       WHERE qa_engineer_id = $1 AND status = 'APPROVED'`,
      [qaEngineerId],
    );

    if (orgResult.rows.length === 0) {
      return res.status(403).json({
        error:
          "You must be approved by an organization before joining projects",
      });
    }

    const qaOrgId = orgResult.rows[0].org_id;

    // Verify project exists and belongs to QA's organization
    const projectCheck = await pool.query(
      `SELECT id, org_id, name FROM projects WHERE id = $1`,
      [projectId],
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = projectCheck.rows[0];
    if (project.org_id !== qaOrgId) {
      return res.status(403).json({
        error: "Project does not belong to your approved organization",
      });
    }

    // Check for duplicate requests
    const existingRequest = await pool.query(
      `SELECT id, status FROM project_qa_engineers 
       WHERE qa_engineer_id = $1 AND project_id = $2`,
      [qaEngineerId, projectId],
    );

    if (existingRequest.rows.length > 0) {
      const status = existingRequest.rows[0].status;
      if (status === "PENDING") {
        return res.status(400).json({
          error: "You already have a pending request for this project",
        });
      }
      if (status === "APPROVED") {
        return res
          .status(400)
          .json({ error: "You are already a member of this project" });
      }
      // If REJECTED, allow re-request
      await pool.query(
        `UPDATE project_qa_engineers SET status = 'PENDING', assigned_at = NOW() 
         WHERE id = $1`,
        [existingRequest.rows[0].id],
      );
      return res.json({
        message: "Project join request resubmitted successfully",
      });
    }

    // Insert new request
    await pool.query(
      `INSERT INTO project_qa_engineers (project_id, qa_engineer_id, status) 
       VALUES ($1, $2, 'PENDING')`,
      [projectId, qaEngineerId],
    );

    res.json({
      message:
        "Project join request submitted successfully. Waiting for manager approval.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- 7️⃣ VIEW PROJECT JOIN REQUESTS ---------------- */
router.get("/requests", qaEngineerCheck, async (req, res) => {
  try {
    const qaEngineerId = req.user.id;
    const result = await pool.query(
      `SELECT 
         pqa.id AS request_id,
         p.id AS project_id,
         p.name AS project_name,
         p.location_text,
         p.org_id,
         pqa.status,
         pqa.assigned_at AS requested_at
       FROM project_qa_engineers pqa
       JOIN projects p ON pqa.project_id = p.id
       WHERE pqa.qa_engineer_id = $1
       ORDER BY pqa.assigned_at DESC`,
      [qaEngineerId],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
