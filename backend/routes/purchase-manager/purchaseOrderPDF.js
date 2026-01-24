const express = require("express");
const pool = require("../../db");
const router = express.Router();
const purchaseManagerCheck = require("../../middleware/purchaseManagerCheck");

/* ---------------- DOWNLOAD PO PDF (STREAM) ---------------- */
router.get("/:poId/pdf", purchaseManagerCheck, async (req, res) => {
  try {
    const purchaseManagerId = req.user.id;
    const { poId } = req.params;

    // Get PDF with ownership verification
    const result = await pool.query(
      `SELECT po_pdf, po_pdf_mime, po_number
       FROM purchase_orders
       WHERE id = $1 AND created_by = $2`,
      [poId, purchaseManagerId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Purchase order not found or access denied" });
    }

    const po = result.rows[0];

    if (!po.po_pdf) {
      return res
        .status(404)
        .json({ error: "PDF not available for this purchase order" });
    }

    // Stream PDF with correct headers
    res.setHeader("Content-Type", po.po_pdf_mime || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="PO_${po.po_number}.pdf"`,
    );
    res.send(po.po_pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
