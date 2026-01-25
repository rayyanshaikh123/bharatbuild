const express = require("express");
const pool = require("../../db");
const router = express.Router();
const qaEngineerCheck = require("../../middleware/qaEngineerCheck");
const qaOrganization = require("./qaOrganization");
const qaProjectReq = require("./qaProjectReq");

/* ---------------- GET ME (QA Profile) ---------------- */
router.get("/me", qaEngineerCheck, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET ASSIGNED PROJECTS ---------------- */
router.get("/my-projects", qaEngineerCheck, async (req, res) => {
  try {
    const qaEngineerId = req.user.id;

    const result = await pool.query(
      `SELECT p.*, pqa.status AS assignment_status
       FROM projects p
       JOIN project_qa_engineers pqa ON p.id = pqa.project_id
       WHERE pqa.qa_engineer_id = $1 AND pqa.status = 'APPROVED'
       ORDER BY p.created_at DESC`,
      [qaEngineerId],
    );

    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET PROJECT TASKS ---------------- */
router.get(
  "/my-projects/:projectId/tasks",
  qaEngineerCheck,
  async (req, res) => {
    try {
      const qaEngineerId = req.user.id;
      const { projectId } = req.params;

      // Verify QA is assigned to project
      const assignmentCheck = await pool.query(
        `SELECT id FROM project_qa_engineers 
       WHERE qa_engineer_id = $1 AND project_id = $2 AND status = 'APPROVED'`,
        [qaEngineerId, projectId],
      );

      if (assignmentCheck.rows.length === 0) {
        return res.status(403).json({ error: "Not assigned to this project" });
      }

      // Get tasks with subcontractor info
      const result = await pool.query(
        `SELECT pi.*, ts.subcontractor_id, s.name AS subcontractor_name,
              tqr.id AS quality_review_id, tqr.rating AS quality_rating
       FROM plan_items pi
       JOIN plans pl ON pi.plan_id = pl.id
       LEFT JOIN task_subcontractors ts ON pi.id = ts.task_id
       LEFT JOIN subcontractors s ON ts.subcontractor_id = s.id
       LEFT JOIN task_quality_reviews tqr ON pi.id = tqr.task_id
       WHERE pl.project_id = $1
       ORDER BY pi.period_start, pi.created_at`,
        [projectId],
      );

      res.json({ tasks: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Mount sub-routers AFTER specific routes to avoid conflicts
router.use("/organizations", qaOrganization);
router.use("/projects", qaProjectReq);

module.exports = router;
