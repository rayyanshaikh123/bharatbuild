const express = require("express");
const router = express.Router();
const ownerCheck = require("../../middleware/ownerCheck");
const {
  getFinancialReport,
  getProjectProgressReport,
  getAttendanceReport,
  getMaterialReport,
  getAuditReport,
} = require("../../services/report.service");
const {
  generateFinancialPDF,
  generateProgressPDF,
  generateAttendancePDF,
  generateMaterialPDF,
  generateAuditPDF,
} = require("../../services/report.pdf.service");
const {
  generateReportSummary,
  detectAnomalies,
  generateExecutiveInsights,
  generateProjectInsights,
} = require("../../services/report.ai.service");
const {
  parseDateFilters,
  parseEntityFilters,
  applyPagination,
} = require("../../util/reportFilters");

/**
 * GET /owner/reports/financial
 * Financial report for owner (organization-wide)
 */
router.get("/financial", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const pagination = applyPagination(req.query);

    const filters = { ...dateFilters, ...entityFilters, ...pagination };

    const reportData = await getFinancialReport(ownerId, "owner", filters);
    res.json(reportData);
  } catch (error) {
    console.error("[Owner Reports] Financial error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/project-progress
 * Project progress report for owner
 */
router.get("/project-progress", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const pagination = applyPagination(req.query);

    const filters = { ...dateFilters, ...entityFilters, ...pagination };

    const reportData = await getProjectProgressReport(
      ownerId,
      "owner",
      filters,
    );
    res.json(reportData);
  } catch (error) {
    console.error("[Owner Reports] Progress error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/attendance
 * Attendance & workforce report for owner
 */
router.get("/attendance", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const pagination = applyPagination(req.query);

    const filters = { ...dateFilters, ...entityFilters, ...pagination };

    const reportData = await getAttendanceReport(ownerId, "owner", filters);
    res.json(reportData);
  } catch (error) {
    console.error("[Owner Reports] Attendance error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/materials
 * Material report for owner
 */
router.get("/materials", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const pagination = applyPagination(req.query);

    const filters = { ...dateFilters, ...entityFilters, ...pagination };

    const reportData = await getMaterialReport(ownerId, "owner", filters);
    res.json(reportData);
  } catch (error) {
    console.error("[Owner Reports] Materials error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/audit
 * Audit & compliance report for owner
 */
router.get("/audit", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const pagination = applyPagination(req.query);

    const filters = { ...dateFilters, ...entityFilters, ...pagination };

    const reportData = await getAuditReport(ownerId, "owner", filters);
    res.json(reportData);
  } catch (error) {
    console.error("[Owner Reports] Audit error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/financial/pdf
 * Download financial report as PDF
 */
router.get("/financial/pdf", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    const reportData = await getFinancialReport(ownerId, "owner", filters);
    const pdfBuffer = await generateFinancialPDF(reportData, filters);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=financial-report-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[Owner Reports] PDF error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/progress/pdf
 * Download progress report as PDF
 */
router.get("/progress/pdf", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    const reportData = await getProjectProgressReport(
      ownerId,
      "owner",
      filters,
    );
    const pdfBuffer = await generateProgressPDF(reportData, filters);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=progress-report-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[Owner Reports] PDF error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/attendance/pdf
 * Download attendance report as PDF
 */
router.get("/attendance/pdf", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    const reportData = await getAttendanceReport(ownerId, "owner", filters);
    const pdfBuffer = await generateAttendancePDF(reportData, filters);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance-report-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[Owner Reports] PDF error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/materials/pdf
 * Download materials report as PDF
 */
router.get("/materials/pdf", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    const reportData = await getMaterialReport(ownerId, "owner", filters);
    const pdfBuffer = await generateMaterialPDF(reportData, filters);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=materials-report-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[Owner Reports] PDF error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/audit/pdf
 * Download audit report as PDF
 */
router.get("/audit/pdf", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    const reportData = await getAuditReport(ownerId, "owner", filters);
    const pdfBuffer = await generateAuditPDF(reportData, filters);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=audit-report-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[Owner Reports] PDF error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/project/:projectId/ai-insights
 * AI-generated insights for a specific project
 */
router.get("/project/:projectId/ai-insights", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { projectId } = req.params;
    const dateFilters = parseDateFilters(req.query);

    // Get combined report data for the project
    const filters = { ...dateFilters, project_id: projectId };

    const financialData = await getFinancialReport(ownerId, "owner", filters);
    const progressData = await getProjectProgressReport(
      ownerId,
      "owner",
      filters,
    );
    const attendanceData = await getAttendanceReport(ownerId, "owner", filters);

    const combinedData = {
      financial: financialData.summary,
      progress: progressData.summary,
      attendance: attendanceData.summary,
    };

    const insights = await generateProjectInsights(projectId, combinedData);
    res.json(insights);
  } catch (error) {
    console.error("[Owner Reports] AI insights error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/organization/ai-overview
 * AI-generated executive overview for entire organization
 */
router.get("/organization/ai-overview", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);

    const financialData = await getFinancialReport(
      ownerId,
      "owner",
      dateFilters,
    );
    const progressData = await getProjectProgressReport(
      ownerId,
      "owner",
      dateFilters,
    );

    const insights = await generateExecutiveInsights(
      financialData,
      progressData,
    );

    // Also detect anomalies
    const anomalies = await detectAnomalies(financialData, "financial");

    res.json({
      ...insights,
      anomalies,
      period: {
        start_date: dateFilters.start_date,
        end_date: dateFilters.end_date,
      },
    });
  } catch (error) {
    console.error("[Owner Reports] AI overview error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /owner/reports/:reportType/ai-summary
 * AI summary for any report type
 */
router.get("/:reportType/ai-summary", ownerCheck, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { reportType } = req.params;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    let reportData;
    let reportTypeKey;

    switch (reportType) {
      case "financial":
        reportData = await getFinancialReport(ownerId, "owner", filters);
        reportTypeKey = "financial";
        break;
      case "progress":
        reportData = await getProjectProgressReport(ownerId, "owner", filters);
        reportTypeKey = "project_progress";
        break;
      case "attendance":
        reportData = await getAttendanceReport(ownerId, "owner", filters);
        reportTypeKey = "attendance";
        break;
      case "materials":
        reportData = await getMaterialReport(ownerId, "owner", filters);
        reportTypeKey = "materials";
        break;
      case "audit":
        reportData = await getAuditReport(ownerId, "owner", filters);
        reportTypeKey = "audit";
        break;
      default:
        return res.status(400).json({ error: "Invalid report type" });
    }

    const summary = await generateReportSummary(reportData, reportTypeKey);
    const anomalies = await detectAnomalies(reportData, reportTypeKey);

    res.json({
      report_type: reportType,
      summary,
      anomalies,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Owner Reports] AI summary error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
