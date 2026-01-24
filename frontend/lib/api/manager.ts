import { api } from "../api";

// ==================== TYPES ====================

export interface ManagerOrganization {
  id: string;
  org_id: string;
  manager_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  org_name?: string;
  org_address?: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  location_text: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  start_date: string;
  end_date: string;
  budget: number;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "ON_HOLD";
  created_by: string;
  geofence?: any;
  // Added from my-projects and all-projects endpoints
  is_creator?: boolean;
  my_status?: string | null;
}

export interface CreateProjectData {
  organizationId: string;
  name: string;
  location_text: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  start_date: string;
  end_date: string;
  budget: number;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "ON_HOLD";
  geofence?: any;
}

export interface EngineerRequest {
  id: string;
  site_engineer_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  engineer_name?: string;
  engineer_email?: string;
  engineer_phone?: string;
}

export interface ManagerDashboardSummary {
  total_site_engineers_approved: number;
  total_site_engineers_pending: number;
  total_site_engineers_rejected: number;
  total_projects_assigned: number;
  total_projects_created: number;
  total_projects_planned: number;
  total_projects_active: number;
  total_projects_completed: number;
  total_projects_on_hold: number;
}

// ==================== MANAGER ORGANIZATION API ====================

export interface OrganizationListItem {
  id: string;
  name: string;
  address: string;
  office_phone: string;
}

export interface ManagerOrgRequest {
  id: string;
  org_id: string;
  manager_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  org_name: string;
  org_address: string;
  org_office_phone: string;
}

export const managerOrganization = {
  // Get all organizations (for browsing/joining)
  getAll: () =>
    api.get<{ organizations: OrganizationListItem[] }>("/manager/organization/all"),

  // Get manager's approved organizations
  getMyOrganizations: () =>
    api.get<{ organizations: ManagerOrganization[] }>("/manager/organization/"),

  // Get manager's join requests (pending/approved/rejected)
  getMyRequests: () =>
    api.get<{ requests: ManagerOrgRequest[] }>("/manager/organization/my-requests"),

  // Request to join an organization
  requestJoin: (organizationId: string) =>
    api.post<{ message: string }>("/manager/organization/join-organization", { organizationId }),
};

// ==================== MANAGER PROFILE API ====================

export const managerProfile = {
  get: () =>
    api.get<{ manager: { id: string; name: string; email: string; phone: string; role: string } }>("/manager/profile"),
};

// ==================== MANAGER PROJECT API ====================

export const managerProjects = {
  create: (data: CreateProjectData) =>
    api.post<{ project: Project }>("/manager/project/create-project", data),

  getMyProjects: (organizationId: string) =>
    api.get<{ projects: Project[] }>(`/manager/project/my-projects?organizationId=${organizationId}`),

  getAllProjects: (organizationId: string) =>
    api.get<{ projects: Project[] }>(`/manager/project/all-projects?organizationId=${organizationId}`),

  getById: (projectId: string, organizationId: string) =>
    api.get<{ project: Project }>(`/manager/project/project/${projectId}?organizationId=${organizationId}`),

  update: (projectId: string, data: Partial<CreateProjectData>) =>
    api.put<{ project: Project }>(`/manager/project/project/${projectId}`, data),

  delete: (projectId: string, organizationId: string) =>
    api.delete<{ message: string }>(`/manager/project/project/${projectId}`, { organizationId }),

  updateStatus: (projectId: string, organizationId: string, status: Project["status"]) =>
    api.put<{ project: Project }>(`/manager/project/project/${projectId}/status`, { organizationId, status }),
};

// ==================== MANAGER ENGINEER REQUESTS API ====================

// ==================== MANAGER ENGINEER REQUESTS API ====================

export const managerEngineerRequests = {
  getPending: (projectId: string) =>
    api.get<{ requests: EngineerRequest[] }>(
      `/manager/project-engineer-requests/engineer-requests?projectId=${projectId}`
    ),

  approve: (requestId: string) =>
    api.put<{ message: string }>(`/manager/project-engineer-requests/engineer-requests/${requestId}/approve`, {}),

  reject: (requestId: string) =>
    api.put<{ message: string }>(`/manager/project-engineer-requests/engineer-requests/${requestId}/reject`, {}),
};

// ==================== MANAGER ORGANIZATION ENGINEER REQUESTS API ====================

export const managerOrgEngineerRequests = {
  getPending: (organizationId: string) =>
    api.get<{ requests: EngineerRequest[] }>(
      `/manager/organization-requests/organization-engineer-requests?organizationId=${organizationId}`
    ),

  getAccepted: (organizationId: string) =>
    api.get<{ requests: EngineerRequest[] }>(
      `/manager/organization-requests/site-engineer-accepted-requests?organizationId=${organizationId}`
    ),

  updateStatus: (requestId: string, action: "APPROVED" | "REJECTED") =>
    api.post<{ message: string }>(`/manager/organization-requests/engineer-request-action`, {
      requestId,
      action
    }),
};

// ==================== MANAGER DASHBOARD API ====================

export const managerDashboard = {
  getSummary: () =>
    api.get<{ summary: ManagerDashboardSummary }>("/manager/dashboard"),
};

// ==================== PLAN TYPES ====================

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
  period_type: "WEEK" | "MONTH"; // Database constraint allows only WEEK or MONTH
  period_start: string;
  period_end: string;
  task_name: string;
  description?: string;
  planned_quantity: number;
  planned_manpower: number;
  planned_cost: number;
  created_at: string;
  status: string;
  priority: number; // 0-5, default 0
  completed_at?: string;
  updated_by?: string;
  updated_by_role?: string;
  delay_info?: any;
  approved_by_manager?: string;
  approved_at?: string;
  approved_by_owner?: string;
  owner_approved_at?: string;
}

export interface CreatePlanItemData {
  period_type: "WEEK" | "MONTH";
  period_start: string;
  period_end: string;
  task_name: string;
  description?: string;
  planned_quantity: number;
  planned_manpower: number;
  planned_cost: number;
}

export interface CreatePlanData {
  organizationId?: string;
  project_id: string;
  start_date: string;
  end_date: string;
}

// ==================== MANAGER PLANS API ====================

export const managerPlans = {
  // Create a new plan for a project
  create: (data: CreatePlanData) =>
    api.post<{ plan: Plan }>("/manager/plan/plans", data),

  // Get plan and items for a project
  getByProjectId: (projectId: string) =>
    api.get<{ plan: Plan; items: PlanItem[] }>(`/manager/plan/plans/${projectId}`),

  // Update a plan
  update: (planId: string, data: { start_date: string; end_date: string }) =>
    api.put<{ plan: Plan }>(`/manager/plan/plans/${planId}`, data),

  // Delete a plan
  delete: (planId: string) =>
    api.delete<{ message: string }>(`/manager/plan/plans/${planId}`),

  // Add a plan item
  addItem: (planId: string, data: CreatePlanItemData) =>
    api.post<{ item: PlanItem }>(`/manager/plan/plans/${planId}/items`, data),

  // Update a plan item
  updateItem: (itemId: string, data: CreatePlanItemData) =>
    api.put<{ item: PlanItem }>(`/manager/plan/plans/items/${itemId}`, data),

  // Delete a plan item
  deleteItem: (itemId: string) =>
    api.delete<{ message: string }>(`/manager/plan/plans/items/${itemId}`),

  // Update plan item priority
  updatePriority: (itemId: string, priority: number) =>
    api.patch<{ message: string; plan_item: PlanItem }>(`/manager/plan/plan-items/${itemId}/priority`, { priority }),
};


 
// ==================== MANAGER DPR API ====================

export const managerDPR = {
  // Get all pending DPRs for review
  getPending: (projectId?: string) =>
    api.get<{ dprs: any[] }>(`/manager/dpr/pending${projectId ? `?projectId=${projectId}` : ''}`),

  // Get all DPRs with filters  
  getAll: (filters?: { projectId?: string; status?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    return api.get<{ dprs: any[] }>(`/manager/dpr?${params.toString()}`);
  },

  // Get DPR by ID
  getById: (dprId: string) =>
    api.get<{ dpr: any }>(`/manager/dpr/${dprId}`),

  // Review DPR (approve or reject)
  review: (dprId: string, decision: 'APPROVED' | 'REJECTED', remarks?: string) =>
    api.put<{ message: string; dpr: any }>(`/manager/dpr/${dprId}/review`, { decision, remarks }),

  // Get DPR Image
  getImage: (dprId: string) => api.getBlob(`/manager/dpr/${dprId}/image`),
};

// ==================== MANAGER LABOUR REQUESTS API ====================

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

export const managerLabourRequests = {
  getByProject: (projectId: string) =>
    api.get<{ labour_requests: LabourRequest[] }>(`/manager/labour-request/labour-requests?projectId=${projectId}`),
};

// ==================== MANAGER WAGE RATES API ====================

export interface WageRate {
  id: string;
  project_id: string;
  skill_type: string;
  category: string;
  hourly_rate: number;
}

export const managerWageRates = {
  getAll: (projectId: string) =>
    api.get<{ wage_rates: WageRate[] }>(`/manager/wage-rates?project_id=${projectId}`),

  create: (data: Omit<WageRate, "id">) =>
    api.post<{ wage_rate: WageRate }>("/manager/wage-rates", data),

  update: (id: string, hourly_rate: number) =>
    api.patch<{ wage_rate: WageRate }>(`/manager/wage-rates/${id}`, { hourly_rate }),
    
  delete: (id: string) =>
    api.delete<{ message: string }>(`/manager/wage-rates/${id}`),
};

// ==================== MANAGER WAGES / PAYROLL API ====================

export interface WageRecord {
  id: string;
  attendance_id: string;
  labour_id: string;
  project_id: string;
  wage_type: string;
  rate: number;
  total_amount: number;
  worked_hours: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  labour_name?: string;
}

export const managerWages = {
  getUnprocessedAttendance: (projectId: string) =>
    api.get<{ attendance: any[] }>(`/manager/wages/unprocessed?project_id=${projectId}`),
    
  generate: (wageData: { attendance_id: string }[]) =>
    api.post<{ wages: WageRecord[] }>("/manager/wages/generate", { wage_data: wageData }),
    
  getHistory: (filters: { project_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters.project_id) params.append("project_id", filters.project_id);
    if (filters.status) params.append("status", filters.status);
    return api.get<{ wages: WageRecord[] }>(`/manager/wages/history?${params.toString()}`);
  },

  review: (wageId: string, status: "APPROVED" | "REJECTED") =>
    api.patch<{ wage: WageRecord }>(`/manager/wages/review/${wageId}`, { status }),

  getWeeklyCost: (project_id: string) =>
    api.get<{ weekly_costs: any[] }>(`/manager/wages/weekly-cost?project_id=${project_id}`),
};

// ==================== MANAGER MATERIALS API ====================

export const managerMaterials = {
  // Get material requests
  getRequests: (filters?: { project_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append('project_id', filters.project_id);
    if (filters?.status) params.append('status', filters.status);
    return api.get<{ requests: any[] }>(`/manager/material/requests?${params.toString()}`);
  },

  // Get material bills
  getBills: (filters?: { project_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append('project_id', filters.project_id);
    if (filters?.status) params.append('status', filters.status);
    return api.get<{ bills: any[] }>(`/manager/material/bills?${params.toString()}`);
  },

  // Review material request (PATCH to match backend)
  reviewRequest: (requestId: string, status: 'APPROVED' | 'REJECTED', manager_feedback?: string) =>
    api.patch<{ request: any }>(`/manager/material/requests/${requestId}`, { status, manager_feedback }),

  // Review material bill (PATCH to match backend)
  reviewBill: (billId: string, status: 'APPROVED' | 'REJECTED', manager_feedback?: string) =>
    api.patch<{ bill: any }>(`/manager/material/bills/${billId}`, { status, manager_feedback }),

  // Get bill image
  getBillImage: (billId: string) => api.getBlob(`/manager/material/bills/${billId}/image`),
};

// ==================== MANAGER PROJECT JOIN REQUESTS ====================

export const managerProjectJoinRequests = {
  // Request to join a project (from managerProjectReq.js)
  requestJoin: (projectId: string, organizationId: string) =>
    api.post<{ message: string }>(`/manager/project-requests/join-project`, { projectId, organizationId }),

  // Get my project join requests (from managerProjectReq.js)
  getMyRequests: () =>
    api.get<{ requests: any[] }>(`/manager/project-requests/my-project-requests`),
};

// ==================== MANAGER REQUESTS APPROVAL (for project creators) ====================

export const managerProjectManagerRequests = {
  // Get all manager join requests for a project (creator only) - from managerProject.js
  getPending: (projectId: string, organizationId: string) =>
    api.get<{ requests: any[] }>(`/manager/projects/manager-requests?projectId=${projectId}&organizationId=${organizationId}`),

  // Approve or reject a manager join request (creator only) - from managerProject.js
  decide: (requestId: string, decision: 'ACTIVE' | 'REJECTED', projectId: string, organizationId: string) =>
    api.put<{ message: string }>(`/manager/projects/manager-requests/${requestId}/decision`, { decision, projectId, organizationId }),
};
// ==================== MANAGER BLACKLIST API ====================

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

export const managerBlacklist = {
  getAll: (orgId: string) =>
    api.get<{ blacklist: BlacklistEntry[] }>(`/manager/blacklist?orgId=${orgId}`),

  add: (orgId: string, labourId: string, reason: string) =>
    api.post<{ message: string; id: string }>("/manager/blacklist", { orgId, labourId, reason }),

  remove: (id: string, orgId: string) =>
    api.delete<{ message: string }>(`/manager/blacklist/${id}?orgId=${orgId}`),
};

// ==================== MANAGER TIMELINE API ====================

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

export interface TimelineResponse {
  project_id: string;
  overall_progress: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  delayed_tasks: number;
  timeline: TimelineItem[];
}

export const managerTimeline = {
  getProjectTimeline: (projectId: string) =>
    api.get<TimelineResponse>(`/manager/timeline/project/${projectId}`),
};

// ==================== MANAGER PURCHASE MANAGER REQUESTS API ====================

export interface PurchaseManagerProjectRequest {
  id: string;
  project_id: string;
  purchase_manager_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  assigned_at: string;
  purchase_manager_name: string;
  purchase_manager_email: string;
  purchase_manager_phone: string;
}

export const managerPurchaseManagerRequests = {
  // Get all PM requests for a project
  getAll: (projectId: string, organizationId: string) =>
    api.get<{ purchase_manager_requests: PurchaseManagerProjectRequest[] }>(
      `/manager/project-purchase-manager-requests/purchase-manager-requests?projectId=${projectId}&organizationId=${organizationId}`
    ),

  // Get pending PM requests
  getPending: (projectId: string, organizationId: string) =>
    api.get<{ purchase_manager_requests: PurchaseManagerProjectRequest[] }>(
      `/manager/project-purchase-manager-requests/purchase-manager-requests/pending?projectId=${projectId}&organizationId=${organizationId}`
    ),

  // Get approved PM requests
  getApproved: (projectId: string, organizationId: string) =>
    api.get<{ purchase_manager_requests: PurchaseManagerProjectRequest[] }>(
      `/manager/project-purchase-manager-requests/purchase-manager-requests/approved?projectId=${projectId}&organizationId=${organizationId}`
    ),

  // Approve/reject PM request
  updateStatus: (requestId: string, decision: "APPROVED" | "REJECTED", projectId: string, organizationId: string) =>
    api.patch<{ message: string; request: PurchaseManagerProjectRequest }>(
      `/manager/project-purchase-manager-requests/purchase-manager-request/${requestId}/decision`,
      { decision, projectId, organizationId }
    ),
};

// ==================== MANAGER GRN API ====================

export const managerGrn = {
  // Get GRNs by project (using new correct route)
  getProjectGrns: (projectId: string, status?: string) => {
    const params = new URLSearchParams();
    params.append('projectId', projectId);
    if (status) params.append('status', status);
    return api.get<{ grns: any[] }>(`/manager/goods-receipt-notes?${params.toString()}`);
  },

  // Get GRN Details
  getById: (grnId: string) =>
    api.get<{ grn: any }>(`/manager/goods-receipt-notes/${grnId}`),

  // Approve GRN
  approve: (grnId: string, managerFeedback?: string) =>
    api.patch<{ message: string; grn: any }>(`/manager/goods-receipt-notes/${grnId}/approve`, { managerFeedback }),

  // Reject GRN
  reject: (grnId: string, managerFeedback: string) =>
    api.patch<{ message: string; grn: any }>(`/manager/goods-receipt-notes/${grnId}/reject`, { managerFeedback }),

  // Get Images (Streaming)
  getBillImage: (grnId: string) => 
    api.getBlob(`/manager/goods-receipt-notes/${grnId}/bill-image`),
    
  getDeliveryProofImage: (grnId: string) => 
    api.getBlob(`/manager/goods-receipt-notes/${grnId}/delivery-proof-image`),
};

// ==================== MANAGER PURCHASE ORDERS API ====================

export const managerPurchaseOrders = {
  // Get all POs for a project
  getAll: (projectId: string) =>
    api.get<{ purchase_orders: any[] }>(`/manager/purchase-orders?projectId=${projectId}`),

  // Get Single PO
  getById: (poId: string) =>
    api.get<{ purchase_order: any }>(`/manager/purchase-orders/${poId}`),

  // Get PO PDF
  getPdf: (poId: string) =>
    api.getBlob(`/manager/purchase-orders/${poId}/pdf`),
};


