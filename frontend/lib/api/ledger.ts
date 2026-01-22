// Ledger API client - consuming backend ledger.service.js endpoints
import { api } from "../api";
import type {
  LedgerResponse,
  LedgerFilters,
  LedgerAdjustment,
  LedgerAdjustmentData,
} from "@/types/ledger";

// ==================== PROJECT LEDGER API ====================

export const projectLedger = {
  /**
   * Get project financial ledger with filters
   * Endpoint: GET /project/:projectId/ledger
   * Authorization: Owner (all org projects) | Manager (assigned projects)
   */
  get: (projectId: string | number, filters: LedgerFilters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append("start_date", filters.startDate);
    if (filters.endDate) params.append("end_date", filters.endDate);
    if (filters.type) params.append("type", filters.type);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit));

    const queryString = params.toString();
    const url = `/project/${projectId}/ledger${queryString ? `?${queryString}` : ""}`;
    
    return api.get<LedgerResponse>(url);
  },

  /**
   * Add manual ledger adjustment
   * Endpoint: POST /project/:projectId/ledger/adjust
   * Authorization: Manager (ACTIVE on project) only
   */
  addAdjustment: (projectId: string | number, data: LedgerAdjustmentData) =>
    api.post<LedgerAdjustment>(`/project/${projectId}/ledger/adjust`, data),
};
