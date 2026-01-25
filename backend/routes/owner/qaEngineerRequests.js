const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

// Helper: Get organization IDs owned by this owner
async function getOwnerOrgIds(ownerId) {
  const result = await pool.query(
    `SELECT id FROM organizations WHERE owner_id = $1`,
    [ownerId],
  );
  return result.rows.map((r) => r.id);
}

/* ---------------- GET PENDING QA ENGINEERS ---------------- */
// Owner can VIEW pending QA Engineers for their organization
router.get("/organization-requests", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Get owner's organizations
    const orgIds = await getOwnerOrgIds(ownerId);

    if (orgIds.length === 0) {
      return res.json({ requests: [] });
    }

    const result = await pool.query(
      `SELECT oqa.id AS request_id, oqa.*, qa.name, qa.email, qa.phone, o.name AS organization_name
       FROM organization_qa_engineers oqa
       JOIN qa_engineers qa ON oqa.qa_engineer_id = qa.id
       JOIN organizations o ON oqa.org_id = o.id
       WHERE oqa.org_id = ANY($1) AND oqa.status = 'PENDING'
       ORDER BY oqa.created_at DESC`,
      [orgIds],
    );

    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- APPROVE/REJECT QA ENGINEER ORGANIZATION REQUEST ---------------- */
router.patch(
  "/organization-requests/:requestId",
  ownerCheck,
  async (req, res) => {
    try {
      const ownerId = req.user.id;
      const { requestId } = req.params;
      const { status } = req.body; // 'APPROVED' or 'REJECTED'

      if (!status || !["APPROVED", "REJECTED"].includes(status)) {
        return res
          .status(400)
          .json({ error: "status must be APPROVED or REJECTED" });
      }

      // Get the request
      const requestResult = await pool.query(
        `SELECT * FROM organization_qa_engineers WHERE id = $1`,
        [requestId],
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      const request = requestResult.rows[0];

      // Verify owner owns this organization
      const orgIds = await getOwnerOrgIds(ownerId);
      if (!orgIds.includes(request.org_id)) {
        return res
          .status(403)
          .json({ error: "Not authorized for this organization" });
      }

      // Update status
      const result = await pool.query(
        `UPDATE organization_qa_engineers 
       SET status = $1, approved_by_role = 'OWNER', approved_at = NOW()
       WHERE id = $2 RETURNING *`,
        [status, requestId],
      );

      // Log to audit
      await pool.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, acted_by_role, acted_by_id, organization_id, remarks)
       VALUES ('ORGANIZATION_QA_REQUEST', $1, $2, 'OWNER', $3, $4, $5)`,
        [
          requestId,
          status === "APPROVED" ? "QA_ORG_APPROVED" : "QA_ORG_REJECTED",
          ownerId,
          request.org_id,
          `Owner ${status.toLowerCase()} QA Engineer organization request`,
        ],
      );

      res.json({
        request: result.rows[0],
        message: `Request ${status.toLowerCase()} successfully`,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
