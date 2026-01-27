// Audit API client - consuming backend audit.service.js endpoints
import { api } from "../api";
import type { AuditResponse, AuditFilters } from "@/types/ledger";

// Helper to build query string from filters
function buildAuditQueryString(filters: AuditFilters): string {
  const params = new URLSearchParams();

  if (filters.project_id) params.append("project_id", String(filters.project_id));
  if (filters.category) params.append("category", filters.category);
  if (filters.start_date) params.append("start_date", filters.start_date);
  if (filters.end_date) params.append("end_date", filters.end_date);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));

  return params.toString();
}

// ==================== OWNER AUDIT API ====================

export const ownerAudit = {
  /**
   * Get audit logs for the owner's organization
   * Endpoint: GET /owner/audits
   * Supports filtering by project, category, date range
   */
  getLogs: (filters: AuditFilters = {}) => {
    const queryString = buildAuditQueryString(filters);
    const url = `/owner/audits${queryString ? `?${queryString}` : ""}`;
    return api.get<AuditResponse>(url);
  },
};

// ==================== MANAGER AUDIT API ====================

export const managerAudit = {
  /**
   * Get audit logs for manager's assigned projects
   * Endpoint: GET /manager/audits
   * Only shows audits for projects where manager is ACTIVE
   */
  getLogs: (filters: AuditFilters = {}) => {
    const queryString = buildAuditQueryString(filters);
    const url = `/manager/audit${queryString ? `?${queryString}` : ""}`;
    return api.get<AuditResponse>(url);
  },
};
