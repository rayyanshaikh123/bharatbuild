const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");

/* ---------------- GET PROFILE ---------------- */
router.get("/profile", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;

    // Get labour details with primary address joined
    const labourResult = await pool.query(
      `SELECT l.id, l.name, l.phone, l.role, l.skill_type, l.categories, 
              l.primary_latitude, l.primary_longitude, l.travel_radius_meters, l.created_at,
              la.address_text as address
       FROM labours l
       LEFT JOIN labour_addresses la ON l.id = la.labour_id AND la.is_primary = TRUE
       WHERE l.id = $1`,
      [labourId],
    );
    if (labourResult.rows.length === 0) {
      return res.status(404).json({ error: "Labour not found" });
    }

    // Get all addresses for this labour
    const addressResult = await pool.query(
      `SELECT id, latitude, longitude, address_text, is_primary, created_at, tag 
       FROM labour_addresses WHERE labour_id = $1 ORDER BY is_primary DESC, created_at DESC`,
      [labourId],
    );

    res.json({
      labour: labourResult.rows[0],
      addresses: addressResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- UPDATE PROFILE ---------------- */
router.patch("/profile", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const {
      name,
      skill_type,
      categories,
      primary_latitude,
      primary_longitude,
      travel_radius_meters,
      address, // Primary address text
    } = req.body;

    // Validate skill_type if provided
    if (
      skill_type &&
      !["SKILLED", "SEMI_SKILLED", "UNSKILLED"].includes(skill_type)
    ) {
      return res.status(400).json({ error: "invalid_skill_type" });
    }

    // Start transaction to handle address upsert
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE labours SET 
          name = COALESCE($1, name),
          skill_type = COALESCE($2, skill_type),
          categories = COALESCE($3, categories),
          primary_latitude = COALESCE($4, primary_latitude),
          primary_longitude = COALESCE($5, primary_longitude),
          travel_radius_meters = COALESCE($6, travel_radius_meters)
         WHERE id = $7 RETURNING *`,
        [
          name,
          skill_type,
          categories,
          primary_latitude,
          primary_longitude,
          travel_radius_meters,
          labourId,
        ],
      );

      // Upsert primary address if provided
      if (address) {
        // Check if primary address exists
        const addrCheck = await client.query(
          "SELECT id FROM labour_addresses WHERE labour_id = $1 AND is_primary = TRUE",
          [labourId],
        );

        if (addrCheck.rows.length > 0) {
          // Update existing primary
          await client.query(
            "UPDATE labour_addresses SET address_text = $1, latitude = $2, longitude = $3 WHERE id = $4",
            [address, primary_latitude || null, primary_longitude || null, addrCheck.rows[0].id],
          );
        } else {
          // Create new primary
          await client.query(
            "INSERT INTO labour_addresses (labour_id, address_text, is_primary, tag, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6)",
            [labourId, address, true, 'Home', primary_latitude || null, primary_longitude || null],
          );
        }
      }

      await client.query("COMMIT");

      // Fetch the updated profile with joined address
      const finalResult = await pool.query(
        `SELECT l.*, la.address_text as address 
         FROM labours l
         LEFT JOIN labour_addresses la ON l.id = la.labour_id AND la.is_primary = TRUE
         WHERE l.id = $1`,
        [labourId],
      );

      res.json({ labour: finalResult.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- CHECK AUTH ---------------- */
router.get("/check-auth", labourCheck, (req, res) => {
  res.json({ authenticated: true, labour: req.user });
});

/* ============================================== */
/*              ADDRESS ROUTES                   */
/* ============================================== */

/* ---------------- GET ALL ADDRESSES ---------------- */
router.get("/addresses", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const result = await pool.query(
      `SELECT id, latitude, longitude, address_text, is_primary, created_at, tag 
       FROM labour_addresses WHERE labour_id = $1 ORDER BY is_primary DESC, created_at DESC`,
      [labourId],
    );
    res.json({ addresses: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- ADD NEW ADDRESS ---------------- */
router.post("/addresses", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const { latitude, longitude, address_text, is_primary, tag } = req.body;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "latitude and longitude are required" });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // If this address is set as primary
      if (is_primary) {
        // Set all other addresses as non-primary
        await client.query(
          `UPDATE labour_addresses SET is_primary = FALSE WHERE labour_id = $1`,
          [labourId],
        );

        // Also update the primary location in labours table
        await client.query(
          `UPDATE labours SET primary_latitude = $1, primary_longitude = $2 WHERE id = $3`,
          [latitude, longitude, labourId],
        );
      }

      // Insert the new address
      const result = await client.query(
        `INSERT INTO labour_addresses (labour_id, latitude, longitude, address_text, is_primary, tag) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          labourId,
          latitude,
          longitude,
          address_text || null,
          is_primary || false,
          tag || 'Other',
        ],
      );

      await client.query("COMMIT");
      res.status(201).json({ address: result.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- UPDATE ADDRESS ---------------- */
router.patch("/addresses/:id", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const addressId = req.params.id;
    const { latitude, longitude, address_text, tag } = req.body;

    // Check if address belongs to this labour
    const checkResult = await pool.query(
      `SELECT * FROM labour_addresses WHERE id = $1 AND labour_id = $2`,
      [addressId, labourId],
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Address not found" });
    }

    const result = await pool.query(
      `UPDATE labour_addresses SET 
        latitude = COALESCE($1, latitude),
        longitude = COALESCE($2, longitude),
        address_text = COALESCE($3, address_text),
        tag = COALESCE($4, tag)
       WHERE id = $5 AND labour_id = $6 RETURNING *`,
      [latitude, longitude, address_text, tag, addressId, labourId],
    );

    // If this is the primary address, also update labours table
    if (checkResult.rows[0].is_primary) {
      const newLat = latitude || checkResult.rows[0].latitude;
      const newLng = longitude || checkResult.rows[0].longitude;
      await pool.query(
        `UPDATE labours SET primary_latitude = $1, primary_longitude = $2 WHERE id = $3`,
        [newLat, newLng, labourId],
      );
    }

    res.json({ address: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- SET ADDRESS AS PRIMARY ---------------- */
router.patch("/addresses/:id/set-primary", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const addressId = req.params.id;

    // Check if address belongs to this labour
    const checkResult = await pool.query(
      `SELECT * FROM labour_addresses WHERE id = $1 AND labour_id = $2`,
      [addressId, labourId],
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Address not found" });
    }

    const address = checkResult.rows[0];

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Set all addresses as non-primary
      await client.query(
        `UPDATE labour_addresses SET is_primary = FALSE WHERE labour_id = $1`,
        [labourId],
      );

      // Set this address as primary
      const result = await client.query(
        `UPDATE labour_addresses SET is_primary = TRUE WHERE id = $1 RETURNING *`,
        [addressId],
      );

      // Update the primary location in labours table
      await client.query(
        `UPDATE labours SET primary_latitude = $1, primary_longitude = $2 WHERE id = $3`,
        [address.latitude, address.longitude, labourId],
      );

      await client.query("COMMIT");
      res.json({ address: result.rows[0], message: "Address set as primary" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE ADDRESS ---------------- */
router.delete("/addresses/:id", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const addressId = req.params.id;

    // Check if address belongs to this labour and get its details
    const checkResult = await pool.query(
      `SELECT * FROM labour_addresses WHERE id = $1 AND labour_id = $2`,
      [addressId, labourId],
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Address not found" });
    }

    const wasIsPrimary = checkResult.rows[0].is_primary;

    // Delete the address
    await pool.query(
      `DELETE FROM labour_addresses WHERE id = $1 AND labour_id = $2`,
      [addressId, labourId],
    );

    // If deleted address was primary, clear primary location in labours table
    if (wasIsPrimary) {
      await pool.query(
        `UPDATE labours SET primary_latitude = NULL, primary_longitude = NULL WHERE id = $1`,
        [labourId],
      );
    }

    res.json({ message: "Address deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
/* ---------------- UPDATE SKILLS & CATEGORIES ---------------- */
router.patch("/profile/skills", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const { skill_type, add_categories = [], remove_categories = [] } = req.body;

    if (
      skill_type &&
      !["SKILLED", "SEMI_SKILLED", "UNSKILLED"].includes(skill_type)
    ) {
      return res.status(400).json({ error: "invalid_skill_type" });
    }

    // Fetch current categories
    const currentResult = await pool.query(
      `SELECT categories FROM labours WHERE id = $1`,
      [labourId],
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Labour not found" });
    }

    let categories = currentResult.rows[0].categories || [];

    // Add categories
    for (const cat of add_categories) {
      if (!categories.includes(cat)) {
        categories.push(cat);
      }
    }

    // Remove categories
    categories = categories.filter(
      (cat) => !remove_categories.includes(cat),
    );

    const result = await pool.query(
      `UPDATE labours SET
        skill_type = COALESCE($1, skill_type),
        categories = $2
       WHERE id = $3 RETURNING *`,
      [skill_type, categories, labourId],
    );

    res.json({ labour: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
