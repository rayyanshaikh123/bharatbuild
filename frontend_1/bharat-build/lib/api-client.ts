const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Get the stored JWT token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

/**
 * Store the JWT token in localStorage
 */
export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token);
  }
}

/**
 * Remove the JWT token from localStorage
 */
export function removeToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
  }
}

/**
 * Make an authenticated API request to the backend
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  method: RequestMethod = "GET",
  body?: object
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        error: data?.message || data?.error || "Request failed",
        status: response.status,
      };
    }

    return {
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    console.error("API request failed:", error);
    return {
      error: error instanceof Error ? error.message : "Network error",
      status: 0,
    };
  }
}

// Auth-specific API calls
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  role: "admin" | "owner" | "manager";
  organization: string;
}

export interface AuthUser {
  id?: string;
  email: string;
  username?: string;
  role: "admin" | "owner" | "manager";
  organization?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/**
 * Login with email and password
 */
export async function loginApi(credentials: LoginCredentials) {
  return apiRequest<AuthResponse>("/auth/login", "POST", credentials);
}

/**
 * Register a new user
 */
export async function registerApi(data: RegisterData) {
  return apiRequest<AuthResponse>("/auth/register", "POST", data);
}

/**
 * Get current user from token
 */
export async function getMeApi() {
  return apiRequest<AuthUser>("/auth/me", "GET");
}

/**
 * Logout (optional server-side logout)
 */
export async function logoutApi() {
  return apiRequest("/auth/logout", "POST");
}
