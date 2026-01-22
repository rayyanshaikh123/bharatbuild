export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Generic fetch wrapper with credentials (for cookies/sessions)
async function fetcher<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include", // ← CRITICAL: This sends cookies with requests
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Clear session and redirect to login if unauthorized
      if (typeof window !== "undefined") {
        localStorage.removeItem("bharatbuild_session"); // Hardcoded key to avoid circular import
        if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/register")) {
           window.location.href = "/login";
        }
      }
    }
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.message || "Request failed");
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => fetcher<T>(endpoint),
  
  post: <T>(endpoint: string, data: unknown) =>
    fetcher<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  put: <T>(endpoint: string, data: unknown) =>
    fetcher<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  patch: <T>(endpoint: string, data: unknown) =>
    fetcher<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    
  delete: <T>(endpoint: string, data?: Record<string, unknown>) =>
    fetcher<T>(endpoint, { 
      method: "DELETE",
      ...(data ? { body: JSON.stringify(data) } : {}),
    }),
};