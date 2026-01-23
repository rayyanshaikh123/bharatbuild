const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const { verifyEngineerAccess } = require("../../util/engineerPermissions");

/* ---------------- GET PLAN ITEMS (FOR DROPDOWN) ---------------- */
router.get(
  "/projects/:projectId/plans/items",
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId } = req.params;

      // Check if engineer has access to project
      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
        });
      }

      // Get plan for project
      const planResult = await pool.query(
        `SELECT id FROM plans WHERE project_id = $1`,
        [projectId],
      );

      if (planResult.rows.length === 0) {
        return res.json({ plan_items: [] });
      }

      const planId = planResult.rows[0].id;

      // Get plan items
      const itemsResult = await pool.query(
        `SELECT * FROM plan_items WHERE plan_id = $1 ORDER BY period_start, created_at`,
        [planId],
      );

      res.json({ plan_items: itemsResult.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- CREATE DPR ---------------- */
router.post("/projects/:projectId/dprs", engineerCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const engineerId = req.user.id;
    const { projectId } = req.params;
    const {
      title,
      description,
      plan_id,
      plan_item_id,
      report_date,
      report_image,
      report_image_mime,
      items, // array of { plan_item_id, quantity_done, remarks }
    } = req.body;

    // Check if engineer is ACTIVE in project
    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) {
      return res.status(403).json({
        error: access.error,
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO dprs (project_id, site_engineer_id, title, description, 
       plan_id, plan_item_id, report_date, report_image, report_image_mime)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        projectId,
        engineerId,
        title,
        description,
        plan_id || null,
        plan_item_id || null,
        report_date,
        report_image ? Buffer.from(report_image, "base64") : null,
        report_image_mime || null,
      ],
    );

    const dprId = result.rows[0].id;

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await client.query(
          `INSERT INTO dpr_items (dpr_id, plan_item_id, quantity_done, remarks)
           VALUES ($1, $2, $3, $4)`,
          [dprId, item.plan_item_id, item.quantity_done, item.remarks || null],
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ dpr: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- GET OWN DPRs ---------------- */
router.get("/projects/:projectId/dprs/my", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.params;

    // Check if engineer has access to project (ACTIVE or PENDING) - read operation
    const hasAccess = await engineerProjectAccessCheck(engineerId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied. Not an engineer in the project.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM dprs 
       WHERE project_id = $1 AND site_engineer_id = $2
       ORDER BY report_date DESC, submitted_at DESC`,
      [projectId, engineerId],
    );

    res.json({ dprs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET ALL DPRs IN PROJECT ---------------- */
router.get("/projects/:projectId/dprs", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId } = req.params;

    // Check if engineer has access to project
    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) {
      return res.status(403).json({
        error: access.error,
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

/* ---------------- GET PENDING DPRs ---------------- */
router.get(
  "/projects/:projectId/dprs/pending",
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId } = req.params;

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
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
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId } = req.params;

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
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
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId } = req.params;

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
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
router.get("/dprs/:dprId", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
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

    // Check if engineer has access to project
    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) {
      return res.status(403).json({
        error: access.error,
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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "DPR not found" });
    }

    const dpr = result.rows[0];

    // Fetch items
    const itemsResult = await pool.query(
      `SELECT di.*, pi.task_name, pi.planned_quantity, pi.description as task_description
       FROM dpr_items di
       JOIN plan_items pi ON di.plan_item_id = pi.id
       WHERE di.dpr_id = $1`,
      [dprId],
    );

    dpr.items = itemsResult.rows;

    res.json({ dpr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET DPR IMAGE ---------------- */
router.get("/dprs/:dprId/image", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
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

    // Check if engineer has access to project
    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) {
      return res.status(403).json({
        error: access.error,
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
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId, date } = req.params;

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
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
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId, date } = req.params;

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
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
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId, date } = req.params;

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
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
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId, date } = req.params;

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
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

/* ---------------- LIGHTWEIGHT: GET ALL DPRs ---------------- */
router.get(
  "/projects/:projectId/dprs/light",
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId } = req.params;

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
        });
      }

      const result = await pool.query(
        `SELECT id AS dpr_id, 
              title, 
              description, 
              status, 
              report_date, 
              site_engineer_id AS created_by
       FROM dprs
       WHERE project_id = $1
       ORDER BY report_date DESC, submitted_at DESC`,
        [projectId],
      );

      res.json({ dprs: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- LIGHTWEIGHT: GET PENDING DPRs ---------------- */
router.get(
  "/projects/:projectId/dprs/light/pending",
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId } = req.params;

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
        });
      }

      const result = await pool.query(
        `SELECT id AS dpr_id, 
              title, 
              description, 
              status, 
              report_date, 
              site_engineer_id AS created_by
       FROM dprs
       WHERE project_id = $1 AND status = 'PENDING'
       ORDER BY report_date DESC, submitted_at DESC`,
        [projectId],
      );

      res.json({ dprs: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- LIGHTWEIGHT: GET APPROVED DPRs ---------------- */
router.get(
  "/projects/:projectId/dprs/light/approved",
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId } = req.params;

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
        });
      }

      const result = await pool.query(
        `SELECT id AS dpr_id, 
              title, 
              description, 
              status, 
              report_date, 
              site_engineer_id AS created_by
       FROM dprs
       WHERE project_id = $1 AND status = 'APPROVED'
       ORDER BY report_date DESC, submitted_at DESC`,
        [projectId],
      );

      res.json({ dprs: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ---------------- LIGHTWEIGHT: GET REJECTED DPRs ---------------- */
router.get(
  "/projects/:projectId/dprs/light/rejected",
  engineerCheck,
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId } = req.params;

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) {
        return res.status(403).json({
          error: access.error,
        });
      }

      const result = await pool.query(
        `SELECT id AS dpr_id, 
              title, 
              description, 
              status, 
              report_date, 
              site_engineer_id AS created_by
       FROM dprs
       WHERE project_id = $1 AND status = 'REJECTED'
       ORDER BY report_date DESC, submitted_at DESC`,
        [projectId],
      );

      res.json({ dprs: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
