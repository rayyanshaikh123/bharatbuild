const pool = require("../db");

/**
 * ============================================================
 * GEO-FENCE VALIDATOR UTILITY
 * ============================================================
 * Purpose: Reusable geo-fence validation for site-engineer actions
 * Usage: Material Requests, GRN creation, Bill uploads, etc.
 *
 * IMPORTANT: Uses projects.geofence JSONB as single source of truth
 * ============================================================
 */

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
 * Point-in-polygon algorithm using ray casting
 * @param {number} lat - Point latitude
 * @param {number} lng - Point longitude
 * @param {Array<Array<number>>} coordinates - Polygon coordinates [[lng, lat], ...]
 * @returns {boolean} True if point is inside polygon
 */
function isPointInPolygon(lat, lng, coordinates) {
  if (!coordinates || coordinates.length < 3) {
    return false;
  }

  let inside = false;
  const x = lng;
  const y = lat;

  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const xi = coordinates[i][0]; // longitude
    const yi = coordinates[i][1]; // latitude
    const xj = coordinates[j][0];
    const yj = coordinates[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Validate if user is inside project geo-fence
 *
 * @param {Object} params - Validation parameters
 * @param {string} params.projectId - Project UUID
 * @param {string} params.userId - User UUID
 * @param {string} params.userRole - User role (SITE_ENGINEER, MANAGER)
 * @param {number} params.latitude - User's current latitude
 * @param {number} params.longitude - User's current longitude
 * @param {Object} [params.client] - PostgreSQL client (optional, for transactions)
 * @returns {Promise<boolean>} True if inside or no geofence, throws error if outside
 * @throws {Error} OUTSIDE_PROJECT_GEOFENCE if user is outside
 */
async function validateUserInsideProjectGeofence({
  projectId,
  userId,
  userRole,
  latitude,
  longitude,
  client = null,
}) {
  const db = client || pool;

  try {
    // Validate UUID format
    if (!projectId || typeof projectId !== "string") {
      throw new Error("Invalid projectId");
    }

    // Validate coordinates
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error("Invalid latitude or longitude");
    }

    // Step 1: Verify user belongs to project
    let accessCheck;
    if (userRole === "SITE_ENGINEER") {
      accessCheck = await db.query(
        `SELECT id FROM project_site_engineers 
         WHERE project_id = $1 AND site_engineer_id = $2 AND status = 'ACTIVE'`,
        [projectId, userId],
      );
    } else if (userRole === "MANAGER") {
      accessCheck = await db.query(
        `SELECT id FROM project_managers 
         WHERE project_id = $1 AND manager_id = $2 AND status = 'ACTIVE'`,
        [projectId, userId],
      );
    } else {
      throw new Error(`Unsupported role: ${userRole}`);
    }

    if (accessCheck.rows.length === 0) {
      throw new Error("User is not assigned to this project");
    }

    // Step 2: Fetch project geofence
    const projectResult = await db.query(
      `SELECT geofence FROM projects WHERE id = $1`,
      [projectId],
    );

    if (projectResult.rows.length === 0) {
      throw new Error("Project not found");
    }

    const { geofence } = projectResult.rows[0];

    // Step 3: If no geofence defined, allow action (do NOT block)
    if (!geofence || typeof geofence !== "object") {
      return true;
    }

    // Step 4: Validate based on geofence type
    let isInside = false;
    let distance = null;
    let geofenceType = null;

    if (geofence.type === "CIRCLE") {
      // CIRCLE geofence validation
      if (
        !geofence.center ||
        typeof geofence.center.lat !== "number" ||
        typeof geofence.center.lng !== "number" ||
        typeof geofence.radius_meters !== "number"
      ) {
        // Invalid geofence format, allow action
        return true;
      }

      geofenceType = "CIRCLE";
      distance = calculateDistance(
        latitude,
        longitude,
        geofence.center.lat,
        geofence.center.lng,
      );
      isInside = distance <= geofence.radius_meters;
    } else if (geofence.type === "POLYGON") {
      // POLYGON geofence validation
      if (!geofence.coordinates || !Array.isArray(geofence.coordinates)) {
        // Invalid geofence format, allow action
        return true;
      }

      geofenceType = "POLYGON";
      isInside = isPointInPolygon(latitude, longitude, geofence.coordinates);
    } else {
      // Unknown geofence type, allow action
      return true;
    }

    // Step 5: If outside geofence, log and throw error
    if (!isInside) {
      // Audit log - access denied
      await db.query(
        `INSERT INTO audit_logs 
         (entity_type, entity_id, action, acted_by_role, acted_by_id, project_id, category, change_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          "GEOFENCE_VALIDATION",
          projectId,
          "ACCESS_DENIED",
          userRole,
          userId,
          projectId,
          "SECURITY",
          JSON.stringify({
            reason: "Outside project geofence",
            geofence_type: geofenceType,
            user_location: { latitude, longitude },
            distance_meters: distance ? Math.round(distance) : null,
          }),
        ],
      );

      const error = new Error(
        "You must be inside the project site to perform this action",
      );
      error.code = "OUTSIDE_PROJECT_GEOFENCE";
      error.statusCode = 403;
      error.details = {
        geofence_type: geofenceType,
        distance_meters: distance ? Math.round(distance) : null,
      };
      throw error;
    }

    // Step 6: User is inside, return true
    return true;
  } catch (err) {
    // Re-throw geofence validation errors
    if (err.code === "OUTSIDE_PROJECT_GEOFENCE") {
      throw err;
    }

    // Log unexpected errors
    console.error("[Geofence Validator] Error:", err.message);
    throw err;
  }
}

/**
 * Legacy function for backward compatibility
 * Used by existing attendance system
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
    if (
      geofence.type === "CIRCLE" &&
      geofence.center &&
      geofence.radius_meters
    ) {
      const { center, radius_meters } = geofence;

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

    if (geofence.type === "POLYGON" && geofence.coordinates) {
      const isInside = isPointInPolygon(
        latitude,
        longitude,
        geofence.coordinates,
      );

      return {
        isValid: isInside,
        distance: 0,
        allowedRadius: 0,
        source: "geofence_jsonb",
        geofenceType: "POLYGON",
      };
    }
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

module.exports = {
  calculateDistance,
  isPointInPolygon,
  validateUserInsideProjectGeofence,
  validateGeofence, // Legacy - for attendance system
};
