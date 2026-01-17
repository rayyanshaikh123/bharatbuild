const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

router.get("/", ownerCheck, async (req, res) => {
  const { orgId } = req.body;
  try {
    const result = await pool.query(
      "select * from organization_managers where organization_id=$1",
      [orgId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/accepted", ownerCheck, async (req, res) => {
  const { orgId } = req.body;
  try {
    const result = await pool.query(
      "select * from organization_managers where organization_id=$1 and status='APPROVED'",
      [orgId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/pending", ownerCheck, async (req, res) => {
  const { orgId } = req.body;
  try {
    const result = await pool.query(
      "select * from organization_managers where organization_id=$1 and status='PENDING'",
      [orgId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/rejected", ownerCheck, async (req, res) => {
  const { orgId } = req.body;
  try {
    const result = await pool.query(
      "select * from organization_managers where organization_id=$1 and status='REJECTED'",
      [orgId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.patch("/:id", ownerCheck, async (req, res) => {
  const reqId = req.params.id;
  const { status } = req.body;
  try {
    const result = await pool.query(
      "update organization_managers set status=$1 where id=$2 returning *",
      [status, reqId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }
    res.json({ request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
