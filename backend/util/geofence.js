/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Validate if coordinates are within project geofence
 * @param {Object} pool - Database connection pool
 * @param {string} projectId - Project UUID
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude
 * @returns {Object} Validation result with isValid, distance, and allowedRadius
 */
async function validateGeofence(pool, projectId, latitude, longitude) {
  const result = await pool.query(
    `SELECT latitude, longitude, geofence_radius, geofence FROM projects WHERE id = $1`,
    [projectId],
  );

  if (result.rows.length === 0) {
    throw new Error("Project not found");
  }

  const {
    latitude: projLat,
    longitude: projLon,
    geofence_radius,
    geofence,
  } = result.rows[0];

  // PRIORITY 1: Use geofence JSONB if present
  if (geofence && typeof geofence === "object") {
    // Support CIRCLE type geofencing
    if (
      geofence.type === "CIRCLE" &&
      geofence.center &&
      geofence.radius_meters
    ) {
      const { center, radius_meters } = geofence;

      // Validate center coordinates
      if (typeof center.lat === "number" && typeof center.lng === "number") {
        const distance = calculateDistance(
          latitude,
          longitude,
          center.lat,
          center.lng,
        );

        return {
          isValid: distance <= radius_meters,
          distance: Math.round(distance),
          allowedRadius: radius_meters,
          source: "geofence_jsonb",
          geofenceType: "CIRCLE",
        };
      }
    }

    // Future: Support POLYGON type
    // if (geofence.type === 'POLYGON') { ... }
  }

  // PRIORITY 2: Fallback to legacy fields for backward compatibility
  if (
    projLat !== null &&
    projLon !== null &&
    geofence_radius !== null &&
    geofence_radius > 0
  ) {
    const distance = calculateDistance(latitude, longitude, projLat, projLon);

    return {
      isValid: distance <= geofence_radius,
      distance: Math.round(distance),
      allowedRadius: geofence_radius,
      source: "legacy_fields",
      geofenceType: "CIRCLE",
    };
  }

  // PRIORITY 3: No geofence restriction (allow any location)
  return {
    isValid: true,
    distance: 0,
    allowedRadius: 0,
    message: "No geofence restriction",
    source: "none",
    geofenceType: "NONE",
  };
}

module.exports = { calculateDistance, validateGeofence };
