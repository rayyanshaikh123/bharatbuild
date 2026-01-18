import { api } from "./api";

export type UserRole = "OWNER" | "MANAGER";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

export interface Organization {
  id: string;
  name: string;
  address: string;
  office_phone: string;
  org_type: string;
  owner_id: string;
  created_at: string;
}

interface AuthResponse {
  message: string;
  user: User;
}

interface CheckAuthResponse {
  authenticated: boolean;
  owner?: User;
  manager?: User;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface CreateOrgData {
  name: string;
  address: string;
  phone: string;
  org_type: string;
}

// Owner Auth
export const ownerAuth = {
  register: (data: RegisterData) =>
    api.post<AuthResponse>("/auth/owner/register", data),

  login: (data: LoginData) =>
    api.post<AuthResponse>("/auth/owner/login", data),

  logout: () => api.post<{ message: string }>("/auth/owner/logout", {}),

  checkAuth: () =>
    api.get<CheckAuthResponse>("/owner/check-auth"),
};

// Manager Auth
export const managerAuth = {
  register: (data: RegisterData) =>
    api.post<AuthResponse>("/auth/manager/register", data),

  login: (data: LoginData) =>
    api.post<AuthResponse>("/auth/manager/login", data),

  logout: () => api.post<{ message: string }>("/auth/manager/logout", {}),

  checkAuth: () =>
    api.get<CheckAuthResponse>("/manager/check-auth"),
};

// Owner Organization API
export const ownerOrganization = {
  create: (data: CreateOrgData) =>
    api.post<{ organization: Organization }>("/owner/organization/create-organization", data),

  getAll: () =>
    api.get<{ organizations: Organization[] }>("/owner/organization/organizations"),

  getById: (id: string) =>
    api.get<{ organization: Organization }>(`/owner/organization/organization/${id}`),

  update: (id: string, data: Partial<CreateOrgData>) =>
    api.put<{ organization: Organization }>(`/owner/organization/organization/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/owner/organization/organization/${id}`),
};

// Owner Requests API (for manager approvals)
export const ownerRequests = {
  getPending: (orgId: string) =>
    api.get<{ managers: Array<{ id: string; manager_id: string; status: string }> }>(
      `/owner/requests/pending?orgId=${orgId}`
    ),

  getAccepted: (orgId: string) =>
    api.get<{ managers: Array<{ id: string; manager_id: string; status: string }> }>(
      `/owner/requests/accepted?orgId=${orgId}`
    ),

  updateStatus: (requestId: string, status: "APPROVED" | "REJECTED") =>
    api.put<{ request: { id: string; status: string } }>(
      `/owner/requests/${requestId}`,
      { status }
    ),
};

// Unified auth functions that route based on role
export const auth = {
  login: (role: UserRole, data: LoginData) => {
    return role === "OWNER" ? ownerAuth.login(data) : managerAuth.login(data);
  },

  register: (role: UserRole, data: RegisterData) => {
    return role === "OWNER"
      ? ownerAuth.register(data)
      : managerAuth.register(data);
  },

  logout: (role: UserRole) => {
    return role === "OWNER" ? ownerAuth.logout() : managerAuth.logout();
  },

  checkAuth: async (role: UserRole): Promise<User | null> => {
    try {
      const response = role === "OWNER" 
        ? await ownerAuth.checkAuth() 
        : await managerAuth.checkAuth();
      
      if (response.authenticated) {
        // Return the user from the response (owner or manager)
        const user = response.owner || response.manager;
        if (user) {
          return { ...user, role };
        }
      }
      return null;
    } catch {
      return null;
    }
  },
};