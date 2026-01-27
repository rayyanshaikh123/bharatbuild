const multer = require("multer");

/**
 * Multer configuration for GRN image uploads
 * - Memory storage (no disk writes)
 * - 5 MB per file limit
 * - Image mime type validation
 * - Handles both bill_image and proof_image
 */
const uploadGRNImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(
        new Error(`Only image files allowed (${file.fieldname})`),
        false,
      );
    }
    cb(null, true);
  },
});

module.exports = uploadGRNImages;
