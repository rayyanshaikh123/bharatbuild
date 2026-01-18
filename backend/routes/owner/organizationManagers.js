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
router.get("/all/managers", ownerCheck, async (req, res) => {
  const ownerId = req.user.id;
  const { organizationId } = req.query;
  const status = await ownerOfProjectOrganization(ownerId, organizationId);
  if (!status) {
    return res
      .status(403)
      .json({ error: "Access denied. You do not own this organization." });
  }
  try {
    const result = await pool.query(
      `select * from organization_managers where org_id=$1 and status='ACTIVE'`,
      [organizationId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/manager/:managerId", ownerCheck, async (req, res) => {
  const ownerId = req.user.id;
  const { managerId } = req.params;
  const { organizationId } = req.query;
  const status = await ownerOfProjectOrganization(ownerId, organizationId);
  if (!status) {
    return res   .status(403)
      .json({ error: "Access denied. You do not own this organization." });
  }
  try {
    const result = await pool.query(
      `select * from organization_managers where org_id=$1 and manager_id=$2 and status='ACTIVE'`,
      [organizationId, managerId],
    );
    res.json({ manager: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
