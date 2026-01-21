const express = require("express");
const pool = require("../../db");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");

// Check if manager is ACTIVE in project
async function managerProjectStatusCheck(managerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM project_managers
     WHERE manager_id = $1 
       AND project_id = $2 
       AND status = 'ACTIVE'`,
    [managerId, projectId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- CREATE WAGE RATE ---------------- */
router.post("/", managerCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const managerId = req.user.id;
    const { project_id, skill_type, category, hourly_rate } = req.body;

    if (!project_id || !skill_type || !category || !hourly_rate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify manager is ACTIVE in project
    const isActive = await managerProjectStatusCheck(managerId, project_id);
    if (!isActive) {
      return res.status(403).json({ error: "Access denied" });
    }

    await client.query("BEGIN");

    // Check for duplicate
    const duplicateCheck = await client.query(
      `SELECT id FROM wage_rates 
       WHERE project_id = $1 AND skill_type = $2 AND category = $3`,
      [project_id, skill_type, category],
    );

    if (duplicateCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Wage rate already exists for this skill type and category",
      });
    }

    // Create wage rate
    const result = await client.query(
      `INSERT INTO wage_rates (project_id, skill_type, category, hourly_rate, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [project_id, skill_type, category, hourly_rate, managerId],
    );

    await client.query("COMMIT");

    res.status(201).json({ wage_rate: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/* ---------------- UPDATE WAGE RATE ---------------- */
router.patch("/:id", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { id } = req.params;
    const { hourly_rate } = req.body;

    if (!hourly_rate) {
      return res.status(400).json({ error: "Hourly rate is required" });
    }

    // Verify manager is ACTIVE in project
    const verifyRes = await pool.query(
      `SELECT wr.project_id FROM wage_rates wr
       JOIN project_managers pm ON wr.project_id = pm.project_id
       WHERE wr.id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
      [id, managerId],
    );

    if (verifyRes.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update wage rate
    const result = await pool.query(
      `UPDATE wage_rates SET hourly_rate = $1 WHERE id = $2 RETURNING *`,
      [hourly_rate, id],
    );

    res.json({ wage_rate: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE WAGE RATE ---------------- */
router.delete("/:id", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { id } = req.params;

    // Verify manager is ACTIVE in project
    const verifyRes = await pool.query(
      `SELECT wr.project_id FROM wage_rates wr
       JOIN project_managers pm ON wr.project_id = pm.project_id
       WHERE wr.id = $1 AND pm.manager_id = $2 AND pm.status = 'ACTIVE'`,
      [id, managerId],
    );

    if (verifyRes.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete wage rate
    await pool.query(`DELETE FROM wage_rates WHERE id = $1`, [id]);

    res.json({ message: "Wage rate deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET WAGE RATES ---------------- */
router.get("/", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // Verify manager is ACTIVE in project
    const isActive = await managerProjectStatusCheck(managerId, project_id);
    if (!isActive) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get wage rates
    const result = await pool.query(
      `SELECT * FROM wage_rates WHERE project_id = $1 ORDER BY skill_type, category`,
      [project_id],
    );

    res.json({ wage_rates: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
