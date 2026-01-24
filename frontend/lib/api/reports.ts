// frontend/lib/api/reports.ts - Owner Reporting API Client
import { api, API_URL } from "../api";

export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  project_id?: string;
  page?: number;
  limit?: number;
}

export interface ReportData {
  summary: any;
  details: any[];
  metadata: {
    total_count: number;
    page: number;
    limit: number;
  };
}

function buildQueryString(filters: ReportFilters): string {
  const params = new URLSearchParams();
  
  if (filters.start_date) params.append("start_date", filters.start_date);
  if (filters.end_date) params.append("end_date", filters.end_date);
  if (filters.project_id) params.append("project_id", filters.project_id);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));
  
  return params.toString();
}

export const ownerReports = {
  // Get financial report
  getFinancial: (filters: ReportFilters = {}) =>
    api.get<ReportData>(`/owner/reports/financial?${buildQueryString(filters)}`),

  // Get project progress report
  getProgress: (filters: ReportFilters = {}) =>
    api.get<ReportData>(`/owner/reports/project-progress?${buildQueryString(filters)}`),

  // Get attendance & workforce report
  getAttendance: (filters: ReportFilters = {}) =>
    api.get<ReportData>(`/owner/reports/attendance?${buildQueryString(filters)}`),

  // Get materials report
  getMaterials: (filters: ReportFilters = {}) =>
    api.get<ReportData>(`/owner/reports/materials?${buildQueryString(filters)}`),

  // Get audit & compliance report
  getAudit: (filters: ReportFilters = {}) =>
    api.get<ReportData>(`/owner/reports/audits?${buildQueryString(filters)}`),

  // Download PDF reports
  downloadFinancialPDF: async (filters: ReportFilters = {}) => {
    const response = await fetch(`${API_URL}/owner/reports/financial/pdf?${buildQueryString(filters)}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    
    if (!response.ok) throw new Error("Failed to download PDF");
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadProgressPDF: async (filters: ReportFilters = {}) => {
    const response = await fetch(`${API_URL}/owner/reports/progress/pdf?${buildQueryString(filters)}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    
    if (!response.ok) throw new Error("Failed to download PDF");
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `progress-report-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadAttendancePDF: async (filters: ReportFilters = {}) => {
    const response = await fetch(`${API_URL}/owner/reports/attendance/pdf?${buildQueryString(filters)}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    
    if (!response.ok) throw new Error("Failed to download PDF");
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadMaterialsPDF: async (filters: ReportFilters = {}) => {
    const response = await fetch(`${API_URL}/owner/reports/materials/pdf?${buildQueryString(filters)}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    
    if (!response.ok) throw new Error("Failed to download PDF");
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `materials-report-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadAuditPDF: async (filters: ReportFilters = {}) => {
    const response = await fetch(`${API_URL}/owner/reports/audits/pdf?${buildQueryString(filters)}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    
    if (!response.ok) throw new Error("Failed to download PDF");
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  // AI-powered insights
  getProjectAIInsights: (projectId: string, filters: ReportFilters = {}) =>
    api.get<any>(`/owner/reports/project/${projectId}/ai-insights?${buildQueryString(filters)}`),

  getOrganizationAIOverview: (filters: ReportFilters = {}) =>
    api.get<any>(`/owner/reports/organization/ai-overview?${buildQueryString(filters)}`),

  getAISummary: (reportType: string, filters: ReportFilters = {}) =>
    api.get<any>(`/owner/reports/${reportType}/ai-summary?${buildQueryString(filters)}`),
};

// ==================== MANAGER REPORTS API ====================

export const managerReports = {
  // Get financial report
  getFinancial: (filters: ReportFilters = {}) =>
    api.get<ReportData>(`/manager/reports/financial?${buildQueryString(filters)}`),

  // Get project progress report
  getProgress: (filters: ReportFilters = {}) =>
    api.get<ReportData>(`/manager/reports/project-progress?${buildQueryString(filters)}`),

  // Get attendance & workforce report
  getAttendance: (filters: ReportFilters = {}) =>
    api.get<ReportData>(`/manager/reports/attendance?${buildQueryString(filters)}`),

  // Get materials report
  getMaterials: (filters: ReportFilters = {}) =>
    api.get<ReportData>(`/manager/reports/materials?${buildQueryString(filters)}`),

  // Get audit & compliance report
  getAudit: (filters: ReportFilters = {}) =>
    api.get<ReportData>(`/manager/reports/audit?${buildQueryString(filters)}`),

  // Download PDF reports
  downloadFinancialPDF: async (filters: ReportFilters = {}) => {
    const response = await fetch(`${API_URL}/manager/reports/financial/pdf?${buildQueryString(filters)}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to download PDF");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadProgressPDF: async (filters: ReportFilters = {}) => {
    const response = await fetch(`${API_URL}/manager/reports/progress/pdf?${buildQueryString(filters)}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to download PDF");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `progress-report-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadAttendancePDF: async (filters: ReportFilters = {}) => {
    const response = await fetch(`${API_URL}/manager/reports/attendance/pdf?${buildQueryString(filters)}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to download PDF");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadMaterialsPDF: async (filters: ReportFilters = {}) => {
    const response = await fetch(`${API_URL}/manager/reports/materials/pdf?${buildQueryString(filters)}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to download PDF");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `materials-report-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  downloadAuditPDF: async (filters: ReportFilters = {}) => {
    const response = await fetch(`${API_URL}/manager/reports/audit/pdf?${buildQueryString(filters)}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to download PDF");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  // AI-powered insights
  getProjectAIInsights: (projectId: string, filters: ReportFilters = {}) =>
    api.get<any>(`/manager/reports/project/${projectId}/ai-insights?${buildQueryString(filters)}`),

  getAISummary: (reportType: string, filters: ReportFilters = {}) =>
    api.get<any>(`/manager/reports/${reportType}/ai-summary?${buildQueryString(filters)}`),
};
