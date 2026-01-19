const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

// Check if manager is approved in the organization
async function managerprojStatusCheck(managerId, projectId) {
  const statusResult = await pool.query(
    `SELECT count(*) FROM project_managers
     WHERE manager_id = $1 AND project_id = $2 AND status = 'ACTIVE'`,
    [managerId, projectId],
  );
  return parseInt(statusResult.rows[0].count) > 0;
}
router.get("/engineer-requests", managerCheck, async (req, res) => {
  const managerId = req.user.id;
  const { projectId } = req.query;
  try {
    // Check if manager is approved in the organization for the project
    const isApproved = await managerprojStatusCheck(managerId, projectId);
    if (!isApproved) {
      return res
        .status(403)
        .json({ error: "Access denied. Not an approved manager." });
    }

    const result = await pool.query(
      `select 
                pse.id, 
                pse.site_engineer_id, 
                pse.status, 
                se.name AS engineer_name,
                se.email AS engineer_email,
                se.phone AS engineer_phone
             FROM project_site_engineers pse
             JOIN site_engineers se ON pse.site_engineer_id = se.id
             WHERE pse.project_id = $1 AND pse.status = 'PENDING'`,
      [projectId],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/engineer-accepted-requests", managerCheck, async (req, res) => {
  const managerId = req.user.id;
  const { projectId } = req.query;
  try {
    // Check if manager is approved in the organization for the project
    const isApproved = await managerprojStatusCheck(managerId, projectId);
    if (!isApproved) {
      return res
        .status(403)
        .json({ error: "Access denied. Not an approved manager." });
    }

    const result = await pool.query(
      `select 
                pse.id, 
                pse.site_engineer_id, 
                pse.status, 
                se.name AS engineer_name,
                se.email AS engineer_email,
                se.phone AS engineer_phone
             FROM project_site_engineers pse
             JOIN site_engineers se ON pse.site_engineer_id = se.id
             WHERE pse.project_id = $1 AND pse.status = 'APPROVED'`,
      [projectId],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/engineer-rejected-requests", managerCheck, async (req, res) => {
  const managerId = req.user.id;
  const { projectId } = req.query;
  try {
    // Check if manager is approved in the organization for the project
    const isApproved = await managerprojStatusCheck(managerId, projectId);
    if (!isApproved) {
      return res
        .status(403)
        .json({ error: "Access denied. Not an approved manager." });
    }

    const result = await pool.query(
      `select 
                pse.id, 
                pse.site_engineer_id, 
                pse.status, 
                se.name AS engineer_name,
                se.email AS engineer_email,
                se.phone AS engineer_phone
             FROM project_site_engineers pse
             JOIN site_engineers se ON pse.site_engineer_id = se.id
             WHERE pse.project_id = $1 AND pse.status = 'REJECTED'`,
      [projectId],
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put(
  "/engineer-requests/:requestId/approve",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { requestId } = req.params;

      // Get the project ID for the request
      const reqResult = await pool.query(
        "SELECT project_id FROM project_site_engineers WHERE id = $1",
        [requestId],
      );
      if (reqResult.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }
      const projectId = reqResult.rows[0].project_id;

      // Check if manager is approved in the organization for the project
      const isApproved = await managerprojStatusCheck(managerId, projectId);
      if (!isApproved) {
        return res
          .status(403)
          .json({ error: "Access denied. Not an approved manager." });
      }

      // Update the request status to APPROVED
      await pool.query(
        "UPDATE project_site_engineers SET status = 'APPROVED' WHERE id = $1",
        [requestId],
      );

      // Send email notification to site engineer
      try {
        const notificationData = await pool.query(
          `SELECT se.email, se.name, p.name as project_name
         FROM project_site_engineers pse
         JOIN site_engineers se ON pse.site_engineer_id = se.id
         JOIN projects p ON pse.project_id = p.id
         WHERE pse.id = $1`,
          [requestId],
        );

        if (notificationData.rows.length > 0) {
          const { sendNotificationEmail } = require("../../util/mailer");
          await sendNotificationEmail({
            to: notificationData.rows[0].email,
            subject: "Project Request APPROVED",
            message: `Hello ${notificationData.rows[0].name},\n\nYour request to join project "${notificationData.rows[0].project_name}" has been approved.\n\nBest regards,\nBharat Build Team`,
          });
        }
      } catch (emailErr) {
        console.error(
          "Failed to send engineer project approval email:",
          emailErr,
        );
      }

      res.json({ message: "Engineer request approved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

router.put(
  "/engineer-requests/:requestId/reject",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { requestId } = req.params;

      // Get the project ID for the request
      const reqResult = await pool.query(
        "SELECT project_id FROM project_site_engineers WHERE id = $1",
        [requestId],
      );
      if (reqResult.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }
      const projectId = reqResult.rows[0].project_id;

      // Check if manager is approved in the organization for the project
      const isApproved = await managerprojStatusCheck(managerId, projectId);
      if (!isApproved) {
        return res
          .status(403)
          .json({ error: "Access denied. Not an approved manager." });
      }

      // Update the request status to REJECTED
      await pool.query(
        "UPDATE project_site_engineers SET status = 'REJECTED' WHERE id = $1",
        [requestId],
      );

      // Send email notification to site engineer
      try {
        const notificationData = await pool.query(
          `SELECT se.email, se.name, p.name as project_name
         FROM project_site_engineers pse
         JOIN site_engineers se ON pse.site_engineer_id = se.id
         JOIN projects p ON pse.project_id = p.id
         WHERE pse.id = $1`,
          [requestId],
        );

        if (notificationData.rows.length > 0) {
          const { sendNotificationEmail } = require("../../util/mailer");
          await sendNotificationEmail({
            to: notificationData.rows[0].email,
            subject: "Project Request REJECTED",
            message: `Hello ${notificationData.rows[0].name},\n\nYour request to join project "${notificationData.rows[0].project_name}" has been rejected.\n\nBest regards,\nBharat Build Team`,
          });
        }
      } catch (emailErr) {
        console.error(
          "Failed to send engineer project rejection email:",
          emailErr,
        );
      }

      res.json({ message: "Engineer request rejected successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);
module.exports = router;
