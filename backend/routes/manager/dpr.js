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
  try {
    const managerId = req.user.id;
    const { dprId } = req.params;
    const { status, remarks } = req.body;

    // Validate status
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be APPROVED or REJECTED.",
      });
    }

    // Get project_id from DPR
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
      `UPDATE dprs SET 
       status = $1, 
       remarks = $2,
       reviewed_by = $3,
       reviewed_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, remarks, managerId, dprId],
    );

    res.json({ dpr: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
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
              p.start_date AS plan_start_date,
              p.end_date AS plan_end_date,
              pi.task_name AS plan_item_task_name,
              pi.period_start AS plan_item_period_start,
              pi.period_end AS plan_item_period_end
       FROM dprs d
       JOIN site_engineers se ON d.site_engineer_id = se.id
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
