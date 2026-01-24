const express = require("express");
const pool = require("../../db");
const router = express.Router();
const purchaseManagerCheck = require("../../middleware/purchaseManagerCheck");

/* ---------------- GET ORGANIZATION STATUS ---------------- */
router.get("/organization-status", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;

    const result = await pool.query(
      `SELECT o.id, o.name, o.address, o.office_phone, opm.status, opm.created_at, opm.approved_at
       FROM organizations o
       JOIN organization_purchase_managers opm ON o.id = opm.org_id
       WHERE opm.purchase_manager_id = $1`,
      [purchaseManagerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No organization found" });
    }

    res.json({ organization: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET ALL AVAILABLE ORGANIZATIONS ---------------- */
router.get("/organizations", purchaseManagerCheck, async (req, res) => {
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

/* ---------------- JOIN ORGANIZATION ---------------- */
router.post("/join-organization", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    // Check if purchase manager already has an APPROVED organization
    const existingOrgCheck = await pool.query(
      "SELECT org_id FROM organization_purchase_managers WHERE purchase_manager_id = $1 AND status = 'APPROVED'",
      [purchaseManagerId],
    );

    if (existingOrgCheck.rows.length > 0) {
      return res.status(400).json({
        error:
          "You are already part of an organization. A purchase manager can only join one organization at a time.",
      });
    }

    // Verify organization exists
    const orgCheck = await pool.query(
      "SELECT id FROM organizations WHERE id = $1",
      [organizationId],
    );

    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Insert join request
    await pool.query(
      "INSERT INTO organization_purchase_managers (org_id, purchase_manager_id, status) VALUES ($1, $2, 'PENDING') ON CONFLICT (org_id, purchase_manager_id) DO NOTHING",
      [organizationId, purchaseManagerId],
    );

    // Create audit log
    await pool.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, acted_by_role, acted_by_id, organization_id, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        "ORGANIZATION",
        organizationId,
        "JOIN_REQUEST",
        "PURCHASE_MANAGER",
        purchaseManagerId,
        organizationId,
        "ACCESS",
      ],
    );

    res.json({ message: "Join request sent to organization successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
