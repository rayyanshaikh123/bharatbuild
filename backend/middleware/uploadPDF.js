const multer = require("multer");

/**
 * Multer configuration for PDF uploads
 * - Memory storage (no disk writes)
 * - 10 MB file size limit
 * - PDF mime type validation
 */
const uploadPDF = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files allowed"), false);
    }
    cb(null, true);
  },
});

module.exports = uploadPDF;
