const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

// Helper: Get organization IDs owned by this owner
async function getOwnerOrgIds(ownerId) {
  const result = await pool.query(
    `SELECT id FROM organizations WHERE owner_id = $1`,
    [ownerId]
  );
  return result.rows.map((r) => r.id);
}

/* ---------------- GET PENDING QA ENGINEERS ---------------- */
// Owner can VIEW pending QA Engineers for their organization
router.get("/organization-pending", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Get owner's organizations
    const orgIds = await getOwnerOrgIds(ownerId);

    if (orgIds.length === 0) {
      return res.json({ pending_engineers: [] });
    }

    const result = await pool.query(
      `SELECT oqa.*, qa.name, qa.email, qa.phone, o.name AS organization_name
       FROM organization_qa_engineers oqa
       JOIN qa_engineers qa ON oqa.qa_engineer_id = qa.id
       JOIN organizations o ON oqa.org_id = o.id
       WHERE oqa.org_id = ANY($1) AND oqa.status = 'PENDING'
       ORDER BY oqa.created_at DESC`,
      [orgIds]
    );

    res.json({ pending_engineers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
