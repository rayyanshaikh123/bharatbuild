const express = require("express");
const pool = require("../../db");
const axios = require("axios");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");
router.get("/profile", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const result = await pool.query(
      "SELECT id, name, phone, role, skill_type FROM labours WHERE id = $1",
      [labourId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Labour not found" });
    }
    res.json({ labour: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update labour profile (skill_type, role, categories, address -> geocoded primary lat/lng)
router.post("/profile", labourCheck, async (req, res) => {
  try {
    const labourId = req.user.id;
    const {
      skill_type,
      role,
      categories,
      address,
      travel_radius_meters,
    } = req.body;

    // Basic validation
    const allowedSkills = ["SKILLED", "SEMI_SKILLED", "UNSKILLED"];
    if (skill_type && !allowedSkills.includes(skill_type)) {
      return res.status(400).json({ error: "Invalid skill_type" });
    }

    // Accept coordinates from client if provided, otherwise geocode the address
    let primary_latitude = null;
    let primary_longitude = null;

    if (
      req.body.primary_latitude !== undefined &&
      req.body.primary_longitude !== undefined
    ) {
      const lat = parseFloat(req.body.primary_latitude);
      const lon = parseFloat(req.body.primary_longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        primary_latitude = lat;
        primary_longitude = lon;
      }
    } else if (address && typeof address === "string" && address.trim() !== "") {
      try {
        const geoRes = await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: { q: address, format: "json", limit: 1 },
            headers: { "User-Agent": "bharatbuild-backend/1.0 (+https://example.com)" },
          }
        );
        if (Array.isArray(geoRes.data) && geoRes.data.length > 0) {
          primary_latitude = parseFloat(geoRes.data[0].lat);
          primary_longitude = parseFloat(geoRes.data[0].lon);
        }
      } catch (gerr) {
        console.warn("Geocoding failed:", gerr.message || gerr);
        // proceed without lat/lng if geocoding fails
      }
    }

    // Update the labour row
    const updateQuery = `
      UPDATE labours
      SET
        skill_type = COALESCE($1, skill_type),
        role = COALESCE($2, role),
        categories = COALESCE($3, categories),
        primary_latitude = COALESCE($4, primary_latitude),
        primary_longitude = COALESCE($5, primary_longitude),
        travel_radius_meters = COALESCE($6, travel_radius_meters)
      WHERE id = $7
      RETURNING id, name, phone, role, skill_type, categories, primary_latitude, primary_longitude, travel_radius_meters;
    `;

    const values = [
      skill_type || null,
      role || null,
      categories || null,
      primary_latitude,
      primary_longitude,
      travel_radius_meters || null,
      labourId,
    ];

    const result = await pool.query(updateQuery, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Labour not found" });
    }

    return res.json({ labour: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});
router.get("/check-auth", labourCheck, (req, res) => {
  res.json({ authenticated: true, labour: req.user });
});
module.exports = router;

