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
  create: (data: { name: string; address: string; phone: string; org_type: string }) =>
    api.post<{ organization: Organization }>("/owner/organization/create-organization", data),

  // FIX: Added get() method for single organization
  get: async (): Promise<{ organization: Organization | null }> => {
    const result = await api.get<{ organizations: Organization[] }>("/owner/organization/organizations");
    return { organization: result.organizations?.[0] || null };
  },

  getAll: () =>
    api.get<{ organizations: Organization[] }>("/owner/organization/organizations"),

  getById: (id: string) =>
    api.get<{ organization: Organization }>(`/owner/organization/organization/${id}`),

  update: (id: string, data: Partial<{ name: string; address: string; phone: string; org_type: string }>) =>
    api.patch<{ organization: Organization }>(`/owner/organization/organization/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/owner/organization/organization/${id}`),
};

// ==================== OWNER PROFILE API ====================

export const ownerProfile = {
  get: () =>
    api.get<{ owner: { id: string; name: string; email: string; phone: string; role: string } }>("/owner/profile"),
};

// ==================== OWNER MANAGER REQUESTS API ====================

export const ownerRequests = {
  getAll: (orgId: string) =>
    api.post<{ managers: ManagerRequest[] }>(`/owner/requests/`, { orgId }),

  getPending: (orgId: string) =>
    api.get<{ managers: ManagerRequest[] }>(`/owner/requests/pending?orgId=${orgId}`),

  getAccepted: (orgId: string) =>
    api.get<{ managers: ManagerRequest[] }>(`/owner/requests/accepted?orgId=${orgId}`),

  getRejected: (orgId: string) =>
    api.get<{ managers: ManagerRequest[] }>(`/owner/requests/rejected?orgId=${orgId}`),

  updateStatus: (requestId: string, status: "APPROVED" | "REJECTED") =>
    api.patch<{ request: ManagerRequest }>(`/owner/requests/${requestId}`, { status }),
};

// ==================== OWNER PROJECT API ====================

export const ownerProjects = {
  getAll: (organizationId: string) =>
    api.get<{ projects: Project[] }>(`/owner/project/all/projects?organizationId=${organizationId}`),

  getById: (projectId: string, organizationId: string) =>
    api.get<{ project: Project }>(`/owner/project/project/${projectId}?organizationId=${organizationId}`),

  getActiveManagers: (projectId: string, organizationId: string) =>
    api.get<{ managers: ProjectManager[] }>(
      `/owner/project/project-managers/active?projectId=${projectId}&organizationId=${organizationId}`
    ),

  getPendingManagers: (projectId: string, organizationId: string) =>
    api.get<{ managers: ProjectManager[] }>(
      `/owner/project/project-managers/pending?projectId=${projectId}&organizationId=${organizationId}`
    ),

  getRejectedManagers: (projectId: string, organizationId: string) =>
    api.get<{ managers: ProjectManager[] }>(
      `/owner/project/project-managers/rejected?projectId=${projectId}&organizationId=${organizationId}`
    ),

  getProjectOwner: (projectId: string, organizationId: string) =>
    api.get<{ manager: ProjectManager | null }>(
      `/owner/project/project-manager/owner?projectId=${projectId}&organizationId=${organizationId}`
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
    api.get<{ plan: Plan; items: PlanItem[] }>(`/owner/plan/plans/${projectId}`),
};