import { api } from "./api";

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

// Owner Auth
export const ownerAuth = {
  register: (data: RegisterData) =>
    api.post<AuthResponse>("/auth/owner/register", data),

  login: (data: LoginData) =>
    api.post<AuthResponse>("/auth/owner/login", data),

  logout: () => api.post<{ message: string }>("/auth/owner/logout", {}),
};

// Manager Auth
export const managerAuth = {
  register: (data: RegisterData) =>
    api.post<AuthResponse>("/auth/manager/register", data),

  login: (data: LoginData) =>
    api.post<AuthResponse>("/auth/manager/login", data),

  logout: () => api.post<{ message: string }>("/auth/manager/logout", {}),
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
};