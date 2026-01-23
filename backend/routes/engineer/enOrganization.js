const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");

router.get("/", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const result = await pool.query(
      `SELECT o.id, o.name, o.address, o.office_phone, o.latitude, o.longitude
             FROM organizations o
             JOIN organization_site_engineers ose ON o.id = ose.org_id
             WHERE ose.site_engineer_id = $1 AND ose.status = 'APPROVED'`,
      [engineerId],
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

router.get("/all", engineerCheck, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, address, office_phone, latitude, longitude FROM organizations`,
    );
    res.json({ organizations: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/join-organization", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { organizationId } = req.body;

    const orgCheck = await pool.query(
      "SELECT id FROM organizations WHERE id = $1",
      [organizationId],
    );
    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }

    await pool.query(
      "INSERT INTO organization_site_engineers (org_id, site_engineer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [organizationId, engineerId],
    );
    res.json({ message: "Joining request to the organization successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/my-requests", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const result = await pool.query(
      `SELECT o.id, o.name, o.address, o.office_phone, ose.status, ose.created_at
             FROM organizations o
             JOIN organization_site_engineers ose ON o.id = ose.org_id
             WHERE ose.site_engineer_id = $1`,
      [engineerId],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
