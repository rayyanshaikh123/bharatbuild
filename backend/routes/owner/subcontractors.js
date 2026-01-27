const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");
const {
  logAudit,
  getOrganizationIdFromProject,
} = require("../../util/auditLogger");

// Helper: Get organization IDs owned by this owner
async function getOwnerOrgIds(ownerId) {
  const result = await pool.query(
    `SELECT id FROM organizations WHERE owner_id = $1`,
    [ownerId],
  );
  return result.rows.map((r) => r.id);
}

/* ---------------- CREATE SUBCONTRACTOR ---------------- */
router.post("/", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const {
      org_id,
      name,
      specialization,
      contact_name,
      contact_phone,
      contact_email,
    } = req.body;

    if (!org_id || !name) {
      return res.status(400).json({ error: "org_id and name are required" });
    }

    // Verify owner owns this organization
    const orgIds = await getOwnerOrgIds(ownerId);
    if (!orgIds.includes(org_id)) {
      return res
        .status(403)
        .json({ error: "Not authorized for this organization" });
    }

    const result = await pool.query(
      `INSERT INTO subcontractors (org_id, name, specialization, contact_name, contact_phone, contact_email)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        org_id,
        name,
        specialization || null,
        contact_name || null,
        contact_phone || null,
        contact_email || null,
      ],
    );

    // Audit log
    await logAudit({
      entityType: "SUBCONTRACTOR",
      entityId: result.rows[0].id,
      category: "SUBCONTRACTOR",
      action: "CREATE",
      before: null,
      after: result.rows[0],
      user: req.user,
      organizationId: org_id,
    });

    res.status(201).json({ subcontractor: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- LIST SUBCONTRACTORS ---------------- */
router.get("/", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { org_id } = req.query;

    // Get owner's organizations
    const orgIds = await getOwnerOrgIds(ownerId);

    if (orgIds.length === 0) {
      return res.json({ subcontractors: [] });
    }

    let query;
    let params;

    if (org_id) {
      // Filter by specific org
      if (!orgIds.includes(org_id)) {
        return res
          .status(403)
          .json({ error: "Not authorized for this organization" });
      }
      query = `SELECT * FROM subcontractors WHERE org_id = $1 ORDER BY created_at DESC`;
      params = [org_id];
    } else {
      // All organizations owned by this owner
      query = `SELECT * FROM subcontractors WHERE org_id = ANY($1) ORDER BY created_at DESC`;
      params = [orgIds];
    }

    const result = await pool.query(query, params);
    res.json({ subcontractors: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET SUBCONTRACTOR BY ID ---------------- */
router.get("/:id", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;

    // Get subcontractor
    const result = await pool.query(
      `SELECT * FROM subcontractors WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subcontractor not found" });
    }

    const subcontractor = result.rows[0];

    // Verify owner owns the organization
    const orgIds = await getOwnerOrgIds(ownerId);
    if (subcontractor.org_id && !orgIds.includes(subcontractor.org_id)) {
      return res
        .status(403)
        .json({ error: "Not authorized for this subcontractor" });
    }

    res.json({ subcontractor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET SUBCONTRACTOR PERFORMANCE ---------------- */
router.get("/:id/performance", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;

    // Get subcontractor
    const subResult = await pool.query(
      `SELECT * FROM subcontractors WHERE id = $1`,
      [id],
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: "Subcontractor not found" });
    }

    const subcontractor = subResult.rows[0];

    // Verify owner owns the organization
    const orgIds = await getOwnerOrgIds(ownerId);
    if (subcontractor.org_id && !orgIds.includes(subcontractor.org_id)) {
      return res
        .status(403)
        .json({ error: "Not authorized for this subcontractor" });
    }

    // Get aggregated performance data
    const performanceQuery = `
      SELECT 
        $1::uuid AS subcontractor_id,
        COALESCE(AVG(tsr.rating)::numeric(3,2), 0) AS avg_speed_rating,
        COALESCE(AVG(tqr.rating)::numeric(3,2), 0) AS avg_quality_rating,
        COUNT(DISTINCT ts.task_id) FILTER (WHERE ts.task_completed_at IS NOT NULL) AS total_tasks_completed,
        COUNT(DISTINCT pl.project_id) AS projects_involved
      FROM task_subcontractors ts
      JOIN plan_items pi ON ts.task_id = pi.id
      JOIN plans pl ON pi.plan_id = pl.id
      LEFT JOIN task_speed_ratings tsr ON ts.task_id = tsr.task_id
      LEFT JOIN task_quality_reviews tqr ON ts.task_id = tqr.task_id
      WHERE ts.subcontractor_id = $1
    `;

    const performanceResult = await pool.query(performanceQuery, [id]);
    const performance = performanceResult.rows[0];

    // Get task breakdown
    const breakdownQuery = `
      SELECT 
        ts.task_id,
        pi.task_name,
        pl.project_id,
        p.name AS project_name,
        tsr.rating AS speed_rating,
        tqr.rating AS quality_rating,
        ts.task_start_date,
        ts.task_completed_at
      FROM task_subcontractors ts
      JOIN plan_items pi ON ts.task_id = pi.id
      JOIN plans pl ON pi.plan_id = pl.id
      JOIN projects p ON pl.project_id = p.id
      LEFT JOIN task_speed_ratings tsr ON ts.task_id = tsr.task_id
      LEFT JOIN task_quality_reviews tqr ON ts.task_id = tqr.task_id
      WHERE ts.subcontractor_id = $1
      ORDER BY ts.assigned_at DESC
    `;

    const breakdownResult = await pool.query(breakdownQuery, [id]);

    res.json({
      subcontractor_id: id,
      subcontractor_name: subcontractor.name,
      avg_speed_rating: parseFloat(performance.avg_speed_rating) || 0,
      avg_quality_rating: parseFloat(performance.avg_quality_rating) || 0,
      total_tasks_completed: parseInt(performance.total_tasks_completed) || 0,
      projects_involved: parseInt(performance.projects_involved) || 0,
      task_breakdown: breakdownResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
