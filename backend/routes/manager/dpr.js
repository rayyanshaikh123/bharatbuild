const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");

// Check if manager is ACTIVE in the project
async function managerProjectStatusCheck(managerId, projectId) {
  const statusResult = await pool.query(
    `SELECT count(*) FROM project_managers
     WHERE manager_id = $1 AND project_id = $2 AND status = 'ACTIVE'`,
    [managerId, projectId],
  );
  return parseInt(statusResult.rows[0].count) > 0;
}

/* ---------------- GET ALL DPRs FOR PROJECT ---------------- */
router.get("/projects/:projectId/dprs", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { projectId } = req.params;

    // Check if manager is ACTIVE in project
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    if (!isActive) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    const result = await pool.query(
      `SELECT d.*, 
              se.name AS engineer_name, 
              se.phone AS engineer_phone,
              p.start_date AS plan_start_date,
              p.end_date AS plan_end_date,
              pi.task_name AS plan_item_task_name,
              pi.period_start AS plan_item_period_start,
              pi.period_end AS plan_item_period_end
       FROM dprs d
       JOIN site_engineers se ON d.site_engineer_id = se.id
       LEFT JOIN plans p ON d.plan_id = p.id
       LEFT JOIN plan_items pi ON d.plan_item_id = pi.id
       WHERE d.project_id = $1
       ORDER BY d.report_date DESC, d.submitted_at DESC`,
      [projectId],
    );

    res.json({ dprs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- REVIEW DPR ---------------- */
router.patch("/dprs/:dprId/review", managerCheck, async (req, res) => {
  const client = await pool.connect();

  try {
    const managerId = req.user.id;
    const { dprId } = req.params;
    const { status, remarks, material_usage } = req.body;

    // Validate status
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be APPROVED or REJECTED.",
      });
    }

    await client.query("BEGIN");

    // Get DPR details
    const dprCheck = await client.query(`SELECT * FROM dprs WHERE id = $1`, [
      dprId,
    ]);

    if (dprCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "DPR not found" });
    }

    const dpr = dprCheck.rows[0];
    const projectId = dpr.project_id;

    // Check if manager is ACTIVE in project
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    if (!isActive) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    // NEW: Use stored material_usage from DPR if not provided in request
    let finalMaterialUsage = material_usage;

    if (status === "APPROVED") {
      // If no material_usage in request, fetch from DPR
      if (!finalMaterialUsage || finalMaterialUsage.length === 0) {
        finalMaterialUsage = dpr.material_usage || [];
      }

      // If manager provided additional materials, merge them
      if (
        material_usage &&
        material_usage.length > 0 &&
        dpr.material_usage &&
        dpr.material_usage.length > 0
      ) {
        // Combine both arrays (manager can add additional materials)
        finalMaterialUsage = [...dpr.material_usage, ...material_usage];
      }
    }

    // If APPROVED and material_usage exists, validate and deduct stock
    if (
      status === "APPROVED" &&
      finalMaterialUsage &&
      Array.isArray(finalMaterialUsage) &&
      finalMaterialUsage.length > 0
    ) {
      // Validate stock availability for each material
      for (const usage of finalMaterialUsage) {
        const { material_name, unit, quantity_used } = usage;

        if (!material_name || !unit || !quantity_used || quantity_used <= 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: `Invalid material usage data for ${material_name || "unknown material"}`,
          });
        }

        // Check current stock
        const stockCheck = await client.query(
          `SELECT available_quantity FROM project_material_stock
           WHERE project_id = $1 AND material_name = $2 AND unit = $3`,
          [projectId, material_name, unit],
        );

        const availableQty =
          stockCheck.rows.length > 0
            ? parseFloat(stockCheck.rows[0].available_quantity)
            : 0;

        if (availableQty < parseFloat(quantity_used)) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: `Insufficient stock for ${material_name}. Available: ${availableQty} ${unit}, Required: ${quantity_used} ${unit}`,
          });
        }
      }

      // All stock validations passed - proceed with consumption
      for (const usage of finalMaterialUsage) {
        const { material_name, unit, quantity_used } = usage;

        // Insert into material_consumption_records
        await client.query(
          `INSERT INTO material_consumption_records
           (project_id, dpr_id, material_name, unit, quantity_used, recorded_by, recorded_by_role)
           VALUES ($1, $2, $3, $4, $5, $6, 'MANAGER')`,
          [
            projectId,
            dprId,
            material_name,
            unit,
            parseFloat(quantity_used),
            managerId,
          ],
        );

        // Deduct from project_material_stock
        await client.query(
          `UPDATE project_material_stock
           SET available_quantity = available_quantity - $1,
               last_updated_at = NOW()
           WHERE project_id = $2 AND material_name = $3 AND unit = $4`,
          [parseFloat(quantity_used), projectId, material_name, unit],
        );

        // Insert OUT entry in material_ledger for audit
        await client.query(
          `INSERT INTO material_ledger
           (project_id, dpr_id, material_name, unit, quantity, movement_type, source, recorded_by_role, recorded_by, remarks)
           VALUES ($1, $2, $3, $4, $5, 'OUT', 'AI_DPR', 'MANAGER', $6, $7)`,
          [
            projectId,
            dprId,
            material_name,
            unit,
            parseFloat(quantity_used),
            managerId,
            `DPR consumption - Approved by Manager`,
          ],
        );
      }
    }

    // Update DPR status
    const result = await client.query(
      `UPDATE dprs SET 
       status = $1, 
       remarks = $2,
       reviewed_by = $3,
       reviewed_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, remarks, managerId, dprId],
    );

    const updatedDpr = result.rows[0];

    await client.query("COMMIT");

    // Create notification for site engineer
    try {
      const {
        createNotification,
      } = require("../../services/notification.service");
      await createNotification({
        userId: updatedDpr.site_engineer_id,
        userRole: "SITE_ENGINEER",
        title: `DPR ${status}`,
        message: `Your DPR for ${new Date(updatedDpr.report_date).toLocaleDateString()} has been ${status.toLowerCase()}.`,
        type: status === "APPROVED" ? "SUCCESS" : "ERROR",
        projectId: updatedDpr.project_id,
      });
    } catch (notifErr) {
      console.error("Failed to create DPR review notification:", notifErr);
    }

    // Check for orphan DPR and send owner alert if approved
    if (status === "APPROVED") {
      try {
        const {
          checkAndAlertOrphanDPR,
        } = require("../../services/ownerAlert.service");
        await checkAndAlertOrphanDPR(updatedDpr);
      } catch (alertErr) {
        console.error("Failed to check orphan DPR alert:", alertErr);
        // Don't block the response
      }
    }

    res.json({
      dpr: updatedDpr,
      material_consumed: material_usage || [],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GET PENDING DPRs ---------------- */
router.get(
  "/projects/:projectId/dprs/pending",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId } = req.params;

      const isActive = await managerProjectStatusCheck(managerId, projectId);
      if (!isActive) {
        return res.status(403).json({
          error: "Access denied. Not an active manager in the project.",
        });
      }

      const result = await pool.query(
        `SELECT d.*, 
              se.name AS engineer_name, 
              se.phone AS engineer_phone,
              p.start_date AS plan_start_date,
              p.end_date AS plan_end_date,
              pi.task_name AS plan_item_task_name,
              pi.period_start AS plan_item_period_start,
              pi.period_end AS plan_item_period_end
       FROM dprs d
       JOIN site_engineers se ON d.site_engineer_id = se.id
       LEFT JOIN plans p ON d.plan_id = p.id
       LEFT JOIN plan_items pi ON d.plan_item_id = pi.id
       WHERE d.project_id = $1 AND d.status = 'PENDING'
       ORDER BY d.report_date DESC, d.submitted_at DESC`,
        [projectId],
      );

      res.json({ dprs: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET APPROVED DPRs ---------------- */
router.get(
  "/projects/:projectId/dprs/approved",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId } = req.params;

      const isActive = await managerProjectStatusCheck(managerId, projectId);
      if (!isActive) {
        return res.status(403).json({
          error: "Access denied. Not an active manager in the project.",
        });
      }

      const result = await pool.query(
        `SELECT d.*, 
              se.name AS engineer_name, 
              se.phone AS engineer_phone,
              p.start_date AS plan_start_date,
              p.end_date AS plan_end_date,
              pi.task_name AS plan_item_task_name,
              pi.period_start AS plan_item_period_start,
              pi.period_end AS plan_item_period_end
       FROM dprs d
       JOIN site_engineers se ON d.site_engineer_id = se.id
       LEFT JOIN plans p ON d.plan_id = p.id
       LEFT JOIN plan_items pi ON d.plan_item_id = pi.id
       WHERE d.project_id = $1 AND d.status = 'APPROVED'
       ORDER BY d.report_date DESC, d.submitted_at DESC`,
        [projectId],
      );

      res.json({ dprs: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET REJECTED DPRs ---------------- */
router.get(
  "/projects/:projectId/dprs/rejected",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId } = req.params;

      const isActive = await managerProjectStatusCheck(managerId, projectId);
      if (!isActive) {
        return res.status(403).json({
          error: "Access denied. Not an active manager in the project.",
        });
      }

      const result = await pool.query(
        `SELECT d.*, 
              se.name AS engineer_name, 
              se.phone AS engineer_phone,
              p.start_date AS plan_start_date,
              p.end_date AS plan_end_date,
              pi.task_name AS plan_item_task_name,
              pi.period_start AS plan_item_period_start,
              pi.period_end AS plan_item_period_end
       FROM dprs d
       JOIN site_engineers se ON d.site_engineer_id = se.id
       LEFT JOIN plans p ON d.plan_id = p.id
       LEFT JOIN plan_items pi ON d.plan_item_id = pi.id
       WHERE d.project_id = $1 AND d.status = 'REJECTED'
       ORDER BY d.report_date DESC, d.submitted_at DESC`,
        [projectId],
      );

      res.json({ dprs: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET SINGLE DPR ---------------- */
router.get("/dprs/:dprId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { dprId } = req.params;

    // Get DPR with project_id
    const dprCheck = await pool.query(
      `SELECT project_id FROM dprs WHERE id = $1`,
      [dprId],
    );

    if (dprCheck.rows.length === 0) {
      return res.status(404).json({ error: "DPR not found" });
    }

    const projectId = dprCheck.rows[0].project_id;

    // Check if manager is ACTIVE in project
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    if (!isActive) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    const result = await pool.query(
      `SELECT d.*, 
              se.name AS engineer_name, 
              se.phone AS engineer_phone,
              pr.name AS project_name,
              p.start_date AS plan_start_date,
              p.end_date AS plan_end_date,
              pi.task_name AS plan_item_task_name,
              pi.period_start AS plan_item_period_start,
              pi.period_end AS plan_item_period_end
       FROM dprs d
       JOIN site_engineers se ON d.site_engineer_id = se.id
       JOIN projects pr ON d.project_id = pr.id
       LEFT JOIN plans p ON d.plan_id = p.id
       LEFT JOIN plan_items pi ON d.plan_item_id = pi.id
       WHERE d.id = $1`,
      [dprId],
    );

    res.json({ dpr: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE DPR (ONLY IF NOT APPROVED) ---------------- */
router.delete("/dprs/:dprId", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { dprId } = req.params;

    // Get DPR with all details
    const dprCheck = await pool.query(`SELECT * FROM dprs WHERE id = $1`, [
      dprId,
    ]);

    if (dprCheck.rows.length === 0) {
      return res.status(404).json({ error: "DPR not found" });
    }

    const beforeState = dprCheck.rows[0];
    const { project_id: projectId, status } = beforeState;

    // Check if manager is ACTIVE in project
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    if (!isActive) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    // Cannot delete APPROVED DPRs
    if (status === "APPROVED") {
      return res.status(400).json({
        error: "Cannot delete approved DPR.",
      });
    }

    await pool.query(`DELETE FROM dprs WHERE id = $1`, [dprId]);

    // Audit log
    const organizationId = await getOrganizationIdFromProject(projectId);
    await logAudit({
      entityType: "DPR",
      entityId: dprId,
      category: "DPR",
      action: "DELETE",
      before: beforeState,
      after: null,
      user: req.user,
      projectId: projectId,
      organizationId,
    });

    res.json({ message: "DPR deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET DPR IMAGE ---------------- */
router.get("/dprs/:dprId/image", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { dprId } = req.params;

    // Get DPR with project_id and image
    const dprCheck = await pool.query(
      `SELECT project_id, report_image, report_image_mime FROM dprs WHERE id = $1`,
      [dprId],
    );

    if (dprCheck.rows.length === 0) {
      return res.status(404).json({ error: "DPR not found" });
    }

    const {
      project_id: projectId,
      report_image,
      report_image_mime,
    } = dprCheck.rows[0];

    // Check if manager is ACTIVE in project
    const isActive = await managerProjectStatusCheck(managerId, projectId);
    if (!isActive) {
      return res.status(403).json({
        error: "Access denied. Not an active manager in the project.",
      });
    }

    if (!report_image) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.set("Content-Type", report_image_mime || "image/jpeg");
    res.send(report_image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET DPRs BY DATE ---------------- */
router.get(
  "/projects/:projectId/dprs/date/:date",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId, date } = req.params;

      const isActive = await managerProjectStatusCheck(managerId, projectId);
      if (!isActive) {
        return res.status(403).json({
          error: "Access denied. Not an active manager in the project.",
        });
      }

      const result = await pool.query(
        `SELECT d.*, 
              se.name AS engineer_name, 
              se.phone AS engineer_phone,
              p.start_date AS plan_start_date,
              p.end_date AS plan_end_date,
              pi.task_name AS plan_item_task_name,
              pi.period_start AS plan_item_period_start,
              pi.period_end AS plan_item_period_end
       FROM dprs d
       JOIN site_engineers se ON d.site_engineer_id = se.id
       LEFT JOIN plans p ON d.plan_id = p.id
       LEFT JOIN plan_items pi ON d.plan_item_id = pi.id
       WHERE d.project_id = $1 AND d.report_date = $2
       ORDER BY d.submitted_at DESC`,
        [projectId, date],
      );

      res.json({ dprs: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET PENDING DPRs BY DATE ---------------- */
router.get(
  "/projects/:projectId/dprs/date/:date/pending",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId, date } = req.params;

      const isActive = await managerProjectStatusCheck(managerId, projectId);
      if (!isActive) {
        return res.status(403).json({
          error: "Access denied. Not an active manager in the project.",
        });
      }

      const result = await pool.query(
        `SELECT d.*, 
              se.name AS engineer_name, 
              se.phone AS engineer_phone,
              p.start_date AS plan_start_date,
              p.end_date AS plan_end_date,
              pi.task_name AS plan_item_task_name,
              pi.period_start AS plan_item_period_start,
              pi.period_end AS plan_item_period_end
       FROM dprs d
       JOIN site_engineers se ON d.site_engineer_id = se.id
       LEFT JOIN plans p ON d.plan_id = p.id
       LEFT JOIN plan_items pi ON d.plan_item_id = pi.id
       WHERE d.project_id = $1 AND d.report_date = $2 AND d.status = 'PENDING'
       ORDER BY d.submitted_at DESC`,
        [projectId, date],
      );

      res.json({ dprs: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET APPROVED DPRs BY DATE ---------------- */
router.get(
  "/projects/:projectId/dprs/date/:date/approved",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId, date } = req.params;

      const isActive = await managerProjectStatusCheck(managerId, projectId);
      if (!isActive) {
        return res.status(403).json({
          error: "Access denied. Not an active manager in the project.",
        });
      }

      const result = await pool.query(
        `SELECT d.*, 
              se.name AS engineer_name, 
              se.phone AS engineer_phone,
              p.start_date AS plan_start_date,
              p.end_date AS plan_end_date,
              pi.task_name AS plan_item_task_name,
              pi.period_start AS plan_item_period_start,
              pi.period_end AS plan_item_period_end
       FROM dprs d
       JOIN site_engineers se ON d.site_engineer_id = se.id
       LEFT JOIN plans p ON d.plan_id = p.id
       LEFT JOIN plan_items pi ON d.plan_item_id = pi.id
       WHERE d.project_id = $1 AND d.report_date = $2 AND d.status = 'APPROVED'
       ORDER BY d.submitted_at DESC`,
        [projectId, date],
      );

      res.json({ dprs: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- GET REJECTED DPRs BY DATE ---------------- */
router.get(
  "/projects/:projectId/dprs/date/:date/rejected",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId, date } = req.params;

      const isActive = await managerProjectStatusCheck(managerId, projectId);
      if (!isActive) {
        return res.status(403).json({
          error: "Access denied. Not an active manager in the project.",
        });
      }

      const result = await pool.query(
        `SELECT d.*, 
              se.name AS engineer_name, 
              se.phone AS engineer_phone,
              p.start_date AS plan_start_date,
              p.end_date AS plan_end_date,
              pi.task_name AS plan_item_task_name,
              pi.period_start AS plan_item_period_start,
              pi.period_end AS plan_item_period_end
       FROM dprs d
       JOIN site_engineers se ON d.site_engineer_id = se.id
       LEFT JOIN plans p ON d.plan_id = p.id
       LEFT JOIN plan_items pi ON d.plan_item_id = pi.id
       WHERE d.project_id = $1 AND d.report_date = $2 AND d.status = 'REJECTED'
       ORDER BY d.submitted_at DESC`,
        [projectId, date],
      );

      res.json({ dprs: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
