const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

router.get("/", ownerCheck, async (req, res) => {
  const { orgId } = req.body;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT om.*, m.name AS manager_name, m.email AS manager_email, m.phone AS manager_phone
       FROM organization_managers om
       JOIN managers m ON om.manager_id = m.id
       JOIN organizations o ON om.org_id = o.id
       WHERE om.org_id = $1 AND o.owner_id = $2`,
      [orgId, userId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/accepted", ownerCheck, async (req, res) => {
  const { orgId } = req.query;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT om.*, m.name AS manager_name, m.email AS manager_email, m.phone AS manager_phone
       FROM organization_managers om
       JOIN managers m ON om.manager_id = m.id
       JOIN organizations o ON om.org_id = o.id
       WHERE om.org_id = $1 AND o.owner_id = $2 AND om.status = 'APPROVED'`,
      [orgId, userId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/pending", ownerCheck, async (req, res) => {
  const { orgId } = req.query;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT om.*, m.name AS manager_name, m.email AS manager_email, m.phone AS manager_phone
       FROM organization_managers om
       JOIN managers m ON om.manager_id = m.id
       JOIN organizations o ON om.org_id = o.id
       WHERE om.org_id = $1 AND o.owner_id = $2 AND om.status = 'PENDING'`,
      [orgId, userId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/rejected", ownerCheck, async (req, res) => {
  const { orgId } = req.query;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT om.*, m.name AS manager_name, m.email AS manager_email, m.phone AS manager_phone
       FROM organization_managers om
       JOIN managers m ON om.manager_id = m.id
       JOIN organizations o ON om.org_id = o.id
       WHERE om.org_id = $1 AND o.owner_id = $2 AND om.status = 'REJECTED'`,
      [orgId, userId],
    );
    res.json({ managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.patch("/:id", ownerCheck, async (req, res) => {
  const reqId = req.params.id;
  const userId = req.user.id;
  const { status } = req.body;
  try {
    // Validate status
    const validStatuses = ["APPROVED", "REJECTED", "PENDING"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be APPROVED, REJECTED, or PENDING",
      });
    }

    const result = await pool.query(
      `UPDATE organization_managers om
       SET status = $1, approved_at = CASE WHEN $1 = 'APPROVED' THEN NOW() ELSE approved_at END
       FROM organizations o
       WHERE om.id = $2 AND om.org_id = o.id AND o.owner_id = $3
       RETURNING om.*`,
      [status, reqId, userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Send email notification to manager
    try {
      const notificationData = await pool.query(
        `SELECT m.email, m.name, o.name as org_name
         FROM organization_managers om
         JOIN managers m ON om.manager_id = m.id
         JOIN organizations o ON om.org_id = o.id
         WHERE om.id = $1`,
        [reqId],
      );

      if (notificationData.rows.length > 0) {
        const { sendNotificationEmail } = require("../../util/mailer");
        const statusText = status === "APPROVED" ? "approved" : "rejected";
        await sendNotificationEmail({
          to: notificationData.rows[0].email,
          subject: `Organization Request ${status}`,
          message: `Hello ${notificationData.rows[0].name},\n\nYour request to join "${notificationData.rows[0].org_name}" has been ${statusText}.\n\nBest regards,\nBharat Build Team`,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send manager org status email:", emailErr);
    }

    res.json({ request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
