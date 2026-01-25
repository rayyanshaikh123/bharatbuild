// frontend/lib/api/owner.ts - FIXED VERSION
import { api } from "../api";

// ==================== TYPES ====================

export interface OwnerDashboardSummary {
  total_managers_approved: number;
  total_managers_pending: number;
  total_managers_rejected: number;
  total_site_engineers_approved: number;
  total_site_engineers_pending: number;
  total_site_engineers_rejected: number;
  total_projects: number;
  total_projects_planned: number;
  total_projects_active: number;
  total_projects_completed: number;
  total_projects_on_hold: number;
  total_budget_planned: number;
  total_budget_active: number;
  total_budget_completed: number;
}

export interface Organization {
  id: string;
  name: string;
  address: string;
  office_phone: string;
  org_type: string;
  owner_id: string;
  created_at?: string;
}

export interface ManagerRequest {
  id: string;
  organization_id: string;
  manager_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  location_text: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  geofence?: any;
  start_date: string;
  end_date: string;
  budget: number;
  current_invested?: number;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "ON_HOLD";
  created_by: string;
  created_at?: string;
}

export interface ProjectManager {
  id: string;
  project_id: string;
  manager_id: string;
  status: string;
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
  assigned_at?: string;
}

// ==================== OWNER ORGANIZATION API ====================

export const ownerOrganization = {
  create: (data: {
    name: string;
    address: string;
    phone: string;
    org_type: string;
  }) =>
    api.post<{ organization: Organization }>(
      "/owner/organization/create-organization",
      data,
    ),

  // FIX: Added get() method for single organization
  get: async (): Promise<{ organization: Organization | null }> => {
    const result = await api.get<{ organizations: Organization[] }>(
      "/owner/organization/organizations",
    );
    return { organization: result.organizations?.[0] || null };
  },

  getAll: () =>
    api.get<{ organizations: Organization[] }>(
      "/owner/organization/organizations",
    ),

  getById: (id: string) =>
    api.get<{ organization: Organization }>(
      `/owner/organization/organization/${id}`,
    ),

  update: (
    id: string,
    data: Partial<{
      name: string;
      address: string;
      phone: string;
      org_type: string;
    }>,
  ) =>
    api.patch<{ organization: Organization }>(
      `/owner/organization/organization/${id}`,
      data,
    ),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/owner/organization/organization/${id}`),
};

// ==================== OWNER PROFILE API ====================

export const ownerProfile = {
  get: () =>
    api.get<{
      owner: {
        id: string;
        name: string;
        email: string;
        phone: string;
        role: string;
      };
    }>("/owner/profile"),
};

// ==================== OWNER MANAGER REQUESTS API ====================

export const ownerRequests = {
  getAll: (orgId: string) =>
    api.post<{ managers: ManagerRequest[] }>(`/owner/requests/`, { orgId }),

  getPending: (orgId: string) =>
    api.get<{ managers: ManagerRequest[] }>(
      `/owner/requests/pending?orgId=${orgId}`,
    ),

  getAccepted: (orgId: string) =>
    api.get<{ managers: ManagerRequest[] }>(
      `/owner/requests/accepted?orgId=${orgId}`,
    ),

  getRejected: (orgId: string) =>
    api.get<{ managers: ManagerRequest[] }>(
      `/owner/requests/rejected?orgId=${orgId}`,
    ),

  updateStatus: (requestId: string, status: "APPROVED" | "REJECTED") =>
    api.patch<{ request: ManagerRequest }>(`/owner/requests/${requestId}`, {
      status,
    }),
};

// ==================== OWNER PROJECT API ====================

export const ownerProjects = {
  getAll: (organizationId: string) =>
    api.get<{ projects: Project[] }>(
      `/owner/project/all/projects?organizationId=${organizationId}`,
    ),

  getById: (projectId: string, organizationId: string) =>
    api.get<{ project: Project }>(
      `/owner/project/project/${projectId}?organizationId=${organizationId}`,
    ),

  getActiveManagers: (projectId: string, organizationId: string) =>
    api.get<{ managers: ProjectManager[] }>(
      `/owner/project/project-managers/active?projectId=${projectId}&organizationId=${organizationId}`,
    ),

  getPendingManagers: (projectId: string, organizationId: string) =>
    api.get<{ managers: ProjectManager[] }>(
      `/owner/project/project-managers/pending?projectId=${projectId}&organizationId=${organizationId}`,
    ),

  getRejectedManagers: (projectId: string, organizationId: string) =>
    api.get<{ managers: ProjectManager[] }>(
      `/owner/project/project-managers/rejected?projectId=${projectId}&organizationId=${organizationId}`,
    ),

  getProjectOwner: (projectId: string, organizationId: string) =>
    api.get<{ manager: ProjectManager | null }>(
      `/owner/project/project-manager/owner?projectId=${projectId}&organizationId=${organizationId}`,
    ),
};

// ==================== OWNER DASHBOARD API ====================

export const ownerDashboard = {
  getSummary: () =>
    api.get<{ summary: OwnerDashboardSummary }>("/owner/dashboard"),
};

// ==================== OWNER PLANS API (READ-ONLY) ====================

export interface Plan {
  id: string;
  project_id: string;
  created_by: string;
  start_date: string;
  end_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlanItem {
  id: string;
  plan_id: string;
  period_type: "WEEK" | "CUSTOM";
  period_start: string;
  period_end: string;
  task_name: string;
  description?: string;
  planned_quantity?: number;
  planned_manpower?: number;
  planned_cost?: number;
  created_at?: string;
}

export const ownerPlans = {
  getByProjectId: (projectId: string) =>
    api.get<{ plan: Plan; items: PlanItem[] }>(
      `/owner/plan/plans/${projectId}`,
    ),
};

// ==================== OWNER DPR API (READ-ONLY) ====================

export interface DprEntry {
  id: string;
  project_id: string;
  site_engineer_id: string;
  plan_id?: string;
  plan_item_id?: string;
  report_date: string;
  work_description: string;
  materials_used?: string;
  labour_count?: number;
  machinery_used?: string;
  weather_conditions?: string;
  report_image?: any;
  report_image_mime?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
  engineer_name?: string;
  engineer_phone?: string;
  plan_start_date?: string;
  plan_end_date?: string;
  plan_item_task_name?: string;
  plan_item_period_start?: string;
  plan_item_period_end?: string;
}

export const ownerDpr = {
  getAll: (projectId: string) =>
    api.get<{ dprs: DprEntry[] }>(`/owner/dpr/projects/${projectId}/dprs`),

  getPending: (projectId: string) =>
    api.get<{ dprs: DprEntry[] }>(
      `/owner/dpr/projects/${projectId}/dprs/pending`,
    ),

  getApproved: (projectId: string) =>
    api.get<{ dprs: DprEntry[] }>(
      `/owner/dpr/projects/${projectId}/dprs/approved`,
    ),

  getRejected: (projectId: string) =>
    api.get<{ dprs: DprEntry[] }>(
      `/owner/dpr/projects/${projectId}/dprs/rejected`,
    ),

  getById: (dprId: string) =>
    api.get<{ dpr: DprEntry }>(`/owner/dpr/dprs/${dprId}`),

  getByDate: (projectId: string, date: string) =>
    api.get<{ dprs: DprEntry[] }>(
      `/owner/dpr/projects/${projectId}/dprs/date/${date}`,
    ),

  getByDatePending: (projectId: string, date: string) =>
    api.get<{ dprs: DprEntry[] }>(
      `/owner/dpr/projects/${projectId}/dprs/date/${date}/pending`,
    ),

  getByDateApproved: (projectId: string, date: string) =>
    api.get<{ dprs: DprEntry[] }>(
      `/owner/dpr/projects/${projectId}/dprs/date/${date}/approved`,
    ),

  getByDateRejected: (projectId: string, date: string) =>
    api.get<{ dprs: DprEntry[] }>(
      `/owner/dpr/projects/${projectId}/dprs/date/${date}/rejected`,
    ),
};

// ==================== OWNER TIMELINE API (READ-ONLY) ====================

export interface TimelineResponse {
  project_id: string;
  overall_progress: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  delayed_tasks: number;
  timeline: TimelineItem[];
}

export interface TimelineItem {
  plan_item_id: string;
  task_name: string;
  period_start: string;
  period_end: string;
  status: string;
  priority: number;
  delay_days: number;
  delay_info: any;
}

export const ownerTimeline = {
  getProjectTimeline: (projectId: string) =>
    api.get<TimelineResponse>(`/owner/timeline/project/${projectId}`),
};

// ==================== OWNER MATERIALS API ====================

export interface MaterialRequest {
  id: string;
  project_id: string;
  site_engineer_id: string;
  title: string;
  category: string;
  quantity: number;
  description?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  project_name?: string;
  engineer_name?: string;
}

export interface MaterialBill {
  id: string;
  project_id: string;
  material_request_id?: string;
  uploaded_by: string;
  vendor_name: string;
  vendor_contact?: string;
  bill_number: string;
  bill_amount: number;
  gst_percentage?: number;
  gst_amount?: number;
  total_amount: number;
  category: string;
  bill_image?: any;
  bill_image_mime?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  project_name?: string;
  engineer_name?: string;
}

export const ownerMaterials = {
  getRequests: (filters?: { project_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append("project_id", filters.project_id);
    if (filters?.status) params.append("status", filters.status);
    return api.get<{ requests: MaterialRequest[] }>(
      `/owner/material/requests?${params}`,
    );
  },

  getBills: (filters?: { project_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append("project_id", filters.project_id);
    if (filters?.status) params.append("status", filters.status);
    return api.get<{ bills: MaterialBill[] }>(
      `/owner/material/bills?${params}`,
    );
  },

  updateBill: (id: string, data: Partial<MaterialBill>) =>
    api.patch<{ bill: MaterialBill }>(`/owner/material/bills/${id}`, data),

  deleteBill: (id: string) =>
    api.delete<{ message: string }>(`/owner/material/bills/${id}`),
};

// ==================== OWNER ANALYTICS API ====================

export interface AnalyticsOverview {
  total_projects: number;
  active_projects: number;
  total_budget: number;
  total_spent: number;
  completion_rate: number;
  on_time_rate: number;
  // Add more fields as returned by backend
  [key: string]: any;
}

export interface ProjectAnalytics {
  project_id: string;
  project_name: string;
  budget_utilization: number;
  task_completion: number;
  delay_metrics: any;
  financial_summary: any;
  workforce_summary: any;
  // Add more fields as returned by backend
  [key: string]: any;
}

export const ownerAnalytics = {
  getOverview: () => api.get<AnalyticsOverview>("/owner/analytics/overview"),

  getProjectAnalytics: (projectId: string) =>
    api.get<ProjectAnalytics>(`/owner/analytics/project/${projectId}`),
};

// ==================== OWNER DELAYS API ====================

export interface DelayedItem {
  plan_item_id: string;
  task_name: string;
  period_end: string;
  status: string;
  delay_days: number;
  delay: any;
}

export const ownerDelays = {
  getProjectDelays: (projectId: string) =>
    api.get<{ delayed_items: DelayedItem[] }>(
      `/owner/delays/project/${projectId}`,
    ),
};

// ==================== OWNER WAGES API ====================

export interface Wage {
  id: string;
  labour_id: string;
  project_id: string;
  attendance_id: string;
  amount: number;
  status: string;
  labour_name?: string;
  project_name?: string;
  attendance_date?: string;
  engineer_name?: string;
  created_at: string;
}

export const ownerWages = {
  getAll: (filters?: { project_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append("project_id", filters.project_id);
    if (filters?.status) params.append("status", filters.status);
    return api.get<{ wages: Wage[] }>(`/owner/wages?${params}`);
  },
};

// ==================== OWNER LABOUR REQUESTS API ====================

export interface LabourRequest {
  id: string;
  project_id: string;
  site_engineer_id?: string;
  category: string;
  required_count: number;
  search_radius_meters: number;
  request_date: string;
  status: "OPEN" | "LOCKED" | "CLOSED";
  copied_from?: string;
  created_at: string;
}

export const ownerLabourRequests = {
  getByProject: (projectId: string) =>
    api.get<{ labour_requests: LabourRequest[] }>(
      `/owner/labour-request/labour-requests?projectId=${projectId}`,
    ),
};

// ==================== OWNER BLACKLIST API ====================

export interface BlacklistEntry {
  id: string;
  org_id: string;
  labour_id: string;
  reason: string;
  created_at: string;
  labour_name: string;
  labour_phone: string;
  skill_type: string;
  organization_name: string;
}

export const ownerBlacklist = {
  getAll: () => api.get<{ blacklist: BlacklistEntry[] }>("/owner/blacklist"),

  remove: (id: string) =>
    api.delete<{ message: string }>(`/owner/blacklist/${id}`),
};

// ==================== OWNER PURCHASE MANAGER REQUESTS API ====================

export interface PurchaseManagerRequest {
  id: string;
  org_id: string;
  purchase_manager_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  approved_at?: string;
  purchase_manager_name: string;
  purchase_manager_email: string;
  purchase_manager_phone: string;
}

export const ownerPurchaseManagerRequests = {
  getAll: (orgId: string) =>
    api.get<{ purchase_managers: PurchaseManagerRequest[] }>(
      `/owner/purchase-manager-requests?orgId=${orgId}`,
    ),

  getPending: (orgId: string) =>
    api.get<{ purchase_managers: PurchaseManagerRequest[] }>(
      `/owner/purchase-manager-requests/pending?orgId=${orgId}`,
    ),

  getAccepted: (orgId: string) =>
    api.get<{ purchase_managers: PurchaseManagerRequest[] }>(
      `/owner/purchase-manager-requests/accepted?orgId=${orgId}`,
    ),

  getRejected: (orgId: string) =>
    api.get<{ purchase_managers: PurchaseManagerRequest[] }>(
      `/owner/purchase-manager-requests/rejected?orgId=${orgId}`,
    ),

  updateStatus: (requestId: string, status: "APPROVED" | "REJECTED") =>
    api.patch<{ request: PurchaseManagerRequest }>(
      `/owner/purchase-manager-requests/${requestId}`,
      { status },
    ),
};

// ==================== OWNER MATERIAL OVERSIGHT API ====================

export interface InvestmentSummaryProject {
  id: string;
  project_name: string;
  budget: number;
  current_invested: number;
  budget_used_percentage: number;
  status: string;
  manager_name: string | null;
}

export interface InvestmentSummary {
  projects: InvestmentSummaryProject[];
  summary: {
    total_budget: number;
    total_invested: number;
    overall_percentage: string;
  };
}

export interface MaterialStockOverview {
  id: string;
  project_id: string;
  material_name: string;
  category: string | null;
  unit: string;
  available_quantity: number;
  last_updated_at: string;
}

export interface GRNOverview {
  id: string;
  po_number: string;
  vendor_name: string;
  po_amount: number;
  status: string;
  received_by_name: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
}

export interface GRNAuditRecord {
  audit_id: string;
  grn_id: string;
  action: string;
  project_name: string;
  manager_name: string;
  po_number: string;
  action_timestamp: string;
  change_summary: any;
}

export interface MaterialConsumptionRecord {
  id: string;
  project_id: string;
  dpr_id: string | null;
  material_name: string;
  unit: string;
  quantity_used: number;
  recorded_at: string;
  report_date: string | null;
  dpr_title: string | null;
  engineer_name: string | null;
}

export const ownerMaterialOversight = {
  // Get investment summary across all projects
  getInvestmentSummary: () =>
    api.get<InvestmentSummary>(
      "/owner/material-oversight/projects/investment-summary",
    ),

  // Get material stock for a specific project
  getProjectStock: (projectId: string) =>
    api.get<{ stock: MaterialStockOverview[] }>(
      `/owner/material-oversight/projects/${projectId}/material-stock`,
    ),

  // Get GRNs for a specific project
  getProjectGRNs: (projectId: string) =>
    api.get<{ grns: GRNOverview[] }>(
      `/owner/material-oversight/projects/${projectId}/grns`,
    ),

  // Get GRN approval audit trail
  getGRNAudit: () =>
    api.get<{ audit_records: GRNAuditRecord[] }>(
      "/owner/material-oversight/grns/audit",
    ),

  // Get material consumption for a specific project
  getProjectConsumption: (projectId: string) =>
    api.get<{ consumption: MaterialConsumptionRecord[] }>(
      `/owner/material-oversight/projects/${projectId}/material-consumption`,
    ),
};
