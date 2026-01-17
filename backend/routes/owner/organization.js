const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

router.post("/create-organization", ownerCheck, async (req, res) => {
  const { name, address, phone, org_type } = req.body;
  const ownerId = req.user.id;
  try {
    const result = await pool.query(
      "INSERT INTO organizations (name, address, phone, org_type, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, address, phone, org_type, ownerId],
    );
    res.status(201).json({ organization: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/organizations", ownerCheck, async (req, res) => {
  const ownerId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT * FROM organizations WHERE owner_id = $1",
      [ownerId],
    );
    res.json({ organizations: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.patch("/organization/:id", ownerCheck, async (req, res) => {
  const orgId = req.params.id;
  const { name, address, phone, org_type } = req.body;
  const ownerId = req.user.id;
  try {
    const result = await pool.query(
      "UPDATE organizations SET name = $1, address = $2, phone = $3, org_type = $4 WHERE id = $5 AND owner_id = $6 RETURNING *",
      [name, address, phone, org_type, orgId, ownerId],
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Organization not found or unauthorized" });
    }
    res.json({ organization: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.delete("/organization/:id", ownerCheck, async (req, res) => {
  const orgId = req.params.id;
  const ownerId = req.user.id;
  try {
    const result = await pool.query(
      "DELETE FROM organizations WHERE id = $1 AND owner_id = $2 RETURNING *",
      [orgId, ownerId],
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Organization not found or unauthorized" });
    }
    res.json({ message: "Organization deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/organization/:id", ownerCheck, async (req, res) => {
  const orgId = req.params.id;
  const ownerId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT * FROM organizations WHERE id = $1 AND owner_id = $2",
      [orgId, ownerId],
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Organization not found or unauthorized" });
    }
    res.json({ organization: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
