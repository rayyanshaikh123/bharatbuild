const express = require("express");
const pool = require("../../db");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");

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

/* ---------------- GET LABOUR REQUESTS (READ-ONLY) ---------------- */
router.get("/labour-requests", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    // Check if owner owns the organization of this project
    const isOwner = await ownerOwnsProject(ownerId, projectId);

    if (!isOwner) {
      return res.status(403).json({
        error: "Access denied. You do not own this project's organization.",
      });
    }

    const result = await pool.query(
      `SELECT * FROM labour_requests 
       WHERE project_id = $1 
       ORDER BY request_date DESC, created_at DESC`,
      [projectId],
    );

    res.json({ labour_requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
