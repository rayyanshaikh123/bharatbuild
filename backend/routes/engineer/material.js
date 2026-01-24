const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");
const { verifyEngineerAccess } = require("../../util/engineerPermissions");
const {
  validateUserInsideProjectGeofence,
} = require("../../util/geofenceValidator");

/* ---------------- CREATE MATERIAL REQUEST ---------------- */
router.post("/request", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const {
      project_id,
      dpr_id,
      title,
      category,
      quantity,
      description,
      request_image,
      request_image_mime,
      latitude,
      longitude,
    } = req.body;

    const isActive = await verifyEngineerAccess(engineerId, project_id);
    if (!isActive.allowed)
      return res.status(403).json({ error: isActive.error });

    // Geo-fence validation (if coordinates provided)
    if (latitude !== undefined && longitude !== undefined) {
      try {
        await validateUserInsideProjectGeofence({
          projectId: project_id,
          userId: engineerId,
          userRole: "SITE_ENGINEER",
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        });
      } catch (err) {
        if (err.code === "OUTSIDE_PROJECT_GEOFENCE") {
          return res.status(403).json({
            error: err.code,
            message: err.message,
          });
        }
        throw err;
      }
    }

    // Check standalone request limit if no DPR linked
    if (!dpr_id) {
      const STANDALONE_REQUEST_MONTHLY_LIMIT = 5;
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM material_requests 
                 WHERE site_engineer_id = $1 
                   AND dpr_id IS NULL 
                   AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
                   AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())`,
        [engineerId],
      );

      if (
        parseInt(countResult.rows[0].count) >= STANDALONE_REQUEST_MONTHLY_LIMIT
      ) {
        return res.status(400).json({
          error: "Monthly limit for standalone requests exceeded",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO material_requests (project_id, site_engineer_id, dpr_id, title, category, quantity, description, request_image, request_image_mime)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        project_id,
        engineerId,
        dpr_id || null,
        title,
        category,
        quantity,
        description,
        request_image || null,
        request_image_mime || null,
      ],
    );

    // Send email notification if standalone request
    if (!dpr_id) {
      try {
        const { sendNotificationEmail } = require("../../util/mailer");

        // Get owner email
        const ownerResult = await pool.query(
          `SELECT o.email, o.name as owner_name, p.name as project_name, se.name as engineer_name
                     FROM projects p
                     JOIN organizations org ON p.org_id = org.id
                     JOIN owners o ON org.owner_id = o.id
                     JOIN site_engineers se ON se.id = $1
                     WHERE p.id = $2`,
          [engineerId, project_id],
        );

        if (ownerResult.rows.length > 0) {
          const { email, owner_name, project_name, engineer_name } =
            ownerResult.rows[0];
          await sendNotificationEmail({
            to: email,
            subject: "Material Request Without DPR",
            message: `
                            <h2>Material Request Created Without DPR</h2>
                            <p>Dear ${owner_name},</p>
                            <p>A material request was created without linking to a DPR:</p>
                            <ul>
                                <li><strong>Project:</strong> ${project_name}</li>
                                <li><strong>Engineer:</strong> ${engineer_name}</li>
                                <li><strong>Category:</strong> ${category}</li>
                                <li><strong>Title:</strong> ${title}</li>
                                <li><strong>Quantity:</strong> ${quantity}</li>
                            </ul>
                            <p>Please review this request in the system.</p>
                        `,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send email notification:", emailErr);
        // Don't block the response
      }
    }

    res.status(201).json({ request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET MY MATERIAL REQUESTS ---------------- */
router.get("/requests", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { project_id } = req.query;

    let query = `SELECT mr.*, p.name as project_name 
                     FROM material_requests mr 
                     JOIN projects p ON mr.project_id = p.id 
                     WHERE mr.site_engineer_id = $1`;
    let params = [engineerId];

    if (project_id) {
      query += " AND mr.project_id = $2";
      params.push(project_id);
    }

    query += " ORDER BY mr.created_at DESC";
    const result = await pool.query(query, params);
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- EDIT MATERIAL REQUEST ---------------- */
router.patch("/requests/:id", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { id } = req.params;
    const {
      title,
      category,
      quantity,
      description,
      request_image,
      request_image_mime,
    } = req.body;

    // Verify engineer owns the request and it's PENDING
    const checkResult = await pool.query(
      `SELECT * FROM material_requests 
             WHERE id = $1 AND site_engineer_id = $2`,
      [id, engineerId],
    );

    if (checkResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Request not found or access denied" });
    }

    const beforeState = checkResult.rows[0];
    const { project_id, status } = beforeState;

    if (status !== "PENDING") {
      return res
        .status(400)
        .json({ error: "Can only edit pending material requests" });
    }

    // Verify engineer is still ACTIVE in project
    const access = await verifyEngineerAccess(engineerId, project_id);
    if (!access.allowed) {
      return res.status(403).json({
        error: access.error,
      });
    }

    const result = await pool.query(
      `UPDATE material_requests 
             SET title = $1, category = $2, quantity = $3, description = $4, 
                 request_image = $5, request_image_mime = $6
             WHERE id = $7 RETURNING *`,
      [
        title,
        category,
        quantity,
        description,
        request_image || null,
        request_image_mime || null,
        id,
      ],
    );

    const afterState = result.rows[0];

    // Audit log
    const organizationId = await getOrganizationIdFromProject(project_id);
    await logAudit({
      entityType: "MATERIAL_REQUEST",
      entityId: id,
      category: "MATERIAL_REQUEST",
      action: "UPDATE",
      before: beforeState,
      after: afterState,
      user: req.user,
      projectId: project_id,
      organizationId,
    });

    res.json({ request: afterState });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE MATERIAL REQUEST ---------------- */
router.delete("/requests/:id", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { id } = req.params;

    // Verify engineer owns the request and it's PENDING
    const checkResult = await pool.query(
      `SELECT * FROM material_requests 
             WHERE id = $1 AND site_engineer_id = $2`,
      [id, engineerId],
    );

    if (checkResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Request not found or access denied" });
    }

    const beforeState = checkResult.rows[0];
    const { project_id, status } = beforeState;

    if (status !== "PENDING") {
      return res
        .status(400)
        .json({ error: "Can only delete pending material requests" });
    }

    // Verify engineer is still ACTIVE in project
    const access = await verifyEngineerAccess(engineerId, project_id);
    if (!access.allowed) {
      return res.status(403).json({
        error: access.error,
      });
    }

    await pool.query(`DELETE FROM material_requests WHERE id = $1`, [id]);

    // Audit log
    const organizationId = await getOrganizationIdFromProject(project_id);
    await logAudit({
      entityType: "MATERIAL_REQUEST",
      entityId: id,
      category: "MATERIAL_REQUEST",
      action: "DELETE",
      before: beforeState,
      after: null,
      user: req.user,
      projectId: project_id,
      organizationId,
    });

    res.json({ message: "Material request deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- UPLOAD MATERIAL BILL ---------------- */
router.post("/upload-bill", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const {
      material_request_id,
      project_id,
      vendor_name,
      vendor_contact,
      bill_number,
      bill_amount,
      gst_percentage,
      gst_amount,
      total_amount,
      bill_image,
      bill_image_mime,
      category,
      latitude,
      longitude,
    } = req.body;

    const isActive = await verifyEngineerAccess(engineerId, project_id);
    if (!isActive.allowed)
      return res.status(403).json({ error: isActive.error });

    // Geo-fence validation (if coordinates provided)
    if (latitude !== undefined && longitude !== undefined) {
      try {
        await validateUserInsideProjectGeofence({
          projectId: project_id,
          userId: engineerId,
          userRole: "SITE_ENGINEER",
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        });
      } catch (err) {
        if (err.code === "OUTSIDE_PROJECT_GEOFENCE") {
          return res.status(403).json({
            error: err.code,
            message: err.message,
          });
        }
        throw err;
      }
    }

    // Validate: if material_request_id provided, it must be APPROVED
    if (material_request_id) {
      const requestCheck = await pool.query(
        `SELECT status FROM material_requests WHERE id = $1`,
        [material_request_id],
      );

      if (requestCheck.rows.length === 0) {
        return res.status(404).json({ error: "Material request not found" });
      }

      if (requestCheck.rows[0].status !== "APPROVED") {
        return res.status(400).json({
          error: "Can only upload bill for approved material request",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO material_bills (material_request_id, project_id, vendor_name, vendor_contact, bill_number, 
             bill_amount, gst_percentage, gst_amount, total_amount, bill_image, bill_image_mime, category, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        material_request_id || null,
        project_id,
        vendor_name,
        vendor_contact,
        bill_number,
        bill_amount,
        gst_percentage,
        gst_amount,
        total_amount,
        bill_image || null,
        bill_image_mime || null,
        category,
        engineerId,
      ],
    );

    // Send email notification if orphan bill (no material request)
    if (!material_request_id) {
      try {
        const { sendNotificationEmail } = require("../../util/mailer");

        // Get owner email
        const ownerResult = await pool.query(
          `SELECT o.email, o.name as owner_name, p.name as project_name, se.name as engineer_name
                     FROM projects p
                     JOIN organizations org ON p.org_id = org.id
                     JOIN owners o ON org.owner_id = o.id
                     JOIN site_engineers se ON se.id = $1
                     WHERE p.id = $2`,
          [engineerId, project_id],
        );

        if (ownerResult.rows.length > 0) {
          const { email, owner_name, project_name, engineer_name } =
            ownerResult.rows[0];
          await sendNotificationEmail({
            to: email,
            subject: "Material Bill Without Request",
            message: `
                            <h2>Material Bill Uploaded Without Request</h2>
                            <p>Dear ${owner_name},</p>
                            <p>A material bill was uploaded without linking to a material request:</p>
                            <ul>
                                <li><strong>Project:</strong> ${project_name}</li>
                                <li><strong>Engineer:</strong> ${engineer_name}</li>
                                <li><strong>Vendor:</strong> ${vendor_name}</li>
                                <li><strong>Bill Number:</strong> ${bill_number}</li>
                                <li><strong>Total Amount:</strong> ₹${total_amount}</li>
                            </ul>
                            <p>Please review this bill in the system.</p>
                        `,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send email notification:", emailErr);
        // Don't block the response
      }
    }

    res.status(201).json({ bill: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET MY MATERIAL BILLS ---------------- */
router.get("/bills", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { project_id } = req.query;

    let query = `SELECT mb.*, p.name as project_name 
                     FROM material_bills mb 
                     JOIN projects p ON mb.project_id = p.id 
                     WHERE mb.uploaded_by = $1`;
    let params = [engineerId];

    if (project_id) {
      query += " AND mb.project_id = $2";
      params.push(project_id);
    }

    query += " ORDER BY mb.created_at DESC";
    const result = await pool.query(query, params);
    res.json({ bills: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- EDIT MATERIAL BILL ---------------- */
router.patch("/bills/:id", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
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

    // Verify engineer uploaded the bill and it's PENDING
    const checkResult = await pool.query(
      `SELECT * FROM material_bills 
             WHERE id = $1 AND uploaded_by = $2`,
      [id, engineerId],
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Bill not found or access denied" });
    }

    const beforeState = checkResult.rows[0];
    const { project_id, status } = beforeState;

    if (status !== "PENDING") {
      return res
        .status(400)
        .json({ error: "Can only edit pending material bills" });
    }

    // Verify engineer is still ACTIVE in project
    const access = await verifyEngineerAccess(engineerId, project_id);
    if (!access.allowed) {
      return res.status(403).json({
        error: access.error,
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

/* ---------------- DELETE MATERIAL BILL ---------------- */
router.delete("/bills/:id", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { id } = req.params;

    // Verify engineer uploaded the bill and it's PENDING
    const checkResult = await pool.query(
      `SELECT * FROM material_bills 
             WHERE id = $1 AND uploaded_by = $2`,
      [id, engineerId],
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Bill not found or access denied" });
    }

    const beforeState = checkResult.rows[0];
    const { project_id, status } = beforeState;

    if (status !== "PENDING") {
      return res
        .status(400)
        .json({ error: "Can only delete pending material bills" });
    }

    // Verify engineer is still ACTIVE in project
    const access = await verifyEngineerAccess(engineerId, project_id);
    if (!access.allowed) {
      return res.status(403).json({
        error: access.error,
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

    res.json({ message: "Material bill deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
