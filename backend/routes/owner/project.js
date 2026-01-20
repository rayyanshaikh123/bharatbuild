const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

async function ownerOfProjectOrganization(ownerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM projects p
     JOIN organizations o ON p.org_id = o.id
     WHERE p.id = $1 AND o.owner_id = $2`,
    [projectId, ownerId],
  );
  return parseInt(result.rows[0].count) > 0;
}
router.get("/all/projects", ownerCheck, async (req, res) => {
  const ownerId = req.user.id;
  const { organizationId } = req.query;
  const status = await ownerOfProjectOrganization(ownerId, organizationId);
  if (!status) {
    return res
      .status(403)
      .json({ error: "Access denied. You do not own this organization." });
  }
  try {
    const result = await pool.query(`select * from projects where org_id=$1`, [
      organizationId,
    ]);
    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/project/:projectId", ownerCheck, async (req, res) => {
  const ownerId = req.user.id;
  const { projectId } = req.params;
  const { organizationId } = req.query;
  const status = await ownerOfProjectOrganization(ownerId, organizationId);
  if (!status) {
    return res
      .status(403)
      .json({ error: "Access denied. You do not own this organization." });
  }
  try {
    const result = await pool.query(
      `select * from projects where id=$1 and org_id=$2`,
      [projectId, organizationId],
    );

    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/project-managers/active", ownerCheck, async (req, res) => {
  const ownerId = req.user.id;
  const { projectId, organizationId } = req.query;
  const status = await ownerOfProjectOrganization(ownerId, organizationId);
  if (!status) {
    return res
      .status(403)
      .json({ error: "Access denied. You do not own this organization." });
  }
  try {
    const result = await pool.query(
      `SELECT pm.*, m.name AS manager_name, m.email AS manager_email, m.phone AS manager_phone
       FROM project_managers pm
       JOIN managers m ON pm.manager_id = m.id
       WHERE pm.project_id = $1 AND pm.status = 'ACTIVE'`,
      [projectId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/project-managers/pending", ownerCheck, async (req, res) => {
  const ownerId = req.user.id;
  const { projectId, organizationId } = req.query;
  const status = await ownerOfProjectOrganization(ownerId, organizationId);
  if (!status) {
    return res
      .status(403)
      .json({ error: "Access denied. You do not own this organization." });
  }
  try {
    const result = await pool.query(
      `SELECT pm.*, m.name AS manager_name, m.email AS manager_email, m.phone AS manager_phone
       FROM project_managers pm
       JOIN managers m ON pm.manager_id = m.id
       WHERE pm.project_id = $1 AND pm.status = 'PENDING'`,
      [projectId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/project-managers/rejected", ownerCheck, async (req, res) => {
  const ownerId = req.user.id;
  const { projectId, organizationId } = req.query;
  const status = await ownerOfProjectOrganization(ownerId, organizationId);
  if (!status) {
    return res
      .status(403)
      .json({ error: "Access denied. You do not own this organization." });
  }
  try {
    const result = await pool.query(
      `SELECT pm.*, m.name AS manager_name, m.email AS manager_email, m.phone AS manager_phone
       FROM project_managers pm
       JOIN managers m ON pm.manager_id = m.id
       WHERE pm.project_id = $1 AND pm.status = 'REJECTED'`,
      [projectId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/project-manager/owner", ownerCheck, async (req, res) => {
  const ownerId = req.user.id;
  const { projectId, organizationId } = req.query;
  const status = await ownerOfProjectOrganization(ownerId, organizationId);
  if (!status) {
    return res
      .status(403)
      .json({ error: "Access denied. You do not own this organization." });
  }
  try {
    const result = await pool.query(
      `SELECT m.*, pm.status, pm.assigned_at
       FROM project_managers pm
       JOIN managers m ON pm.manager_id = m.id
       JOIN projects p ON pm.project_id = p.id
       WHERE pm.project_id = $1 AND p.org_id = $2 AND p.created_by = m.id`,
      [projectId, organizationId],
    );
    res.json({ manager: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
