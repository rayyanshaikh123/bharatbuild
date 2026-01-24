const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

/* ---------------- GET GRNs BY PROJECT ---------------- */
router.get("/grns", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: "projectId query parameter is required",
      });
    }

    // Verify manager has access to this project (ACTIVE or project creator)
    const accessCheck = await pool.query(
      `SELECT pm.id, p.created_by 
       FROM project_managers pm
       JOIN projects p ON pm.project_id = p.id
       WHERE pm.manager_id = $1 AND pm.project_id = $2 AND pm.status = 'ACTIVE'`,
      [managerId, projectId],
    );

    const isCreator = await pool.query(
      `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
      [projectId, managerId],
    );

    if (accessCheck.rows.length === 0 && isCreator.rows.length === 0) {
      return res.status(403).json({
        error: "You do not have access to this project",
      });
    }

    // Get GRNs for this project
    const result = await pool.query(
      `SELECT g.*, 
              p.name AS project_name,
              po.po_number,
              po.vendor_name,
              mr.title AS material_request_title,
              se.name AS engineer_name,
              m.name AS verified_by_name
       FROM grns g
       JOIN projects p ON g.project_id = p.id
       JOIN purchase_orders po ON g.purchase_order_id = po.id
       JOIN material_requests mr ON g.material_request_id = mr.id
       JOIN site_engineers se ON g.site_engineer_id = se.id
       LEFT JOIN managers m ON g.verified_by = m.id
       WHERE g.project_id = $1
       ORDER BY g.created_at DESC`,
      [projectId],
    );

    res.json({ grns: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- VERIFY GRN ---------------- */
router.patch("/grns/:grnId/verify", managerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const managerId = req.user.id;
    const { grnId } = req.params;
    const { remarks } = req.body;

    await client.query("BEGIN");

    // Get GRN details
    const grnResult = await client.query(
      `SELECT g.*, p.org_id 
       FROM grns g
       JOIN projects p ON g.project_id = p.id
       WHERE g.id = $1`,
      [grnId],
    );

    if (grnResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "GRN not found",
      });
    }

    const grn = grnResult.rows[0];

    // Verify manager has access to the project (ACTIVE or project creator)
    const accessCheck = await client.query(
      `SELECT pm.id, p.created_by 
       FROM project_managers pm
       JOIN projects p ON pm.project_id = p.id
       WHERE pm.manager_id = $1 AND pm.project_id = $2 AND pm.status = 'ACTIVE'`,
      [managerId, grn.project_id],
    );

    const isCreator = await client.query(
      `SELECT id FROM projects WHERE id = $1 AND created_by = $2`,
      [grn.project_id, managerId],
    );

    if (accessCheck.rows.length === 0 && isCreator.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "You do not have access to verify GRNs for this project",
      });
    }

    // Check if already verified
    if (grn.status === "VERIFIED") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "GRN is already verified",
      });
    }

    // Update GRN status to VERIFIED
    const updateResult = await client.query(
      `UPDATE grns 
       SET status = 'VERIFIED', 
           verified_by = $1, 
           verified_at = NOW(),
           remarks = COALESCE($2, remarks)
       WHERE id = $3
       RETURNING *`,
      [managerId, remarks, grnId],
    );

    const updatedGrn = updateResult.rows[0];

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs 
       (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, organization_id, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "GRN",
        grnId,
        "VERIFIED",
        "MANAGER",
        managerId,
        grn.project_id,
        grn.org_id,
        "PROCUREMENT",
      ],
    );

    // Notify site engineer who created the GRN
    await client.query(
      `INSERT INTO notifications 
       (user_id, user_role, title, message, type, project_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        grn.site_engineer_id,
        "SITE_ENGINEER",
        "GRN Verified",
        "Your Goods Receipt Note has been verified by the project manager",
        "INFO",
        grn.project_id,
        JSON.stringify({ grn_id: grnId }),
      ],
    );

    await client.query("COMMIT");

    res.json({
      message: "GRN verified successfully",
      grn: updatedGrn,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
