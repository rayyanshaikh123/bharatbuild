const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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