import { api } from "../api";

// ==================== TYPES ====================
export type UserRole = "OWNER" | "MANAGER" | "PO_MANAGER";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

interface AuthResponse {
  message: string;
  user: User;
}

interface CheckAuthResponse {
  authenticated: boolean;
  owner?: User;
  manager?: User;
  user?: User; // Used by PO_MANAGER check-auth
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

// ==================== HELPER ====================

function getAuthEndpoint(role: UserRole, action: string): string {
  if (role === "OWNER") return `/auth/owner/${action}`;
  if (role === "PO_MANAGER") return `/auth/purchase-manager/${action}`;
  return `/auth/manager/${action}`;
}

function getCheckAuthEndpoint(role: UserRole): string {
  if (role === "OWNER") return "/owner/check-auth";
  if (role === "PO_MANAGER") return "/purchase-manager/check-auth";
  return "/manager/check-auth";
}

// ==================== AUTH FUNCTIONS ====================

export const auth = {
  // Login with role-based routing
  login: (role: UserRole, data: LoginData) => {
    return api.post<AuthResponse>(getAuthEndpoint(role, "login"), data);
  },

  // Register with role-based routing
  register: (role: UserRole, data: RegisterData) => {
    return api.post<AuthResponse>(getAuthEndpoint(role, "register"), data);
  },

  // Logout with role-based routing
  logout: (role: UserRole) => {
    return api.post<{ message: string }>(getAuthEndpoint(role, "logout"), {});
  },

  // Validate session - returns null if invalid
  checkAuth: async (role: UserRole): Promise<User | null> => {
    try {
      const response = await api.get<CheckAuthResponse>(getCheckAuthEndpoint(role));

      if (response.authenticated) {
        // owner and manager use their specific keys, PO_MANAGER uses 'user'
        const userData = response.owner || response.manager || response.user;
        if (userData) {
          return { ...userData, role };
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  // Forgot password
  forgotPassword: async (role: UserRole, email: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>(getAuthEndpoint(role, "forgot-password"), { email });
  },
};
