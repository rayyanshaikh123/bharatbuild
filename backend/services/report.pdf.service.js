const PDFDocument = require("pdfkit");
const { formatCurrency } = require("../util/reportFilters");

/**
 * PDF Report Generation Service
 * Generates professional PDF reports from report data
 */

/**
 * Generate Financial Report PDF
 * @param {Object} reportData - Report data from report.service
 * @param {Object} filters - Filter parameters
 * @returns {Buffer} PDF buffer
 */
async function generateFinancialPDF(reportData, filters) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header
      doc
        .fontSize(24)
        .fillColor("#2C3E50")
        .text("Financial Report", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor("#7F8C8D")
        .text(
          `Period: ${filters.start_date.toLocaleDateString()} - ${filters.end_date.toLocaleDateString()}`,
          { align: "center" },
        );
      doc.moveDown(2);

      // Executive Summary
      doc.fontSize(16).fillColor("#34495E").text("Executive Summary");
      doc.moveDown(0.5);

      const summary = reportData.summary;
      doc.fontSize(11).fillColor("#2C3E50");

      addKeyValue(doc, "Total Budget", formatCurrency(summary.total_budget));
      addKeyValue(
        doc,
        "Total Invested",
        formatCurrency(summary.total_invested),
      );
      addKeyValue(doc, "Budget Utilization", `${summary.budget_utilization}%`);
      addKeyValue(
        doc,
        "Material Costs",
        formatCurrency(summary.total_material_cost),
      );
      addKeyValue(doc, "Wage Costs", formatCurrency(summary.total_wages));
      addKeyValue(
        doc,
        "Adjustments",
        formatCurrency(summary.total_adjustments),
      );

      doc.moveDown(2);

      // Project Breakdown
      if (reportData.breakdown.by_project.length > 0) {
        doc.fontSize(16).fillColor("#34495E").text("Project Breakdown");
        doc.moveDown(0.5);

        // Table header
        const tableTop = doc.y;
        doc.fontSize(10).fillColor("#FFFFFF");
        doc.rect(50, tableTop, 500, 20).fill("#3498DB");
        doc.text("Project", 60, tableTop + 5, { width: 150 });
        doc.text("Budget", 210, tableTop + 5, { width: 80 });
        doc.text("Invested", 290, tableTop + 5, { width: 80 });
        doc.text("Materials", 370, tableTop + 5, { width: 80 });
        doc.text("Wages", 450, tableTop + 5, { width: 80 });

        // Table rows
        let y = tableTop + 25;
        doc.fontSize(9).fillColor("#2C3E50");

        reportData.breakdown.by_project
          .slice(0, 10)
          .forEach((project, index) => {
            if (y > 700) {
              doc.addPage();
              y = 50;
            }

            const bgColor = index % 2 === 0 ? "#ECF0F1" : "#FFFFFF";
            doc.rect(50, y, 500, 20).fill(bgColor);
            doc.fillColor("#2C3E50");
            doc.text(project.name.substring(0, 20), 60, y + 5, { width: 150 });
            doc.text(formatCurrency(project.budget), 210, y + 5, { width: 80 });
            doc.text(formatCurrency(project.current_invested), 290, y + 5, {
              width: 80,
            });
            doc.text(formatCurrency(project.material_cost), 370, y + 5, {
              width: 80,
            });
            doc.text(formatCurrency(project.wage_cost), 450, y + 5, {
              width: 80,
            });
            y += 20;
          });

        doc.moveDown(2);
      }

      // Category Breakdown
      if (Object.keys(reportData.breakdown.by_category).length > 0) {
        if (doc.y > 650) doc.addPage();

        doc.fontSize(16).fillColor("#34495E").text("Material Cost by Category");
        doc.moveDown(0.5);

        Object.entries(reportData.breakdown.by_category)
          .slice(0, 10)
          .forEach(([category, amount]) => {
            addKeyValue(doc, category, formatCurrency(amount));
          });
      }

      // Footer
      addFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Project Progress PDF
 */
async function generateProgressPDF(reportData, filters) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header
      doc
        .fontSize(24)
        .fillColor("#2C3E50")
        .text("Project Progress Report", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor("#7F8C8D")
        .text(
          `Period: ${filters.start_date.toLocaleDateString()} - ${filters.end_date.toLocaleDateString()}`,
          { align: "center" },
        );
      doc.moveDown(2);

      // Summary
      doc.fontSize(16).fillColor("#34495E").text("Summary");
      doc.moveDown(0.5);

      const planItems = reportData.summary.plan_items;
      doc.fontSize(11).fillColor("#2C3E50");

      addKeyValue(doc, "Total Plan Items", planItems.total);
      addKeyValue(
        doc,
        "Completed",
        `${planItems.completed} (${planItems.completion_percentage}%)`,
      );
      addKeyValue(doc, "Pending", planItems.pending);
      addKeyValue(doc, "Delayed", planItems.delayed);
      addKeyValue(doc, "In Progress", planItems.in_progress);
      addKeyValue(doc, "Total DPRs", reportData.summary.total_dprs);

      doc.moveDown(2);

      // Delayed Items
      if (reportData.delayed_items.length > 0) {
        doc.fontSize(16).fillColor("#E74C3C").text("Delayed Items");
        doc.moveDown(0.5);

        reportData.delayed_items.slice(0, 15).forEach((item, index) => {
          if (doc.y > 700) doc.addPage();

          doc
            .fontSize(11)
            .fillColor("#2C3E50")
            .text(`${index + 1}. ${item.task_name}`);
          doc.fontSize(9).fillColor("#7F8C8D");
          doc.text(`   Project: ${item.project_name}`);
          doc.text(`   Delay: ${item.delay_days} days`);
          if (item.delay_info && item.delay_info.delay_reason) {
            doc.text(`   Reason: ${item.delay_info.delay_reason}`);
          }
          doc.moveDown(0.5);
        });
      }

      addFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Attendance Report PDF
 */
async function generateAttendancePDF(reportData, filters) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header
      doc
        .fontSize(24)
        .fillColor("#2C3E50")
        .text("Attendance & Workforce Report", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor("#7F8C8D")
        .text(
          `Period: ${filters.start_date.toLocaleDateString()} - ${filters.end_date.toLocaleDateString()}`,
          { align: "center" },
        );
      doc.moveDown(2);

      // Summary
      doc.fontSize(16).fillColor("#34495E").text("Summary");
      doc.moveDown(0.5);

      const summary = reportData.summary;
      doc.fontSize(11).fillColor("#2C3E50");

      addKeyValue(doc, "Total Hours", summary.total_hours.toFixed(2));
      addKeyValue(doc, "Unique Labours", summary.unique_labours);
      addKeyValue(doc, "Total Records", summary.total_records);
      addKeyValue(doc, "Manual Entries", summary.manual_entries);
      addKeyValue(
        doc,
        "Avg Hours/Labour",
        summary.avg_hours_per_labour.toFixed(2),
      );

      doc.moveDown(2);

      // Top Labours
      if (reportData.breakdown.top_labours.length > 0) {
        doc.fontSize(16).fillColor("#34495E").text("Top 10 Labours by Hours");
        doc.moveDown(0.5);

        reportData.breakdown.top_labours.forEach((labour, index) => {
          if (doc.y > 700) doc.addPage();

          doc.fontSize(10).fillColor("#2C3E50");
          doc.text(`${index + 1}. ${labour.name} (${labour.skill_type})`);
          doc.fontSize(9).fillColor("#7F8C8D");
          doc.text(
            `   Hours: ${parseFloat(labour.total_hours).toFixed(2)} | Attendance: ${labour.attendance_count} days`,
          );
          doc.moveDown(0.3);
        });
      }

      addFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Material Report PDF
 */
async function generateMaterialPDF(reportData, filters) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header
      doc
        .fontSize(24)
        .fillColor("#2C3E50")
        .text("Material Report", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor("#7F8C8D")
        .text(
          `Period: ${filters.start_date.toLocaleDateString()} - ${filters.end_date.toLocaleDateString()}`,
          { align: "center" },
        );
      doc.moveDown(2);

      // Requests Summary
      doc.fontSize(16).fillColor("#34495E").text("Material Requests");
      doc.moveDown(0.5);

      const requests = reportData.summary.requests;
      doc.fontSize(11).fillColor("#2C3E50");

      addKeyValue(doc, "Total Requests", requests.total_requests);
      addKeyValue(doc, "Approved", requests.approved);
      addKeyValue(doc, "Pending", requests.pending);
      addKeyValue(doc, "Rejected", requests.rejected);

      doc.moveDown(2);

      // Bills Summary
      doc.fontSize(16).fillColor("#34495E").text("Material Bills");
      doc.moveDown(0.5);

      const bills = reportData.summary.bills;
      doc.fontSize(11).fillColor("#2C3E50");

      addKeyValue(doc, "Total Bills", bills.total_bills);
      addKeyValue(doc, "Approved", bills.approved);
      addKeyValue(doc, "Pending", bills.pending);
      addKeyValue(doc, "Rejected", bills.rejected);
      addKeyValue(doc, "Orphan Bills", bills.orphan_bills);
      addKeyValue(
        doc,
        "Total Approved Amount",
        formatCurrency(bills.total_approved_amount),
      );

      doc.moveDown(2);

      // Category Breakdown
      if (reportData.breakdown.by_category.length > 0) {
        doc.fontSize(16).fillColor("#34495E").text("Requests by Category");
        doc.moveDown(0.5);

        reportData.breakdown.by_category.slice(0, 10).forEach((cat) => {
          addKeyValue(
            doc,
            cat.category,
            `${cat.request_count} requests (${parseFloat(cat.total_quantity).toFixed(2)} units)`,
          );
        });
      }

      addFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Audit Report PDF
 */
async function generateAuditPDF(reportData, filters) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header
      doc
        .fontSize(24)
        .fillColor("#2C3E50")
        .text("Audit & Compliance Report", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor("#7F8C8D")
        .text(
          `Period: ${filters.start_date.toLocaleDateString()} - ${filters.end_date.toLocaleDateString()}`,
          { align: "center" },
        );
      doc.moveDown(2);

      // Summary
      doc.fontSize(16).fillColor("#34495E").text("Summary");
      doc.moveDown(0.5);

      const summary = reportData.summary;
      doc.fontSize(11).fillColor("#2C3E50");

      addKeyValue(doc, "Total Audit Logs", summary.total_audits);
      addKeyValue(doc, "Unique Users", summary.unique_users);
      addKeyValue(doc, "Unique Categories", summary.unique_categories);

      doc.moveDown(2);

      // By Category
      if (reportData.breakdown.by_category.length > 0) {
        doc.fontSize(16).fillColor("#34495E").text("Activity by Category");
        doc.moveDown(0.5);

        reportData.breakdown.by_category.slice(0, 15).forEach((item) => {
          addKeyValue(doc, `${item.category} (${item.action})`, item.count);
        });
      }

      doc.moveDown(2);

      // Critical Audits
      if (reportData.recent_critical_audits.length > 0) {
        if (doc.y > 650) doc.addPage();

        doc.fontSize(16).fillColor("#E74C3C").text("Recent Critical Changes");
        doc.moveDown(0.5);

        reportData.recent_critical_audits
          .slice(0, 10)
          .forEach((audit, index) => {
            if (doc.y > 700) doc.addPage();

            doc.fontSize(10).fillColor("#2C3E50");
            doc.text(`${index + 1}. ${audit.category} - ${audit.action}`);
            doc.fontSize(9).fillColor("#7F8C8D");
            doc.text(
              `   By: ${audit.acted_by_role} | ${new Date(audit.created_at).toLocaleString()}`,
            );
            doc.moveDown(0.3);
          });
      }

      addFooter(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Helper: Add key-value pair to PDF
 */
function addKeyValue(doc, key, value) {
  const y = doc.y;
  doc
    .fontSize(10)
    .fillColor("#34495E")
    .text(key + ":", 60, y, { width: 200 });
  doc
    .fontSize(10)
    .fillColor("#2C3E50")
    .text(value.toString(), 260, y, { width: 280 });
  doc.moveDown(0.5);
}

/**
 * Helper: Add footer to PDF
 */
function addFooter(doc) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor("#95A5A6")
      .text(
        `Page ${i + 1} of ${pages.count} | Generated: ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        { align: "center" },
      );
  }
}

module.exports = {
  generateFinancialPDF,
  generateProgressPDF,
  generateAttendancePDF,
  generateMaterialPDF,
  generateAuditPDF,
};
