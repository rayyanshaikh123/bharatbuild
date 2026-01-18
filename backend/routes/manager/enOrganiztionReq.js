const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

router.get(
  "/organization-engineer-requests",
  managerCheck,
  async (req, res) => {
    const managerId = req.user.id;
    const { organizationId } = req.query;
    try {
      const result = await pool.query(
        `SELECT 
                ose.id, 
                ose.site_engineer_id, 
                ose.status, 
                se.name AS engineer_name,
                se.email AS engineer_email,
                se.phone AS engineer_phone
             FROM organization_site_engineers ose
             JOIN site_engineers se ON ose.site_engineer_id = se.id
             JOIN organization_managers om ON ose.org_id = om.org_id
             WHERE om.manager_id = $1 
                AND om.status = 'APPROVED' 
                AND ose.org_id = $2 
                AND ose.status = 'PENDING'`,
        [managerId, organizationId],
      );
      res.json({ requests: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);
