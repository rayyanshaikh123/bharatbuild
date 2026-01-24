const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

/* ---------------- GET PURCHASE MANAGER REQUESTS FOR PROJECT ---------------- */
router.get("/purchase-manager-requests", managerCheck, async (req, res) => {
  const managerId = req.user.id;
  const { projectId, organizationId } = req.query;

  try {
    // CREATOR-ONLY authorization check
    const authCheck = await pool.query(
      `SELECT 1 
       FROM project_managers pm
       JOIN organization_managers om ON om.manager_id = pm.manager_id
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.manager_id = $1::uuid 
         AND pm.project_id = $2::uuid
         AND pm.status = 'ACTIVE'
         AND om.status = 'APPROVED'
         AND p.org_id = om.org_id
         AND p.org_id = $3::uuid
         AND p.created_by = $1::uuid`,
      [managerId, projectId, organizationId],
    );

    if (authCheck.rows.length === 0) {
      return res.status(403).json({
        error:
          "Access denied. Only the project creator can view purchase manager requests.",
      });
    }

    // Fetch all purchase manager requests for this project
    const result = await pool.query(
      `SELECT ppm.*, 
              pm.name AS purchase_manager_name,
              pm.email AS purchase_manager_email,
              pm.phone AS purchase_manager_phone
       FROM project_purchase_managers ppm
       JOIN purchase_managers pm ON ppm.purchase_manager_id = pm.id
       WHERE ppm.project_id = $1::uuid
       ORDER BY ppm.assigned_at DESC`,
      [projectId],
    );

    res.json({ purchase_manager_requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET PENDING PURCHASE MANAGER REQUESTS ---------------- */
router.get(
  "/purchase-manager-requests/pending",
  managerCheck,
  async (req, res) => {
    const managerId = req.user.id;
    const { projectId, organizationId } = req.query;

    try {
      // CREATOR-ONLY authorization check
      const authCheck = await pool.query(
        `SELECT 1 
       FROM project_managers pm
       JOIN organization_managers om ON om.manager_id = pm.manager_id
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.manager_id = $1::uuid 
         AND pm.project_id = $2::uuid
         AND pm.status = 'ACTIVE'
         AND om.status = 'APPROVED'
         AND p.org_id = om.org_id
         AND p.org_id = $3::uuid
         AND p.created_by = $1::uuid`,
        [managerId, projectId, organizationId],
      );

      if (authCheck.rows.length === 0) {
        return res.status(403).json({
          error:
            "Access denied. Only the project creator can view purchase manager requests.",
        });
      }

      // Fetch pending purchase manager requests
      const result = await pool.query(
        `SELECT ppm.*, 
              pm.name AS purchase_manager_name,
              pm.email AS purchase_manager_email,
              pm.phone AS purchase_manager_phone
       FROM project_purchase_managers ppm
       JOIN purchase_managers pm ON ppm.purchase_manager_id = pm.id
       WHERE ppm.project_id = $1::uuid AND ppm.status = 'PENDING'
       ORDER BY ppm.assigned_at DESC`,
        [projectId],
      );

      res.json({ purchase_manager_requests: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET APPROVED PURCHASE MANAGER REQUESTS ---------------- */
router.get(
  "/purchase-manager-requests/approved",
  managerCheck,
  async (req, res) => {
    const managerId = req.user.id;
    const { projectId, organizationId } = req.query;

    try {
      // CREATOR-ONLY authorization check
      const authCheck = await pool.query(
        `SELECT 1 
       FROM project_managers pm
       JOIN organization_managers om ON om.manager_id = pm.manager_id
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.manager_id = $1::uuid 
         AND pm.project_id = $2::uuid
         AND pm.status = 'ACTIVE'
         AND om.status = 'APPROVED'
         AND p.org_id = om.org_id
         AND p.org_id = $3::uuid
         AND p.created_by = $1::uuid`,
        [managerId, projectId, organizationId],
      );

      if (authCheck.rows.length === 0) {
        return res.status(403).json({
          error:
            "Access denied. Only the project creator can view purchase manager requests.",
        });
      }

      // Fetch approved purchase manager requests
      const result = await pool.query(
        `SELECT ppm.*, 
              pm.name AS purchase_manager_name,
              pm.email AS purchase_manager_email,
              pm.phone AS purchase_manager_phone
       FROM project_purchase_managers ppm
       JOIN purchase_managers pm ON ppm.purchase_manager_id = pm.id
       WHERE ppm.project_id = $1::uuid AND ppm.status = 'APPROVED'
       ORDER BY ppm.assigned_at DESC`,
        [projectId],
      );

      res.json({ purchase_manager_requests: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET REJECTED PURCHASE MANAGER REQUESTS ---------------- */
router.get(
  "/purchase-manager-requests/rejected",
  managerCheck,
  async (req, res) => {
    const managerId = req.user.id;
    const { projectId, organizationId } = req.query;

    try {
      // CREATOR-ONLY authorization check
      const authCheck = await pool.query(
        `SELECT 1 
       FROM project_managers pm
       JOIN organization_managers om ON om.manager_id = pm.manager_id
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.manager_id = $1::uuid 
         AND pm.project_id = $2::uuid
         AND pm.status = 'ACTIVE'
         AND om.status = 'APPROVED'
         AND p.org_id = om.org_id
         AND p.org_id = $3::uuid
         AND p.created_by = $1::uuid`,
        [managerId, projectId, organizationId],
      );

      if (authCheck.rows.length === 0) {
        return res.status(403).json({
          error:
            "Access denied. Only the project creator can view purchase manager requests.",
        });
      }

      // Fetch rejected purchase manager requests
      const result = await pool.query(
        `SELECT ppm.*, 
              pm.name AS purchase_manager_name,
              pm.email AS purchase_manager_email,
              pm.phone AS purchase_manager_phone
       FROM project_purchase_managers ppm
       JOIN purchase_managers pm ON ppm.purchase_manager_id = pm.id
       WHERE ppm.project_id = $1::uuid AND ppm.status = 'REJECTED'
       ORDER BY ppm.assigned_at DESC`,
        [projectId],
      );

      res.json({ purchase_manager_requests: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- APPROVE/REJECT PURCHASE MANAGER REQUEST ---------------- */
router.patch(
  "/purchase-manager-request/:requestId/decision",
  managerCheck,
  async (req, res) => {
    const managerId = req.user.id;
    const { requestId } = req.params;
    const { decision, projectId, organizationId } = req.body;

    try {
      // CREATOR-ONLY authorization check
      const authCheck = await pool.query(
        `SELECT 1 
         FROM project_managers pm
         JOIN organization_managers om ON om.manager_id = pm.manager_id
         JOIN projects p ON p.id = pm.project_id
         WHERE pm.manager_id = $1::uuid 
           AND pm.project_id = $2::uuid
           AND pm.status = 'ACTIVE'
           AND om.status = 'APPROVED'
           AND p.org_id = om.org_id
           AND p.org_id = $3::uuid
           AND p.created_by = $1::uuid`,
        [managerId, projectId, organizationId],
      );

      if (authCheck.rows.length === 0) {
        return res.status(403).json({
          error:
            "Access denied. Only the project creator can approve/reject purchase manager requests.",
        });
      }

      if (decision !== "APPROVED" && decision !== "REJECTED") {
        return res.status(400).json({
          error: "Invalid decision. Must be 'APPROVED' or 'REJECTED'.",
        });
      }

      // Update the purchase manager request
      const result = await pool.query(
        `UPDATE project_purchase_managers 
         SET status = $1 
         WHERE id = $2::uuid
         RETURNING *`,
        [decision, requestId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Create notification for purchase manager
      try {
        const notificationData = await pool.query(
          `SELECT ppm.purchase_manager_id, p.name as project_name
           FROM project_purchase_managers ppm
           JOIN projects p ON ppm.project_id = p.id
           WHERE ppm.id = $1`,
          [requestId],
        );

        if (notificationData.rows.length > 0) {
          const statusText = decision === "APPROVED" ? "approved" : "rejected";
          await pool.query(
            `INSERT INTO notifications (user_id, user_role, title, message, type, project_id)
             VALUES ($1, 'PURCHASE_MANAGER', $2, $3, 'INFO', $4)`,
            [
              notificationData.rows[0].purchase_manager_id,
              `Project Request ${decision}`,
              `Your request to join project "${notificationData.rows[0].project_name}" has been ${statusText}.`,
              projectId,
            ],
          );
        }
      } catch (notifErr) {
        console.error("Failed to send notification:", notifErr);
      }

      res.json({
        message: `Purchase manager request ${decision.toLowerCase()} successfully.`,
        request: result.rows[0],
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
