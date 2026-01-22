const express = require("express");
const router = express.Router();
const managerCheck = require("../../middleware/managerCheck");
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
  generateProjectInsights,
} = require("../../services/report.ai.service");
const {
  parseDateFilters,
  parseEntityFilters,
  applyPagination,
} = require("../../util/reportFilters");

/**
 * GET /manager/reports/financial
 * Financial report for manager (assigned projects only)
 */
router.get("/financial", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const pagination = applyPagination(req.query);

    const filters = { ...dateFilters, ...entityFilters, ...pagination };

    const reportData = await getFinancialReport(managerId, "manager", filters);
    res.json(reportData);
  } catch (error) {
    console.error("[Manager Reports] Financial error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /manager/reports/project-progress
 * Project progress report for manager
 */
router.get("/project-progress", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const pagination = applyPagination(req.query);

    const filters = { ...dateFilters, ...entityFilters, ...pagination };

    const reportData = await getProjectProgressReport(
      managerId,
      "manager",
      filters,
    );
    res.json(reportData);
  } catch (error) {
    console.error("[Manager Reports] Progress error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /manager/reports/attendance
 * Attendance & workforce report for manager
 */
router.get("/attendance", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const pagination = applyPagination(req.query);

    const filters = { ...dateFilters, ...entityFilters, ...pagination };

    const reportData = await getAttendanceReport(managerId, "manager", filters);
    res.json(reportData);
  } catch (error) {
    console.error("[Manager Reports] Attendance error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /manager/reports/materials
 * Material report for manager
 */
router.get("/materials", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const pagination = applyPagination(req.query);

    const filters = { ...dateFilters, ...entityFilters, ...pagination };

    const reportData = await getMaterialReport(managerId, "manager", filters);
    res.json(reportData);
  } catch (error) {
    console.error("[Manager Reports] Materials error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /manager/reports/audit
 * Audit & compliance report for manager (assigned projects only)
 */
router.get("/audit", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const pagination = applyPagination(req.query);

    const filters = { ...dateFilters, ...entityFilters, ...pagination };

    const reportData = await getAuditReport(managerId, "manager", filters);
    res.json(reportData);
  } catch (error) {
    console.error("[Manager Reports] Audit error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /manager/reports/financial/pdf
 * Download financial report as PDF
 */
router.get("/financial/pdf", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    const reportData = await getFinancialReport(managerId, "manager", filters);
    const pdfBuffer = await generateFinancialPDF(reportData, filters);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=financial-report-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[Manager Reports] PDF error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /manager/reports/progress/pdf
 * Download progress report as PDF
 */
router.get("/progress/pdf", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    const reportData = await getProjectProgressReport(
      managerId,
      "manager",
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
    console.error("[Manager Reports] PDF error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /manager/reports/attendance/pdf
 * Download attendance report as PDF
 */
router.get("/attendance/pdf", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    const reportData = await getAttendanceReport(managerId, "manager", filters);
    const pdfBuffer = await generateAttendancePDF(reportData, filters);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance-report-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[Manager Reports] PDF error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /manager/reports/materials/pdf
 * Download materials report as PDF
 */
router.get("/materials/pdf", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    const reportData = await getMaterialReport(managerId, "manager", filters);
    const pdfBuffer = await generateMaterialPDF(reportData, filters);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=materials-report-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[Manager Reports] PDF error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /manager/reports/audit/pdf
 * Download audit report as PDF
 */
router.get("/audit/pdf", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    const reportData = await getAuditReport(managerId, "manager", filters);
    const pdfBuffer = await generateAuditPDF(reportData, filters);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=audit-report-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[Manager Reports] PDF error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /manager/reports/project/:projectId/ai-insights
 * AI-generated insights for a specific project (must be assigned)
 */
router.get(
  "/project/:projectId/ai-insights",
  managerCheck,
  async (req, res) => {
    try {
      const managerId = req.user.id;
      const { projectId } = req.params;
      const dateFilters = parseDateFilters(req.query);

      // Get combined report data for the project
      const filters = { ...dateFilters, project_id: projectId };

      const financialData = await getFinancialReport(
        managerId,
        "manager",
        filters,
      );
      const progressData = await getProjectProgressReport(
        managerId,
        "manager",
        filters,
      );
      const attendanceData = await getAttendanceReport(
        managerId,
        "manager",
        filters,
      );

      const combinedData = {
        financial: financialData.summary,
        progress: progressData.summary,
        attendance: attendanceData.summary,
      };

      const insights = await generateProjectInsights(projectId, combinedData);
      res.json(insights);
    } catch (error) {
      console.error("[Manager Reports] AI insights error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },
);

/**
 * GET /manager/reports/:reportType/ai-summary
 * AI summary for any report type
 */
router.get("/:reportType/ai-summary", managerCheck, async (req, res) => {
  try {
    const managerId = req.user.id;
    const { reportType } = req.params;
    const dateFilters = parseDateFilters(req.query);
    const entityFilters = parseEntityFilters(req.query);
    const filters = { ...dateFilters, ...entityFilters };

    let reportData;
    let reportTypeKey;

    switch (reportType) {
      case "financial":
        reportData = await getFinancialReport(managerId, "manager", filters);
        reportTypeKey = "financial";
        break;
      case "progress":
        reportData = await getProjectProgressReport(
          managerId,
          "manager",
          filters,
        );
        reportTypeKey = "project_progress";
        break;
      case "attendance":
        reportData = await getAttendanceReport(managerId, "manager", filters);
        reportTypeKey = "attendance";
        break;
      case "materials":
        reportData = await getMaterialReport(managerId, "manager", filters);
        reportTypeKey = "materials";
        break;
      case "audit":
        reportData = await getAuditReport(managerId, "manager", filters);
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
    console.error("[Manager Reports] AI summary error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
