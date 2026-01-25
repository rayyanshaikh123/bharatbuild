const express = require("express");
const pool = require("../../db");
const router = express.Router();
const engineerCheck = require("../../middleware/engineerCheck");
const { verifyEngineerAccess } = require("../../util/engineerPermissions");
const upload = require("../../middleware/uploadImage");
const { getISTDate } = require("../../util/dateUtils");

// Check if engineer is ACTIVE in project
async function engineerProjectStatusCheck(engineerId, projectId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM project_site_engineers
     WHERE site_engineer_id = $1 
       AND project_id = $2 
       AND status IN ('APPROVED', 'ACTIVE')`,
    [engineerId, projectId],
  );
  return parseInt(result.rows[0].count) > 0;
}

/* ---------------- GET TODAY'S ATTENDANCE ---------------- */
router.get("/today", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId, date } = req.query;
    const reportDate = date || new Date().toISOString().split("T")[0];

    if (!projectId)
      return res.status(400).json({ error: "projectId is required" });

    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) return res.status(403).json({ error: access.error });

    const result = await pool.query(
      `SELECT a.*, l.name, l.phone, l.skill_type
       FROM attendance a
       JOIN labours l ON a.labour_id = l.id
       WHERE a.project_id = $1 AND a.attendance_date = $2`,
      [projectId, reportDate],
    );

    res.json({ attendance: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- MARK MANUAL ATTENDANCE ---------------- */
// EXCEPTION MODE ONLY: Manual attendance is only allowed when geo-fence is not possible
// Requires: Labour must have applied to labour request
// Status: PENDING (requires site engineer approval)
router.post("/mark", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { labourId, projectId, date, status } = req.body;
    const reportDate = date || new Date().toISOString().split("T")[0];

    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) return res.status(403).json({ error: access.error });

    // Verify labour has applied to a labour request for this project
    const participantCheck = await pool.query(
      `SELECT lrp.id 
       FROM labour_request_participants lrp
       JOIN labour_requests lr ON lrp.labour_request_id = lr.id
       WHERE lrp.labour_id = $1 AND lr.project_id = $2 AND lrp.status = 'APPROVED'`,
      [labourId, projectId],
    );

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({
        error:
          "Labour must be approved for a labour request before manual attendance can be marked",
      });
    }

    // Manual attendance is created with PENDING status (requires approval)
    const result = await pool.query(
      `INSERT INTO attendance (project_id, labour_id, site_engineer_id, attendance_date, status, is_manual)
       VALUES ($1, $2, $3, $4, 'PENDING', true)
       ON CONFLICT (project_id, labour_id, attendance_date) 
       DO UPDATE SET status = 'PENDING', site_engineer_id = $3, is_manual = true
       RETURNING *`,
      [projectId, labourId, engineerId, reportDate],
    );

    res.json({ attendance: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- SEARCH LABOURER BY PHONE ---------------- */
router.get("/search-labour", engineerCheck, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "Phone is required" });

    const result = await pool.query(
      "SELECT id, name, phone, skill_type FROM labours WHERE phone = $1",
      [phone],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Labourer not found" });
    res.json({ labour: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- MANUAL ATTENDANCE CHECK-IN WITH FACE VERIFICATION ---------------- */
// Creates a manual attendance record for local labours (who don't use the app)
// Stores name and skill directly, no labour lookup required
router.post(
  "/manual/check-in",
  engineerCheck,
  upload.single("faceImage"),
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { projectId, name, category, faceFeatures } = req.body;
      const attendanceDate = getISTDate();

      if (!projectId || !name || !category) {
        return res.status(400).json({
          error: "Missing required fields: projectId, name, category",
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Face image is required" });
      }

      if (!faceFeatures) {
        return res.status(400).json({ error: "Face features are required" });
      }

      const access = await verifyEngineerAccess(engineerId, projectId);
      if (!access.allowed) return res.status(403).json({ error: access.error });

      // Parse face features JSON
      let parsedFaceFeatures;
      try {
        parsedFaceFeatures =
          typeof faceFeatures === "string"
            ? JSON.parse(faceFeatures)
            : faceFeatures;
      } catch (e) {
        return res
          .status(400)
          .json({ error: "Invalid face features JSON format" });
      }

      // Create or get manual labour record (using unique constraint on project_id, name, skill)
      const manualLabourRes = await pool.query(
        `INSERT INTO manual_attendance_labours (project_id, name, skill, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, name, skill) DO UPDATE SET project_id = EXCLUDED.project_id
       RETURNING id`,
        [projectId, name, category, engineerId],
      );

      if (manualLabourRes.rows.length === 0) {
        return res
          .status(500)
          .json({ error: "Failed to create manual labour record" });
      }

      const manualLabourId = manualLabourRes.rows[0].id;

      // Check if attendance already exists for this manual labour on this date
      const existingAttendance = await pool.query(
        `SELECT id FROM attendance 
       WHERE project_id = $1 
         AND manual_labour_id = $2 
         AND attendance_date = $3 
         AND is_manual = true`,
        [projectId, manualLabourId, attendanceDate],
      );

      let attendanceId;
      if (existingAttendance.rows.length > 0) {
        // Update existing attendance
        attendanceId = existingAttendance.rows[0].id;
        const updateRes = await pool.query(
          `UPDATE attendance 
         SET 
           site_engineer_id = $1,
           check_in_time = CURRENT_TIMESTAMP,
           check_in_face_image = $2,
           check_in_face_features = $3,
           face_verification_status = 'PENDING',
           status = 'PENDING',
           is_manual = true
         WHERE id = $4
         RETURNING *`,
          [
            engineerId,
            req.file.buffer,
            JSON.stringify(parsedFaceFeatures),
            attendanceId,
          ],
        );
        var result = updateRes;
      } else {
        // Create new attendance
        const insertRes = await pool.query(
          `INSERT INTO attendance (
          project_id, site_engineer_id, attendance_date, 
          status, is_manual, check_in_time,
          check_in_face_image, check_in_face_features, face_verification_status,
          manual_labour_id
        )
        VALUES ($1, $2, $3, 'PENDING', true, CURRENT_TIMESTAMP, $4, $5, 'PENDING', $6)
        RETURNING *`,
          [
            projectId,
            engineerId,
            attendanceDate,
            req.file.buffer, // face image as bytea
            JSON.stringify(parsedFaceFeatures), // face features as jsonb
            manualLabourId,
          ],
        );
        var result = insertRes;
      }

      res.json({
        attendance: result.rows[0],
        message: "Check-in successful with face verification",
      });
    } catch (err) {
      console.error("Manual check-in error:", err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);

/* ---------------- MANUAL ATTENDANCE CHECKOUT WITH FACE VERIFICATION ---------------- */
// Verifies checkout face against check-in face and updates attendance
router.post(
  "/manual/checkout",
  engineerCheck,
  upload.single("faceImage"),
  async (req, res) => {
    try {
      const engineerId = req.user.id;
      const { attendanceId, faceFeatures } = req.body;

      if (!attendanceId) {
        return res.status(400).json({ error: "attendanceId is required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Face image is required" });
      }

      if (!faceFeatures) {
        return res.status(400).json({ error: "Face features are required" });
      }

      // Get attendance record with check-in face features
      const attendanceRes = await pool.query(
        `SELECT a.*, p.id as project_id
       FROM attendance a
       JOIN projects p ON a.project_id = p.id
       WHERE a.id = $1 AND a.is_manual = true`,
        [attendanceId],
      );

      if (attendanceRes.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Manual attendance record not found" });
      }

      const attendance = attendanceRes.rows[0];

      // Check if check-in face features exist
      if (!attendance.check_in_face_features) {
        return res.status(400).json({
          error: "Check-in face features not found. Cannot verify checkout.",
        });
      }

      // Verify engineer has access to this project
      const access = await verifyEngineerAccess(
        engineerId,
        attendance.project_id,
      );
      if (!access.allowed) return res.status(403).json({ error: access.error });

      // Parse face features
      let checkInFeatures, checkoutFeatures;
      try {
        checkInFeatures =
          typeof attendance.check_in_face_features === "string"
            ? JSON.parse(attendance.check_in_face_features)
            : attendance.check_in_face_features;

        checkoutFeatures =
          typeof faceFeatures === "string"
            ? JSON.parse(faceFeatures)
            : faceFeatures;
      } catch (e) {
        return res
          .status(400)
          .json({ error: "Invalid face features JSON format" });
      }

      // Perform face verification (server-side comparison)
      console.log("[Face Verification] Starting comparison...");
      console.log(
        "[Face Verification] Check-in features:",
        JSON.stringify(checkInFeatures).substring(0, 200),
      );
      console.log(
        "[Face Verification] Checkout features:",
        JSON.stringify(checkoutFeatures).substring(0, 200),
      );

      const verificationResult = compareFaceFeatures(
        checkInFeatures,
        checkoutFeatures,
      );

      console.log("[Face Verification] Result:", {
        verified: verificationResult.verified,
        confidence: verificationResult.confidence,
        matches: verificationResult.matches,
        totalChecks: verificationResult.totalChecks,
      });

      // Update attendance with checkout data
      // If verified, set status to APPROVED (valid status values: PENDING, APPROVED, REJECTED)
      const updateRes = await pool.query(
        `UPDATE attendance 
       SET 
         check_out_time = CURRENT_TIMESTAMP,
         check_out_face_image = $1,
         check_out_face_features = $2,
         face_verification_status = $3,
         face_verification_confidence = $4,
         status = CASE WHEN $3 = 'VERIFIED' THEN 'APPROVED' ELSE status END
       WHERE id = $5
       RETURNING *`,
        [
          req.file.buffer, // checkout face image
          JSON.stringify(checkoutFeatures), // checkout face features
          verificationResult.verified ? "VERIFIED" : "FAILED",
          verificationResult.confidence || 0,
          attendanceId,
        ],
      );

      res.json({
        attendance: updateRes.rows[0],
        verification: {
          verified: verificationResult.verified,
          confidence: verificationResult.confidence,
          message: verificationResult.verified
            ? "Face verification successful"
            : "Face verification failed - faces do not match",
        },
      });
    } catch (err) {
      console.error("Manual checkout error:", err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  },
);

/* ---------------- GET MANUAL ATTENDANCE RECORDS ---------------- */
// Get all manual attendance records for today (or specified date)
router.get("/manual/list", engineerCheck, async (req, res) => {
  try {
    const engineerId = req.user.id;
    const { projectId, date } = req.query;
    const attendanceDate = date || getISTDate();

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const access = await verifyEngineerAccess(engineerId, projectId);
    if (!access.allowed) return res.status(403).json({ error: access.error });

    const result = await pool.query(
      `SELECT 
        a.id,
        a.labour_id,
        a.attendance_date,
        a.check_in_time,
        a.check_out_time,
        a.status,
        COALESCE(a.face_verification_status, 'PENDING') as face_verification_status,
        a.check_in_face_features,
        a.check_out_face_features,
        COALESCE(ml.name, l.name) as name,
        l.phone,
        COALESCE(ml.skill, l.skill_type) as category
       FROM attendance a
       LEFT JOIN manual_attendance_labours ml ON a.manual_labour_id = ml.id
       LEFT JOIN labours l ON a.labour_id = l.id
       WHERE a.project_id = $1 
         AND a.attendance_date = $2 
         AND a.is_manual = true
       ORDER BY a.check_in_time DESC`,
      [projectId, attendanceDate],
    );

    // Convert bytea images to base64 for frontend (optional - can be omitted for performance)
    const records = result.rows.map((row) => ({
      ...row,
      // Note: Images are stored as bytea but not included in list view for performance
      // Use separate endpoint to fetch images if needed
    }));

    res.json({ attendance: records });
  } catch (err) {
    console.error("Get manual attendance error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- HELPER: Compare Face Features ---------------- */
// Server-side face feature comparison
function compareFaceFeatures(features1, features2) {
  // Must have required landmarks
  const requiredKeys = ["leftEye", "rightEye", "noseBase", "mouth"];
  const keys1 = Object.keys(features1.landmarks || {});
  const keys2 = Object.keys(features2.landmarks || {});

  if (
    !requiredKeys.every((k) => keys1.includes(k)) ||
    !requiredKeys.every((k) => keys2.includes(k))
  ) {
    console.log("[Face Verification] Missing required landmarks");
    return {
      verified: false,
      confidence: 0,
      reason: "Missing required landmarks",
    };
  }

  // Calculate ratios from features
  const ratios1 = calculateRatios(features1);
  const ratios2 = calculateRatios(features2);

  // Balanced comparison: 8% tolerance for ratios, require 3 out of 4 to match
  // This allows for slight variations (lighting, angle, expression) while still rejecting different faces
  let matches = 0;
  let totalChecks = 0;
  const tolerance = 0.08; // 8% tolerance - balanced for same face variations
  const ratioDiffs = [];

  // Ratio 1: Eye Distance / Nose-Mouth Distance
  if (ratios1.eyeToNoseMouth != null && ratios2.eyeToNoseMouth != null) {
    totalChecks++;
    const diff = Math.abs(ratios1.eyeToNoseMouth - ratios2.eyeToNoseMouth);
    const threshold = ratios1.eyeToNoseMouth * tolerance;
    const match = diff < threshold;
    if (match) matches++;
    ratioDiffs.push({
      name: "eyeToNoseMouth",
      diff,
      threshold,
      match,
      ratio1: ratios1.eyeToNoseMouth,
      ratio2: ratios2.eyeToNoseMouth,
    });
  }

  // Ratio 2: Eye-Nose Distance / Nose-Mouth Distance
  if (
    ratios1.eyeNoseToNoseMouth != null &&
    ratios2.eyeNoseToNoseMouth != null
  ) {
    totalChecks++;
    const diff = Math.abs(
      ratios1.eyeNoseToNoseMouth - ratios2.eyeNoseToNoseMouth,
    );
    const threshold = ratios1.eyeNoseToNoseMouth * tolerance;
    const match = diff < threshold;
    if (match) matches++;
    ratioDiffs.push({
      name: "eyeNoseToNoseMouth",
      diff,
      threshold,
      match,
      ratio1: ratios1.eyeNoseToNoseMouth,
      ratio2: ratios2.eyeNoseToNoseMouth,
    });
  }

  // Ratio 3: Face Width / Face Height
  if (ratios1.faceAspect != null && ratios2.faceAspect != null) {
    totalChecks++;
    const diff = Math.abs(ratios1.faceAspect - ratios2.faceAspect);
    const threshold = ratios1.faceAspect * tolerance;
    const match = diff < threshold;
    if (match) matches++;
    ratioDiffs.push({
      name: "faceAspect",
      diff,
      threshold,
      match,
      ratio1: ratios1.faceAspect,
      ratio2: ratios2.faceAspect,
    });
  }

  // Ratio 4: Eye Distance / Face Width
  if (ratios1.eyeToFaceWidth != null && ratios2.eyeToFaceWidth != null) {
    totalChecks++;
    const diff = Math.abs(ratios1.eyeToFaceWidth - ratios2.eyeToFaceWidth);
    const threshold = ratios1.eyeToFaceWidth * tolerance;
    const match = diff < threshold;
    if (match) matches++;
    ratioDiffs.push({
      name: "eyeToFaceWidth",
      diff,
      threshold,
      match,
      ratio1: ratios1.eyeToFaceWidth,
      ratio2: ratios2.eyeToFaceWidth,
    });
  }

  // Additional check: Absolute distance differences (more lenient for same face)
  let distanceMatches = 0;
  let distanceChecks = 0;
  const distanceTolerance = 0.15; // 15% for absolute distances (allows for camera distance variations)

  if (features1.eyeDistance > 0 && features2.eyeDistance > 0) {
    distanceChecks++;
    const eyeDistDiff =
      Math.abs(features1.eyeDistance - features2.eyeDistance) /
      features1.eyeDistance;
    if (eyeDistDiff < distanceTolerance) distanceMatches++;
  }

  if (features1.noseMouthDistance > 0 && features2.noseMouthDistance > 0) {
    distanceChecks++;
    const noseMouthDiff =
      Math.abs(features1.noseMouthDistance - features2.noseMouthDistance) /
      features1.noseMouthDistance;
    if (noseMouthDiff < distanceTolerance) distanceMatches++;
  }

  // Require at least 3 out of 4 ratios to match (75% match rate)
  // AND at least 1 distance check OR high ratio match rate (4/4)
  // This balances: same faces pass, different faces fail
  const ratioMatchRate = totalChecks > 0 ? matches / totalChecks : 0;
  const minRatioMatches = totalChecks >= 4 && matches >= 3; // At least 3 out of 4
  const perfectMatch = matches === totalChecks && totalChecks >= 4; // All 4 match
  const distancesMatch = distanceChecks >= 1 && distanceMatches >= 1;

  // Verify if: (3+ ratios match AND 1+ distance) OR (all 4 ratios match)
  const verified = (minRatioMatches && distancesMatch) || perfectMatch;

  const confidence = totalChecks > 0 ? matches / totalChecks : 0;

  // Log for debugging
  console.log("[Face Verification]", {
    verified,
    ratioMatches: `${matches}/${totalChecks}`,
    distanceMatches: `${distanceMatches}/${distanceChecks}`,
    minRatioMatches,
    perfectMatch,
    distancesMatch,
    ratioMatchRate: ratioMatchRate.toFixed(2),
    ratioDiffs: ratioDiffs
      .map(
        (r) =>
          `${r.name}: ${r.match ? "✓" : "✗"} (diff: ${r.diff.toFixed(4)}, threshold: ${r.threshold.toFixed(4)})`,
      )
      .join(", "),
  });

  return { verified, confidence, matches, totalChecks, ratioDiffs };
}

function calculateRatios(features) {
  const ratios = {};
  const f = features;

  if (f.noseMouthDistance > 0) {
    if (f.eyeDistance > 0) {
      ratios.eyeToNoseMouth = f.eyeDistance / f.noseMouthDistance;
    }
    if (f.eyeToNoseDistance > 0) {
      ratios.eyeNoseToNoseMouth = f.eyeToNoseDistance / f.noseMouthDistance;
    }
  }

  if (f.faceHeight > 0 && f.faceWidth > 0) {
    ratios.faceAspect = f.faceWidth / f.faceHeight;
  }

  if (f.faceWidth > 0 && f.eyeDistance > 0) {
    ratios.eyeToFaceWidth = f.eyeDistance / f.faceWidth;
  }

  return ratios;
}

module.exports = router;
