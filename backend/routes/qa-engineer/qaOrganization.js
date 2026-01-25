const express = require("express");
const pool = require("../../db");
const router = express.Router();
const qaEngineerCheck = require("../../middleware/qaEngineerCheck");

/* ---------------- 1️⃣ GET ALL ORGANIZATIONS (Public) ---------------- */
router.get("/", qaEngineerCheck, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.name, o.address, o.office_phone, o.org_type, ow.name AS owner_name
       FROM organizations o
       LEFT JOIN owners ow ON o.owner_id = ow.id
       ORDER BY o.name`,
    );
    res.json({ organizations: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- 2️⃣ REQUEST TO JOIN ORGANIZATION ---------------- */
router.post("/:orgId/join", qaEngineerCheck, async (req, res) => {
  try {
    const qaEngineerId = req.user.id;
    const { orgId } = req.params;

    // Verify organization exists
    const orgCheck = await pool.query(
      "SELECT id FROM organizations WHERE id = $1",
      [orgId],
    );
    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Check if already has an APPROVED organization (one org at a time rule)
    const existingApproved = await pool.query(
      `SELECT org_id FROM organization_qa_engineers 
       WHERE qa_engineer_id = $1 AND status = 'APPROVED'`,
      [qaEngineerId],
    );
    if (existingApproved.rows.length > 0) {
      return res.status(400).json({
        error:
          "You are already part of an organization. QA Engineers can only join one organization at a time.",
      });
    }

    // Check for duplicate pending/approved requests
    const existingRequest = await pool.query(
      `SELECT id, status FROM organization_qa_engineers 
       WHERE qa_engineer_id = $1 AND org_id = $2`,
      [qaEngineerId, orgId],
    );
    if (existingRequest.rows.length > 0) {
      const status = existingRequest.rows[0].status;
      if (status === "PENDING") {
        return res
          .status(400)
          .json({
            error: "You already have a pending request for this organization",
          });
      }
      if (status === "APPROVED") {
        return res
          .status(400)
          .json({ error: "You are already a member of this organization" });
      }
      // If REJECTED, allow re-request by updating status to PENDING
      await pool.query(
        `UPDATE organization_qa_engineers SET status = 'PENDING', created_at = NOW() 
         WHERE id = $1`,
        [existingRequest.rows[0].id],
      );
      return res.json({ message: "Join request resubmitted successfully" });
    }

    // Insert new request
    await pool.query(
      `INSERT INTO organization_qa_engineers (org_id, qa_engineer_id, status) 
       VALUES ($1, $2, 'PENDING')`,
      [orgId, qaEngineerId],
    );

    res.json({ message: "Organization join request submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- 3️⃣ VIEW ORGANIZATION JOIN REQUESTS ---------------- */
router.get("/requests", qaEngineerCheck, async (req, res) => {
  try {
    const qaEngineerId = req.user.id;
    const result = await pool.query(
      `SELECT 
         oqa.id AS request_id,
         o.id AS org_id,
         o.name AS org_name,
         o.address,
         oqa.status,
         oqa.created_at AS requested_at,
         oqa.approved_at
       FROM organization_qa_engineers oqa
       JOIN organizations o ON oqa.org_id = o.id
       WHERE oqa.qa_engineer_id = $1
       ORDER BY oqa.created_at DESC`,
      [qaEngineerId],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
