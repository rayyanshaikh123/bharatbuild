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
 * Check if point is inside a polygon (ray-casting algorithm)
 */
function isPointInsidePolygon(point, polygon) {
  const x = point[1]; // longitude
  const y = point[0]; // latitude
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1],
      yi = polygon[i][0];
    const xj = polygon[j][1],
      yj = polygon[j][0];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculate distance from point to nearest polygon vertex
 */
function distanceToPolygon(lat, lon, polygon) {
  const inside = isPointInsidePolygon([lat, lon], polygon);
  if (inside) return -1; // Indicate inside

  let minDist = Infinity;
  for (const p of polygon) {
    const d = calculateDistance(lat, lon, p[0], p[1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
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

  const GRACE_BUFFER = 30; // 30 meters grace period for GPS drift

  // PRIORITY 1: Use geofence JSONB if present
  if (geofence && typeof geofence === "object") {
    // Handle GeoJSON format
    if (geofence.type === "Feature" && geofence.geometry) {
      const geom = geofence.geometry;
      if (geom.type === "Polygon" && geom.coordinates && geom.coordinates[0]) {
        const polygon = geom.coordinates[0].map((c) => [c[1], c[0]]); // Swap Lng/Lat to Lat/Lng
        const dist = distanceToPolygon(latitude, longitude, polygon);
        return {
          isValid: dist <= GRACE_BUFFER,
          distance: Math.round(Math.max(0, dist)),
          allowedRadius: 0,
          source: "geofence_geojson",
          geofenceType: "POLYGON",
        };
      }
    }

    const type = (geofence.type || "NONE").toUpperCase();

    // Support CIRCLE type geofencing
    if (type === "CIRCLE" && geofence.center && geofence.radius_meters) {
      const { center, radius_meters } = geofence;
      if (typeof center.lat === "number" && typeof center.lng === "number") {
        const distance = calculateDistance(
          latitude,
          longitude,
          center.lat,
          center.lng,
        );
        return {
          isValid: distance <= radius_meters + GRACE_BUFFER,
          distance: Math.round(distance),
          allowedRadius: radius_meters,
          source: "geofence_jsonb",
          geofenceType: "CIRCLE",
        };
      }
    }

    // Support POLYGON type geofencing
    if (type === "POLYGON" && geofence.polygon) {
      // Apply India-specific Lat/Lng swap heuristic for robustness
      const polygon = geofence.polygon.map((p) => {
        if (p[0] > 50 && p[1] < 45) return [p[1], p[0]]; // [lng, lat] -> [lat, lon]
        return p;
      });
      const dist = distanceToPolygon(latitude, longitude, polygon);
      return {
        isValid: dist <= GRACE_BUFFER,
        distance: Math.round(Math.max(0, dist)),
        allowedRadius: 0,
        source: "geofence_jsonb",
        geofenceType: "POLYGON",
      };
    }
  }

  // PRIORITY 2: Fallback to legacy fields for backward compatibility
  if (projLat !== null && projLon !== null) {
    const radius = parseFloat(geofence_radius || 200);
    const distance = calculateDistance(latitude, longitude, projLat, projLon);

    return {
      isValid: distance <= radius + GRACE_BUFFER,
      distance: Math.round(distance),
      allowedRadius: radius,
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
