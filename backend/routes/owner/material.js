const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");

// Check if owner owns the organization of the project
async function ownerOwnsProject(ownerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM projects p
     JOIN organizations o ON p.org_id = o.id
     WHERE p.id = $1 AND o.owner_id = $2`,
    [projectId, ownerId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- GET ALL MATERIAL REQUESTS (READ-ONLY) ---------------- */
router.get("/requests", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { project_id, status } = req.query;

    let query = `SELECT mr.*, p.name as project_name, e.name as engineer_name
                     FROM material_requests mr
                     JOIN projects p ON mr.project_id = p.id
                     JOIN organizations o ON p.org_id = o.id
                     JOIN site_engineers e ON mr.site_engineer_id = e.id
                     WHERE o.owner_id = $1`;

    let params = [ownerId];

    if (project_id) {
      query += " AND mr.project_id = $2";
      params.push(project_id);
    }

    if (status) {
      query += ` AND mr.status = $${params.length + 1}`;
      params.push(status);
    }

    query += " ORDER BY mr.created_at DESC";
    const result = await pool.query(query, params);
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET ALL MATERIAL BILLS (READ-ONLY) ---------------- */
router.get("/bills", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { project_id, status } = req.query;

    let query = `SELECT mb.*, p.name as project_name, e.name as engineer_name
                     FROM material_bills mb
                     JOIN projects p ON mb.project_id = p.id
                     JOIN organizations o ON p.org_id = o.id
                     JOIN site_engineers e ON mb.uploaded_by = e.id
                     WHERE o.owner_id = $1`;

    let params = [ownerId];

    if (project_id) {
      query += " AND mb.project_id = $2";
      params.push(project_id);
    }

    if (status) {
      query += ` AND mb.status = $${params.length + 1}`;
      params.push(status);
    }

    query += " ORDER BY mb.created_at DESC";
    const result = await pool.query(query, params);
    res.json({ bills: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- EDIT ORPHAN BILL (OWNER ONLY) ---------------- */
router.patch("/bills/:id", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const {
      vendor_name,
      vendor_contact,
      bill_number,
      bill_amount,
      gst_percentage,
      gst_amount,
      total_amount,
      category,
      bill_image,
      bill_image_mime,
    } = req.body;

    // Verify owner owns the organization and bill is orphan
    const checkResult = await pool.query(
      `SELECT mb.* 
             FROM material_bills mb
             JOIN projects p ON mb.project_id = p.id
             JOIN organizations o ON p.org_id = o.id
             WHERE mb.id = $1 AND o.owner_id = $2`,
      [id, ownerId],
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Bill not found or access denied" });
    }

    const beforeState = checkResult.rows[0];
    const { material_request_id, project_id } = beforeState;

    // Only orphan bills can be edited by owner
    if (material_request_id !== null) {
      return res.status(400).json({
        error:
          "Only orphan bills (without material request) can be edited by owner",
      });
    }

    const result = await pool.query(
      `UPDATE material_bills 
             SET vendor_name = $1, vendor_contact = $2, bill_number = $3, 
                 bill_amount = $4, gst_percentage = $5, gst_amount = $6, 
                 total_amount = $7, category = $8, bill_image = $9, bill_image_mime = $10
             WHERE id = $11 RETURNING *`,
      [
        vendor_name,
        vendor_contact,
        bill_number,
        bill_amount,
        gst_percentage,
        gst_amount,
        total_amount,
        category,
        bill_image || null,
        bill_image_mime || null,
        id,
      ],
    );

    const afterState = result.rows[0];

    // Audit log
    const organizationId = await getOrganizationIdFromProject(project_id);
    await logAudit({
      entityType: "MATERIAL_BILL",
      entityId: id,
      category: "MATERIAL_BILL",
      action: "UPDATE",
      before: beforeState,
      after: afterState,
      user: req.user,
      projectId: project_id,
      organizationId,
    });

    res.json({ bill: afterState });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE ORPHAN BILL (OWNER ONLY) ---------------- */
router.delete("/bills/:id", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;

    // Verify owner owns the organization and bill is orphan
    const checkResult = await pool.query(
      `SELECT mb.* 
             FROM material_bills mb
             JOIN projects p ON mb.project_id = p.id
             JOIN organizations o ON p.org_id = o.id
             WHERE mb.id = $1 AND o.owner_id = $2`,
      [id, ownerId],
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Bill not found or access denied" });
    }

    const beforeState = checkResult.rows[0];
    const { material_request_id, project_id } = beforeState;

    // Only orphan bills can be deleted by owner
    if (material_request_id !== null) {
      return res.status(400).json({
        error:
          "Only orphan bills (without material request) can be deleted by owner",
      });
    }

    await pool.query(`DELETE FROM material_bills WHERE id = $1`, [id]);

    // Audit log
    const organizationId = await getOrganizationIdFromProject(project_id);
    await logAudit({
      entityType: "MATERIAL_BILL",
      entityId: id,
      category: "MATERIAL_BILL",
      action: "DELETE",
      before: beforeState,
      after: null,
      user: req.user,
      projectId: project_id,
      organizationId,
    });

    res.json({ message: "Orphan bill deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
