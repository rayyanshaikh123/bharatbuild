// Ledger API client - consuming backend ledger.service.js endpoints
import { api } from "../api";
import type {
  LedgerResponse,
  LedgerFilters,
  LedgerAdjustment,
  LedgerAdjustmentData,
} from "@/types/ledger";

// ==================== OWNER LEDGER API ====================

export const ownerLedger = {
  /**
   * Get project financial ledger with filters
   * Endpoint: GET /owner/ledger/project/:projectId
   * Authorization: Owner (all org projects)
   */
  get: (projectId: string | number, filters: LedgerFilters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append("start_date", filters.startDate);
    if (filters.endDate) params.append("end_date", filters.endDate);
    if (filters.type) params.append("type", filters.type);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit));

    const queryString = params.toString();
    const url = `/owner/ledger/project/${projectId}${queryString ? `?${queryString}` : ""}`;
    
    return api.get<LedgerResponse>(url);
  },
};

// ==================== MANAGER LEDGER API ====================

export const managerLedger = {
  /**
   * Get project financial ledger with filters
   * Endpoint: GET /manager/ledger/project/:projectId
   * Authorization: Manager (assigned projects only)
   */
  get: (projectId: string | number, filters: LedgerFilters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append("start_date", filters.startDate);
    if (filters.endDate) params.append("end_date", filters.endDate);
    if (filters.type) params.append("type", filters.type);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit));

    const queryString = params.toString();
    const url = `/manager/ledger/project/${projectId}${queryString ? `?${queryString}` : ""}`;
    
    return api.get<LedgerResponse>(url);
  },

  /**
   * Add manual ledger adjustment
   * Endpoint: POST /manager/ledger/project/:projectId/adjust
   * Authorization: Manager (ACTIVE on project) only
   */
  addAdjustment: (projectId: string | number, data: LedgerAdjustmentData) =>
    api.post<LedgerAdjustment>(`/manager/ledger/project/${projectId}/adjust`, data),
};
