const express = require("express");
const router = express.Router();
const purchaseManagerCheck = require("../../middleware/purchaseManagerCheck");

/* ---------------- CHECK AUTH ---------------- */
router.get("/check-auth", purchaseManagerCheck, (req, res) => {
  res.json({
    authenticated: true,
    user: req.user,
  });
});

module.exports = router;
