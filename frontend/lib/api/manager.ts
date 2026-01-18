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
}

export interface EngineerRequest {
  id: string;
  site_engineer_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  engineer_name?: string;
  engineer_email?: string;
  engineer_phone?: string;
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

export const managerEngineerRequests = {
  getPending: (projectId: string, organizationId: string) =>
    api.get<{ requests: EngineerRequest[] }>(
      `/manager/projects/project-requests?projectId=${projectId}&organizationId=${organizationId}`
    ),

  decide: (requestId: string, projectId: string, organizationId: string, decision: "APPROVED" | "REJECTED") =>
    api.put<{ message: string }>(`/manager/projects/project-requests/${requestId}/decision`, {
      projectId,
      organizationId,
      decision,
    }),
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
