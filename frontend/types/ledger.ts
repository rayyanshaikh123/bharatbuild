// Types for Ledger API responses - based on backend ledger.service.js

export type LedgerEntryType = "MATERIAL" | "WAGE" | "ADJUSTMENT";

export interface LedgerEntry {
  date: string;
  type: LedgerEntryType;
  reference_id: number;
  description: string;
  amount: number;
  running_total: number;
  category: string;
  approved_by: string | null;
  approved_at: string;
}

export interface LedgerFilters {
  startDate?: string;
  endDate?: string;
  type?: LedgerEntryType | null;
  page?: number;
  limit?: number;
}

export interface LedgerPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface LedgerResponse {
  entries: LedgerEntry[];
  pagination: LedgerPagination;
  filters: {
    start_date: string;
    end_date: string;
    type: LedgerEntryType | null;
  };
}

export interface LedgerAdjustmentData {
  date: string;
  description: string;
  amount: number;
  category?: string;
  notes?: string;
}

export interface LedgerAdjustment {
  id: number;
  project_id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  notes: string | null;
  created_by: number;
  created_at: string;
}

// ==================== AUDIT TYPES ====================

export type AuditCategory = 
  | "PROJECT"
  | "PLAN"
  | "MATERIAL"
  | "WAGE"
  | "ATTENDANCE"
  | "LEDGER"
  | "USER";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT";

export interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: number;
  category: AuditCategory;
  action: AuditAction;
  user_id: number;
  user_type: string;
  project_id: number | null;
  project_name: string | null;
  organization_id: number;
  changed_fields: string[] | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditFilters {
  project_id?: number | null;
  category?: AuditCategory | null;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface AuditResponse {
  audits: AuditLog[];
  pagination: LedgerPagination;
  filters: {
    project_id: number | null;
    category: AuditCategory | null;
    start_date: string;
    end_date: string;
  };
}
