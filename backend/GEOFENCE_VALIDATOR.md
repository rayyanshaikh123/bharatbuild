# Geo-Fence Validator Utility

## 📍 Overview

Reusable geo-fence validation utility for **site-engineer on-site actions**. Validates whether a user is physically present inside a project's geo-fence before allowing critical transactional operations.

**Single Source of Truth:** `projects.geofence` JSONB column

---

## 🎯 Purpose

Enforce physical presence validation for:

- ✅ Material Request creation
- ✅ GRN (Goods Receipt Note) creation
- ✅ Bill/Proof uploads
- ✅ Any future on-site verification actions

**NOT enforced on:**

- ❌ Read-only APIs
- ❌ Dashboards / Analytics
- ❌ Manager approvals
- ❌ Attendance (uses existing logic)

---

## 📂 File Structure

```
backend/
├── util/
│   └── geofenceValidator.js          ✅ NEW - Reusable validator
├── routes/
│   └── engineer/
│       ├── material.js                ✅ UPDATED - Material requests + bills
│       └── goodsReceiptNotes.js       ✅ UPDATED - GRN creation
```

---

## 🔧 Core Function

### `validateUserInsideProjectGeofence(params)`

**Parameters:**

```javascript
{
  projectId: string,      // Project UUID
  userId: string,         // User UUID
  userRole: string,       // "SITE_ENGINEER" | "MANAGER"
  latitude: number,       // User's current latitude (-90 to 90)
  longitude: number,      // User's current longitude (-180 to 180)
  client: object          // Optional PostgreSQL client (for transactions)
}
```

**Returns:** `Promise<boolean>` - Always returns `true` if validation passes

**Throws:** Error with code `"OUTSIDE_PROJECT_GEOFENCE"` if user is outside

---

## 🗺️ Supported Geo-fence Types

### 1. CIRCLE Geo-fence

**JSONB Structure:**

```json
{
  "type": "CIRCLE",
  "center": {
    "lat": 28.6139,
    "lng": 77.209
  },
  "radius_meters": 500
}
```

**Algorithm:** Haversine formula

- Calculates great-circle distance between two points
- Valid if: `distance ≤ radius_meters`

---

### 2. POLYGON Geo-fence

**JSONB Structure:**

```json
{
  "type": "POLYGON",
  "coordinates": [
    [77.209, 28.6139],
    [77.21, 28.6145],
    [77.2095, 28.615],
    [77.209, 28.6139]
  ]
}
```

**Format:** `[[longitude, latitude], ...]` (GeoJSON format)

**Algorithm:** Ray casting (point-in-polygon)

- Draws ray from point to infinity
- Counts polygon edge intersections
- Odd count = inside, Even count = outside

---

## 🔐 Access Validation

Before checking geo-fence, validates user belongs to project:

| Role          | Table                    | Condition           |
| ------------- | ------------------------ | ------------------- |
| SITE_ENGINEER | `project_site_engineers` | `status = 'ACTIVE'` |
| MANAGER       | `project_managers`       | `status = 'ACTIVE'` |

---

## 🚨 Error Handling

### Outside Geo-fence Error

**Response:**

```json
{
  "error": "OUTSIDE_PROJECT_GEOFENCE",
  "message": "You must be inside the project site to perform this action"
}
```

**HTTP Status:** `403 Forbidden`

**Error Object:**

```javascript
{
  code: "OUTSIDE_PROJECT_GEOFENCE",
  statusCode: 403,
  message: "You must be inside the project site to perform this action",
  details: {
    geofence_type: "CIRCLE" | "POLYGON",
    distance_meters: 1234  // Only for CIRCLE
  }
}
```

---

## 📝 Audit Logging

When geo-fence validation **fails**, creates audit log:

```sql
INSERT INTO audit_logs (
  entity_type,
  entity_id,
  action,
  acted_by_role,
  acted_by_id,
  project_id,
  category,
  change_summary
) VALUES (
  'GEOFENCE_VALIDATION',
  '<project_id>',
  'ACCESS_DENIED',
  '<SITE_ENGINEER|MANAGER>',
  '<user_id>',
  '<project_id>',
  'SECURITY',
  '{
    "reason": "Outside project geofence",
    "geofence_type": "CIRCLE",
    "user_location": { "latitude": 28.6139, "longitude": 77.2090 },
    "distance_meters": 1234
  }'
);
```

---

## 🔁 Validation Flow

```
1. Validate UUID format (projectId)
2. Validate coordinates (lat: -90 to 90, lng: -180 to 180)
3. Check user belongs to project (project_site_engineers/project_managers)
4. Fetch project geofence (projects.geofence)
5. If geofence IS NULL → ✅ ALLOW (do NOT block)
6. If geofence type = "CIRCLE":
   - Calculate distance using Haversine
   - If distance ≤ radius → ✅ ALLOW
   - If distance > radius → ❌ DENY + audit log
7. If geofence type = "POLYGON":
   - Use ray casting algorithm
   - If inside polygon → ✅ ALLOW
   - If outside polygon → ❌ DENY + audit log
8. If geofence format invalid → ✅ ALLOW (do NOT block)
```

---

## 🔌 Integration

### Material Request Creation

**File:** `routes/engineer/material.js`

**Endpoint:** `POST /engineer/material/request`

**Request Body (new fields):**

```json
{
  "project_id": "uuid",
  "title": "Cement",
  "category": "RAW_MATERIAL",
  "quantity": 100,
  "latitude": 28.6139,    // ← NEW
  "longitude": 77.2090,   // ← NEW
  ...
}
```

**Validation:**

```javascript
// Geo-fence validation (if coordinates provided)
if (latitude !== undefined && longitude !== undefined) {
  try {
    await validateUserInsideProjectGeofence({
      projectId: project_id,
      userId: engineerId,
      userRole: "SITE_ENGINEER",
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    });
  } catch (err) {
    if (err.code === "OUTSIDE_PROJECT_GEOFENCE") {
      return res.status(403).json({
        error: err.code,
        message: err.message,
      });
    }
    throw err;
  }
}
```

**Note:** Validation is **optional** - only runs if `latitude` and `longitude` are provided.

---

### GRN Creation

**File:** `routes/engineer/goodsReceiptNotes.js`

**Endpoint:** `POST /engineer/goods-receipt-notes`

**Request Body (new fields):**

```json
{
  "projectId": "uuid",
  "purchaseOrderId": "uuid",
  "materialRequestId": "uuid",
  "receivedItems": [...],
  "latitude": 28.6139,    // ← NEW
  "longitude": 77.2090,   // ← NEW
  "bill_image": "...",
  "delivery_proof_image": "..."
}
```

**Validation:** Same pattern as Material Request

---

### Bill Upload

**File:** `routes/engineer/material.js`

**Endpoint:** `POST /engineer/material/upload-bill`

**Request Body (new fields):**

```json
{
  "material_request_id": "uuid",
  "project_id": "uuid",
  "vendor_name": "ABC Suppliers",
  "bill_amount": 50000,
  "latitude": 28.6139,    // ← NEW
  "longitude": 77.2090,   // ← NEW
  ...
}
```

**Validation:** Same pattern as Material Request

---

## 🧪 Testing

### Test 1: No Geo-fence (Allow All)

**Setup:**

```sql
UPDATE projects
SET geofence = NULL
WHERE id = '<project_id>';
```

**Expected:** All requests succeed regardless of coordinates

---

### Test 2: CIRCLE Geo-fence (Inside)

**Setup:**

```sql
UPDATE projects
SET geofence = '{
  "type": "CIRCLE",
  "center": {"lat": 28.6139, "lng": 77.2090},
  "radius_meters": 500
}'::jsonb
WHERE id = '<project_id>';
```

**Test Request:**

```json
{
  "latitude": 28.614,
  "longitude": 77.2091
}
```

**Expected:** ✅ Request succeeds (inside 500m radius)

---

### Test 3: CIRCLE Geo-fence (Outside)

**Same setup as Test 2**

**Test Request:**

```json
{
  "latitude": 28.62,
  "longitude": 77.22
}
```

**Expected:** ❌ 403 Error + audit log created

**Response:**

```json
{
  "error": "OUTSIDE_PROJECT_GEOFENCE",
  "message": "You must be inside the project site to perform this action"
}
```

**Audit Log:**

```sql
SELECT * FROM audit_logs
WHERE entity_type = 'GEOFENCE_VALIDATION'
AND action = 'ACCESS_DENIED'
ORDER BY timestamp DESC
LIMIT 1;
```

---

### Test 4: POLYGON Geo-fence (Inside)

**Setup:**

```sql
UPDATE projects
SET geofence = '{
  "type": "POLYGON",
  "coordinates": [
    [77.2080, 28.6130],
    [77.2100, 28.6130],
    [77.2100, 28.6150],
    [77.2080, 28.6150],
    [77.2080, 28.6130]
  ]
}'::jsonb
WHERE id = '<project_id>';
```

**Test Request:**

```json
{
  "latitude": 28.614,
  "longitude": 77.209
}
```

**Expected:** ✅ Request succeeds (point inside polygon)

---

### Test 5: No Coordinates Provided

**Test Request:**

```json
{
  "project_id": "uuid",
  "title": "Cement"
  // No latitude/longitude
}
```

**Expected:** ✅ Request succeeds (validation skipped)

**Note:** Geo-fence validation is **optional** and only runs when coordinates are provided.

---

## 🛡️ Security Rules

### 1. No Blocking on Missing Geo-fence

- If `geofence` IS NULL → Allow action
- If `geofence` format invalid → Allow action
- **Rationale:** Avoid blocking legitimate work due to incomplete setup

### 2. User Access Validation First

- Always validates user belongs to project
- Checks `status = 'ACTIVE'` or `'APPROVED'`
- Prevents unauthorized access regardless of location

### 3. Audit Trail

- Every denial is logged
- Includes user location and distance
- Category: `SECURITY` for compliance

### 4. No Caching

- Always fetches fresh geofence data
- Ensures real-time boundary updates

---

## 📊 Database Schema

**No schema changes required** ✅

Uses existing:

- `projects.geofence` (JSONB) - Already exists
- `project_site_engineers` - Already exists
- `project_managers` - Already exists
- `audit_logs` - Already exists

---

## 🚫 Constraints & Limitations

### What This Does NOT Do

❌ Modify attendance logic (uses separate legacy function)  
❌ Change database schema  
❌ Add cron jobs  
❌ Cache geofence results  
❌ Use `projects.latitude/longitude` columns (legacy)  
❌ Enforce on read-only APIs  
❌ Enforce on Manager approvals  
❌ Block if coordinates not provided

---

## 🔄 Backward Compatibility

### Legacy Support

The utility includes `validateGeofence()` function for backward compatibility with attendance system:

```javascript
// Legacy function (DO NOT USE for new code)
const result = await validateGeofence(pool, projectId, latitude, longitude);

// Returns:
{
  isValid: true/false,
  distance: 123,
  allowedRadius: 500,
  source: "geofence_jsonb" | "legacy_fields" | "none",
  geofenceType: "CIRCLE" | "POLYGON" | "NONE"
}
```

**Use for:** Existing attendance system only  
**New code:** Use `validateUserInsideProjectGeofence()` instead

---

## 📋 Function Exports

```javascript
module.exports = {
  calculateDistance, // Haversine formula
  isPointInPolygon, // Ray casting algorithm
  validateUserInsideProjectGeofence, // NEW - Primary function
  validateGeofence, // Legacy - Attendance only
};
```

---

## 🧭 Usage Examples

### Example 1: Material Request with Geo-fence

```javascript
const {
  validateUserInsideProjectGeofence,
} = require("../../util/geofenceValidator");

router.post("/request", engineerCheck, async (req, res) => {
  const { project_id, latitude, longitude } = req.body;

  if (latitude && longitude) {
    try {
      await validateUserInsideProjectGeofence({
        projectId: project_id,
        userId: req.user.id,
        userRole: "SITE_ENGINEER",
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });
    } catch (err) {
      if (err.code === "OUTSIDE_PROJECT_GEOFENCE") {
        return res.status(403).json({
          error: err.code,
          message: err.message,
        });
      }
      throw err;
    }
  }

  // Proceed with material request creation...
});
```

---

### Example 2: Within Transaction

```javascript
const client = await pool.connect();

try {
  await client.query("BEGIN");

  // Validate geofence within transaction
  await validateUserInsideProjectGeofence({
    projectId,
    userId,
    userRole: "SITE_ENGINEER",
    latitude,
    longitude,
    client, // ← Pass transaction client
  });

  // Proceed with database operations...

  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");

  if (err.code === "OUTSIDE_PROJECT_GEOFENCE") {
    return res.status(403).json({
      error: err.code,
      message: err.message,
    });
  }
  throw err;
} finally {
  client.release();
}
```

---

## 🎓 Future Enhancements

**Potential additions (NOT implemented):**

1. **Multi-polygon support**
   - Projects with multiple geo-fenced areas
   - OR logic: inside ANY polygon = allowed

2. **Time-based geo-fencing**
   - Different boundaries for day/night shifts
   - Seasonal adjustments

3. **Geo-fence breach notifications**
   - Real-time alerts to managers
   - SMS/Push on repeated violations

4. **Distance-based warnings**
   - Warning at 80% of radius
   - Error at 100%

---

## 📞 Support

**Files:**

- `util/geofenceValidator.js` - Core utility
- `routes/engineer/material.js` - Material requests + bills
- `routes/engineer/goodsReceiptNotes.js` - GRN creation

**Audit Logs:**

```sql
SELECT * FROM audit_logs
WHERE entity_type = 'GEOFENCE_VALIDATION'
ORDER BY timestamp DESC;
```

**Error Codes:**

- `OUTSIDE_PROJECT_GEOFENCE` - User outside geo-fence

---

**Implementation Date:** 2026-01-25  
**Status:** ✅ Complete  
**Breaking Changes:** None  
**Dependencies:** None (pure JavaScript + existing DB schema)
