import { api } from "../api";

// ==================== TYPES ====================
export type UserRole = "OWNER" | "MANAGER";

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

// ==================== AUTH FUNCTIONS ====================

export const auth = {
  // Login with role-based routing
  login: (role: UserRole, data: LoginData) => {
    const endpoint = role === "OWNER" ? "/auth/owner/login" : "/auth/manager/login";
    return api.post<AuthResponse>(endpoint, data);
  },

  // Register with role-based routing
  register: (role: UserRole, data: RegisterData) => {
    const endpoint = role === "OWNER" ? "/auth/owner/register" : "/auth/manager/register";
    return api.post<AuthResponse>(endpoint, data);
  },

  // Logout with role-based routing
  logout: (role: UserRole) => {
    const endpoint = role === "OWNER" ? "/auth/owner/logout" : "/auth/manager/logout";
    return api.post<{ message: string }>(endpoint, {});
  },

  // Validate session - returns null if invalid
  checkAuth: async (role: UserRole): Promise<User | null> => {
    try {
      const endpoint = role === "OWNER" ? "/owner/check-auth" : "/manager/check-auth";
      const response = await api.get<CheckAuthResponse>(endpoint);

      if (response.authenticated) {
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

  // Forgot password (mock - no backend endpoint exists yet)
  forgotPassword: async (role: UserRole, email: string): Promise<{ message: string }> => {
    // TODO: Implement when backend endpoint is available
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { message: "If an account exists, a reset link has been sent." };
  },
};
