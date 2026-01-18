const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

router.get("/", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const result = await pool.query(
      `SELECT o.id, o.name, o.address, o.office_phone
             FROM organizations o
             JOIN organization_managers om ON o.id = om.org_id
             WHERE om.manager_id = $1 AND om.status = 'APPROVED'`,
      [managerId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }
    res.json({ organizations: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/all", managerCheck, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, address, office_phone FROM organizations`,
    );
    res.json({ organizations: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.post("/join-organization", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { organizationId } = req.body;

    const orgCheck = await pool.query(
      "SELECT id FROM organizations WHERE id = $1",
      [organizationId],
    );
    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }

    await pool.query(
      "INSERT INTO organization_managers (org_id, manager_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [organizationId, managerId],
    );
    res.json({ message: "Joining request to the organization successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/my-requests", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const result = await pool.query(
      `SELECT om.*,
              o.name AS org_name,
              o.address AS org_address,
              o.office_phone AS org_office_phone
       FROM organization_managers om
       JOIN organizations o ON om.org_id = o.id
       WHERE om.manager_id = $1`,
      [managerId],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
