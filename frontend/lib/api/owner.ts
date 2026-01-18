import { api } from "../api";

// ==================== TYPES ====================

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

  getAll: () =>
    api.get<{ organizations: Organization[] }>("/owner/organization/organizations"),

  getById: (id: string) =>
    api.get<{ organization: Organization }>(`/owner/organization/organization/${id}`),

  update: (id: string, data: Partial<{ name: string; address: string; phone: string; org_type: string }>) =>
    api.put<{ organization: Organization }>(`/owner/organization/organization/${id}`, data),

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
    api.get<{ managers: ManagerRequest[] }>(`/owner/requests/?orgId=${orgId}`),

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
