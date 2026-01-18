const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
async function siteEngineerStatuusCheck(engineerId, organizationId) {
  const statusCheck = await pool.query(
    `SELECT status FROM organization_site_engineers 
         WHERE site_engineer_id = $1 AND org_id = $2 and status='APPROVED'`,
    [engineerId, organizationId],
  );
  if (statusCheck.rows.length === 0) {
    return null;
  }
  return statusCheck.rows[0].status;
}
router.get("/projects", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { organizationId } = req.query;

    const status = await siteEngineerStatuusCheck(engineerId, organizationId);
    if (status !== "APPROVED") {
      return res
        .status(403)
        .json({ error: "Access denied. Not an approved site engineer." });
    }

    const result = await pool.query(
      `SELECT p.* FROM projects p
           JOIN organizations o ON p.org_id = o.id
           WHERE p.org_id = $1`,
      [organizationId],
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.post("/project-join/:projectId", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.params;
    const { organizationId } = req.body;
    const status = await siteEngineerStatuusCheck(engineerId, organizationId);
    if (status !== "APPROVED") {
      return res
        .status(403)
        .json({ error: "Access denied. Not an approved site engineer." });
    }

    await pool.query(
      `INSERT INTO project_site_engineers (project_id, site_engineer_id) 
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [projectId, engineerId],
    );
    res.json({ message: "Successfully joined the project" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/my-requests", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    // const { organizationId } = req.query;
    // const status = await siteEngineerStatuusCheck(engineerId, organizationId);
    // if (status !== "APPROVED") {
    //   return res
    //     .status(403)
    //     .json({ error: "Access denied. Not an approved site engineer." });
    // }
    const result = await pool.query(
      `SELECT * from project_site_engineers where site_engineer_id=$1 and status='PENDING'`,
      [engineerId],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;