/**
 * ========================================
 * ATTACHMENT CHECKER SCRIPT
 * ========================================
 *
 * This script checks which records have images/PDFs attached
 * - Purchase Orders with po_pdf
 * - GRNs with bill_image and delivery_proof_image
 * - DPRs (if they have attachments)
 *
 * USAGE: node check_attachments.js
 */

require("dotenv").config();
const pool = require("./db");

async function checkAttachments() {
  const client = await pool.connect();

  try {
    console.log("\n========================================");
    console.log("CHECKING ATTACHMENTS IN DATABASE");
    console.log("========================================\n");

    // ========================================
    // 1. CHECK PURCHASE ORDERS
    // ========================================
    console.log("📦 PURCHASE ORDERS WITH ATTACHMENTS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const poResult = await client.query(`
      SELECT 
        po.id,
        po.po_number,
        po.vendor_name,
        po.total_amount,
        po.status,
        po.created_at,
        mr.title as material_request_title,
        p.name as project_name,
        CASE 
          WHEN po.po_pdf IS NOT NULL THEN 'YES'
          ELSE 'NO'
        END as has_pdf,
        po.po_pdf_mime,
        LENGTH(po.po_pdf) as pdf_size_bytes
      FROM purchase_orders po
      LEFT JOIN material_requests mr ON mr.id = po.material_request_id
      LEFT JOIN projects p ON p.id = po.project_id
      ORDER BY po.created_at DESC
    `);

    if (poResult.rows.length === 0) {
      console.log("   No purchase orders found.\n");
    } else {
      poResult.rows.forEach((po, idx) => {
        console.log(`${idx + 1}. PO Number: ${po.po_number}`);
        console.log(`   Project: ${po.project_name}`);
        console.log(`   Vendor: ${po.vendor_name}`);
        console.log(`   Material Request: ${po.material_request_title}`);
        console.log(
          `   Amount: ₹${parseFloat(po.total_amount).toLocaleString()}`,
        );
        console.log(`   Status: ${po.status}`);
        console.log(`   📎 Has PDF: ${po.has_pdf}`);
        if (po.has_pdf === "YES") {
          console.log(`   📄 PDF Type: ${po.po_pdf_mime}`);
          console.log(
            `   💾 Size: ${(po.pdf_size_bytes / 1024).toFixed(2)} KB`,
          );
        }
        console.log(
          `   🗓️  Created: ${new Date(po.created_at).toLocaleString()}`,
        );
        console.log("");
      });

      const withPdf = poResult.rows.filter((po) => po.has_pdf === "YES").length;
      const withoutPdf = poResult.rows.filter(
        (po) => po.has_pdf === "NO",
      ).length;
      console.log(
        `   Summary: ${withPdf} with PDF, ${withoutPdf} without PDF\n`,
      );
    }

    // ========================================
    // 2. CHECK GRNs (GOODS RECEIPT NOTES)
    // ========================================
    console.log("\n📋 GRNs WITH IMAGES:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const grnResult = await client.query(`
      SELECT 
        g.id,
        po.po_number,
        po.vendor_name,
        p.name as project_name,
        g.received_at,
        g.status,
        se.name as received_by_name,
        CASE 
          WHEN g.bill_image IS NOT NULL THEN 'YES'
          ELSE 'NO'
        END as has_bill_image,
        g.bill_image_mime,
        LENGTH(g.bill_image) as bill_image_size,
        CASE 
          WHEN g.delivery_proof_image IS NOT NULL THEN 'YES'
          ELSE 'NO'
        END as has_delivery_proof,
        g.delivery_proof_image_mime,
        LENGTH(g.delivery_proof_image) as proof_image_size
      FROM goods_receipt_notes g
      LEFT JOIN purchase_orders po ON po.id = g.purchase_order_id
      LEFT JOIN projects p ON p.id = g.project_id
      LEFT JOIN site_engineers se ON se.id = g.received_by
      ORDER BY g.received_at DESC
    `);

    if (grnResult.rows.length === 0) {
      console.log("   No GRNs found.\n");
    } else {
      grnResult.rows.forEach((grn, idx) => {
        console.log(`${idx + 1}. PO Number: ${grn.po_number}`);
        console.log(`   Project: ${grn.project_name}`);
        console.log(`   Vendor: ${grn.vendor_name}`);
        console.log(`   Received By: ${grn.received_by_name}`);
        console.log(`   Status: ${grn.status}`);
        console.log(`   📎 Has Bill Image: ${grn.has_bill_image}`);
        if (grn.has_bill_image === "YES") {
          console.log(`   📷 Bill Type: ${grn.bill_image_mime}`);
          console.log(
            `   💾 Bill Size: ${(grn.bill_image_size / 1024).toFixed(2)} KB`,
          );
        }
        console.log(`   📎 Has Delivery Proof: ${grn.has_delivery_proof}`);
        if (grn.has_delivery_proof === "YES") {
          console.log(`   📷 Proof Type: ${grn.delivery_proof_image_mime}`);
          console.log(
            `   💾 Proof Size: ${(grn.proof_image_size / 1024).toFixed(2)} KB`,
          );
        }
        console.log(
          `   🗓️  Received: ${new Date(grn.received_at).toLocaleString()}`,
        );
        console.log("");
      });

      const withBill = grnResult.rows.filter(
        (g) => g.has_bill_image === "YES",
      ).length;
      const withoutBill = grnResult.rows.filter(
        (g) => g.has_bill_image === "NO",
      ).length;
      const withProof = grnResult.rows.filter(
        (g) => g.has_delivery_proof === "YES",
      ).length;
      const withoutProof = grnResult.rows.filter(
        (g) => g.has_delivery_proof === "NO",
      ).length;

      console.log(`   Summary:`);
      console.log(`   • Bill Images: ${withBill} with, ${withoutBill} without`);
      console.log(
        `   • Delivery Proof: ${withProof} with, ${withoutProof} without\n`,
      );
    }

    // ========================================
    // 3. CHECK DPRs (DAILY PROGRESS REPORTS)
    // ========================================
    console.log("\n📝 DPRs (Daily Progress Reports):");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const dprResult = await client.query(`
      SELECT 
        d.id,
        d.title,
        d.report_date,
        d.status,
        p.name as project_name,
        se.name as engineer_name,
        pi.task_name,
        CASE 
          WHEN d.material_usage IS NOT NULL THEN 'YES'
          ELSE 'NO'
        END as has_material_usage
      FROM dprs d
      LEFT JOIN projects p ON p.id = d.project_id
      LEFT JOIN site_engineers se ON se.id = d.site_engineer_id
      LEFT JOIN plan_items pi ON pi.id = d.plan_item_id
      ORDER BY d.report_date DESC
      LIMIT 20
    `);

    if (dprResult.rows.length === 0) {
      console.log("   No DPRs found.\n");
    } else {
      dprResult.rows.forEach((dpr, idx) => {
        console.log(`${idx + 1}. ${dpr.title}`);
        console.log(`   Project: ${dpr.project_name}`);
        console.log(`   Engineer: ${dpr.engineer_name}`);
        console.log(`   Task: ${dpr.task_name || "N/A"}`);
        console.log(`   Status: ${dpr.status}`);
        console.log(`   📊 Material Usage Data: ${dpr.has_material_usage}`);
        console.log(
          `   🗓️  Date: ${new Date(dpr.report_date).toLocaleDateString()}`,
        );
        console.log("");
      });

      const withMaterial = dprResult.rows.filter(
        (d) => d.has_material_usage === "YES",
      ).length;
      const withoutMaterial = dprResult.rows.filter(
        (d) => d.has_material_usage === "NO",
      ).length;
      console.log(
        `   Summary: ${withMaterial} with material usage, ${withoutMaterial} without\n`,
      );
    }

    // ========================================
    // OVERALL SUMMARY
    // ========================================
    console.log("\n========================================");
    console.log("OVERALL SUMMARY");
    console.log("========================================\n");

    console.log(`📦 Purchase Orders: ${poResult.rows.length} total`);
    console.log(
      `   • ${poResult.rows.filter((po) => po.has_pdf === "YES").length} with PDF attachments`,
    );
    console.log(
      `   • ${poResult.rows.filter((po) => po.has_pdf === "NO").length} without PDF\n`,
    );

    console.log(`📋 GRNs: ${grnResult.rows.length} total`);
    console.log(
      `   • ${grnResult.rows.filter((g) => g.has_bill_image === "YES").length} with bill images`,
    );
    console.log(
      `   • ${grnResult.rows.filter((g) => g.has_delivery_proof === "YES").length} with delivery proof\n`,
    );

    console.log(`📝 DPRs: ${dprResult.rows.length} total (showing last 20)`);
    console.log(
      `   • ${dprResult.rows.filter((d) => d.has_material_usage === "YES").length} with material usage data\n`,
    );

    console.log("========================================\n");
  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

// ========================================
// EXECUTION
// ========================================
checkAttachments()
  .then(() => {
    console.log("✓ Check completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ Check failed:", err.message);
    process.exit(1);
  });
