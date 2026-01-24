const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

/* ---------------- GET ALL PURCHASE MANAGER REQUESTS ---------------- */
router.get("/", ownerCheck, async (req, res) => {
  const { orgId } = req.query;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT opm.*, pm.name AS purchase_manager_name, pm.email AS purchase_manager_email, pm.phone AS purchase_manager_phone
       FROM organization_purchase_managers opm
       JOIN purchase_managers pm ON opm.purchase_manager_id = pm.id
       JOIN organizations o ON opm.org_id = o.id
       WHERE opm.org_id = $1 AND o.owner_id = $2`,
      [orgId, userId],
    );
    res.json({ purchase_managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET APPROVED PURCHASE MANAGER REQUESTS ---------------- */
router.get("/accepted", ownerCheck, async (req, res) => {
  const { orgId } = req.query;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT opm.*, pm.name AS purchase_manager_name, pm.email AS purchase_manager_email, pm.phone AS purchase_manager_phone
       FROM organization_purchase_managers opm
       JOIN purchase_managers pm ON opm.purchase_manager_id = pm.id
       JOIN organizations o ON opm.org_id = o.id
       WHERE opm.org_id = $1 AND o.owner_id = $2 AND opm.status = 'APPROVED'`,
      [orgId, userId],
    );
    res.json({ purchase_managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET PENDING PURCHASE MANAGER REQUESTS ---------------- */
router.get("/pending", ownerCheck, async (req, res) => {
  const { orgId } = req.query;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT opm.*, pm.name AS purchase_manager_name, pm.email AS purchase_manager_email, pm.phone AS purchase_manager_phone
       FROM organization_purchase_managers opm
       JOIN purchase_managers pm ON opm.purchase_manager_id = pm.id
       JOIN organizations o ON opm.org_id = o.id
       WHERE opm.org_id = $1 AND o.owner_id = $2 AND opm.status = 'PENDING'`,
      [orgId, userId],
    );
    res.json({ purchase_managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET REJECTED PURCHASE MANAGER REQUESTS ---------------- */
router.get("/rejected", ownerCheck, async (req, res) => {
  const { orgId } = req.query;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT opm.*, pm.name AS purchase_manager_name, pm.email AS purchase_manager_email, pm.phone AS purchase_manager_phone
       FROM organization_purchase_managers opm
       JOIN purchase_managers pm ON opm.purchase_manager_id = pm.id
       JOIN organizations o ON opm.org_id = o.id
       WHERE opm.org_id = $1 AND o.owner_id = $2 AND opm.status = 'REJECTED'`,
      [orgId, userId],
    );
    res.json({ purchase_managers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- APPROVE/REJECT PURCHASE MANAGER REQUEST ---------------- */
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
      `UPDATE organization_purchase_managers opm
       SET status = $1, approved_at = CASE WHEN $1 = 'APPROVED' THEN NOW() ELSE approved_at END
       FROM organizations o
       WHERE opm.id = $2 AND opm.org_id = o.id AND o.owner_id = $3
       RETURNING opm.*`,
      [status, reqId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Create notification for purchase manager
    try {
      const notificationData = await pool.query(
        `SELECT pm.id, pm.name, o.name as org_name
         FROM organization_purchase_managers opm
         JOIN purchase_managers pm ON opm.purchase_manager_id = pm.id
         JOIN organizations o ON opm.org_id = o.id
         WHERE opm.id = $1`,
        [reqId],
      );

      if (notificationData.rows.length > 0) {
        const statusText = status === "APPROVED" ? "approved" : "rejected";
        await pool.query(
          `INSERT INTO notifications (user_id, user_role, title, message, type)
           VALUES ($1, 'PURCHASE_MANAGER', $2, $3, 'INFO')`,
          [
            notificationData.rows[0].id,
            `Organization Request ${status}`,
            `Your request to join "${notificationData.rows[0].org_name}" has been ${statusText}.`,
          ],
        );
      }
    } catch (notifErr) {
      console.error("Failed to send notification:", notifErr);
    }

    res.json({ request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
