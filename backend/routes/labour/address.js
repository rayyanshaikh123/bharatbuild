const express = require("express");
const pool = require("../../db");
const router = express.Router();
const labourCheck = require("../../middleware/labourCheck");

/**
 * PATCH /labour/address/primary
 * Update labour's primary location with current coordinates
 * Authorization: Labour (authenticated)
 * Body: { latitude, longitude, travel_radius_meters? }
 */
router.patch("/primary", labourCheck, async (req, res) => {
  const client = await pool.connect();
  try {
    const labourId = req.user.id;
    const { latitude, longitude, travel_radius_meters } = req.body;

    // Validate required fields
    if (latitude === undefined || longitude === null) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res
        .status(400)
        .json({ error: "Latitude and longitude must be numbers" });
    }

    await client.query("BEGIN");

    // 1️⃣ Update labours table
    const updateFields = ["primary_latitude = $1", "primary_longitude = $2"];
    const params = [latitude, longitude, labourId];

    if (travel_radius_meters !== undefined) {
      updateFields.push("travel_radius_meters = $3");
      params[params.length - 1] = travel_radius_meters;
      params.push(labourId);
    }

    await client.query(
      `UPDATE labours SET ${updateFields.join(", ")} WHERE id = $${params.length}`,
      params,
    );

    // 2️⃣ Handle labour_addresses
    // Set all existing addresses to non-primary
    await client.query(
      "UPDATE labour_addresses SET is_primary = FALSE WHERE labour_id = $1",
      [labourId],
    );

    // 3️⃣ Reverse Geocoding (resilient)
    let addressText = "Current Location";

    try {
      // Using OSM Nominatim for reverse geocoding (free, no API key needed)
      const https = require("https");
      const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

      const geocodeResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout")), 3000); // 3 second timeout

        https
          .get(
            geocodeUrl,
            {
              headers: {
                "User-Agent": "BharatBuild/1.0",
              },
            },
            (response) => {
              let data = "";
              response.on("data", (chunk) => (data += chunk));
              response.on("end", () => {
                clearTimeout(timeout);
                try {
                  const result = JSON.parse(data);
                  if (result && result.display_name) {
                    resolve(result.display_name);
                  } else {
                    resolve(null);
                  }
                } catch (e) {
                  resolve(null);
                }
              });
            },
          )
          .on("error", () => {
            clearTimeout(timeout);
            resolve(null);
          });
      });

      if (geocodeResult) {
        addressText = geocodeResult;
      }
    } catch (geocodeErr) {
      // Reverse geocoding failed - use default
      console.log(
        "Reverse geocoding failed (non-blocking):",
        geocodeErr.message,
      );
    }

    // Insert or update primary address
    await client
      .query(
        `INSERT INTO labour_addresses (labour_id, latitude, longitude, address_text, is_primary, tag)
       VALUES ($1, $2, $3, $4, TRUE, 'Current Location')
       ON CONFLICT ON CONSTRAINT labour_addresses_labour_id_latitude_longitude_key
       DO UPDATE SET is_primary = TRUE, address_text = $4, tag = 'Current Location'
       WHERE labour_addresses.labour_id = $1 AND labour_addresses.latitude = $2 AND labour_addresses.longitude = $3`,
        [labourId, latitude, longitude, addressText],
      )
      .catch(async (err) => {
        // If no unique constraint on lat/long, just insert
        if (err.code === "42703") {
          // column doesn't exist / no constraint
          await client.query(
            `INSERT INTO labour_addresses (labour_id, latitude, longitude, address_text, is_primary, tag)
           VALUES ($1, $2, $3, $4, TRUE, 'Current Location')`,
            [labourId, latitude, longitude, addressText],
          );
        } else {
          throw err;
        }
      });

    await client.query("COMMIT");

    res.json({
      message: "Primary address updated successfully",
      location: {
        latitude,
        longitude,
        address_text: addressText,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Primary address update error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
