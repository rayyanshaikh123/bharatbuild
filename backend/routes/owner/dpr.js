const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

// Check if owner owns the organization of the project
async function ownerOfProject(ownerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM projects p
     JOIN organizations o ON p.org_id = o.id
     WHERE p.id = $1 AND o.owner_id = $2`,
    [projectId, ownerId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- GET ALL DPRs FOR PROJECT (READ-ONLY) ---------------- */
router.get("/projects/:projectId/dprs", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { projectId } = req.params;

    // Check if owner owns the organization of this project
    const isOwner = await ownerOfProject(ownerId, projectId);
    if (!isOwner) {
      return res.status(403).json({
        error: "Access denied. You do not own this project's organization.",
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

/* ---------------- GET PENDING DPRs (READ-ONLY) ---------------- */
router.get(
  "/projects/:projectId/dprs/pending",
  ownerCheck,
  async (req, res) => {
    try {
      const ownerId = req.user.id;
      const { projectId } = req.params;

      const isOwner = await ownerOfProject(ownerId, projectId);
      if (!isOwner) {
        return res.status(403).json({
          error: "Access denied. You do not own this project's organization.",
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

/* ---------------- GET APPROVED DPRs (READ-ONLY) ---------------- */
router.get(
  "/projects/:projectId/dprs/approved",
  ownerCheck,
  async (req, res) => {
    try {
      const ownerId = req.user.id;
      const { projectId } = req.params;

      const isOwner = await ownerOfProject(ownerId, projectId);
      if (!isOwner) {
        return res.status(403).json({
          error: "Access denied. You do not own this project's organization.",
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

/* ---------------- GET REJECTED DPRs (READ-ONLY) ---------------- */
router.get(
  "/projects/:projectId/dprs/rejected",
  ownerCheck,
  async (req, res) => {
    try {
      const ownerId = req.user.id;
      const { projectId } = req.params;

      const isOwner = await ownerOfProject(ownerId, projectId);
      if (!isOwner) {
        return res.status(403).json({
          error: "Access denied. You do not own this project's organization.",
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

/* ---------------- GET SINGLE DPR (READ-ONLY) ---------------- */
router.get("/dprs/:dprId", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
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

    // Check if owner owns the organization of this project
    const isOwner = await ownerOfProject(ownerId, projectId);
    if (!isOwner) {
      return res.status(403).json({
        error: "Access denied. You do not own this project's organization.",
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

/* ---------------- GET DPR IMAGE (READ-ONLY) ---------------- */
router.get("/dprs/:dprId/image", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
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

    // Check if owner owns the organization of this project
    const isOwner = await ownerOfProject(ownerId, projectId);
    if (!isOwner) {
      return res.status(403).json({
        error: "Access denied. You do not own this project's organization.",
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

/* ---------------- GET DPRs BY DATE (READ-ONLY) ---------------- */
router.get(
  "/projects/:projectId/dprs/date/:date",
  ownerCheck,
  async (req, res) => {
    try {
      const ownerId = req.user.id;
      const { projectId, date } = req.params;

      const isOwner = await ownerOfProject(ownerId, projectId);
      if (!isOwner) {
        return res.status(403).json({
          error: "Access denied. You do not own this project's organization.",
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

/* ---------------- GET PENDING DPRs BY DATE (READ-ONLY) ---------------- */
router.get(
  "/projects/:projectId/dprs/date/:date/pending",
  ownerCheck,
  async (req, res) => {
    try {
      const ownerId = req.user.id;
      const { projectId, date } = req.params;

      const isOwner = await ownerOfProject(ownerId, projectId);
      if (!isOwner) {
        return res.status(403).json({
          error: "Access denied. You do not own this project's organization.",
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

/* ---------------- GET APPROVED DPRs BY DATE (READ-ONLY) ---------------- */
router.get(
  "/projects/:projectId/dprs/date/:date/approved",
  ownerCheck,
  async (req, res) => {
    try {
      const ownerId = req.user.id;
      const { projectId, date } = req.params;

      const isOwner = await ownerOfProject(ownerId, projectId);
      if (!isOwner) {
        return res.status(403).json({
          error: "Access denied. You do not own this project's organization.",
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

/* ---------------- GET REJECTED DPRs BY DATE (READ-ONLY) ---------------- */
router.get(
  "/projects/:projectId/dprs/date/:date/rejected",
  ownerCheck,
  async (req, res) => {
    try {
      const ownerId = req.user.id;
      const { projectId, date } = req.params;

      const isOwner = await ownerOfProject(ownerId, projectId);
      if (!isOwner) {
        return res.status(403).json({
          error: "Access denied. You do not own this project's organization.",
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
