export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Generic fetch wrapper with credentials (for cookies/sessions)
async function fetcher<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = { ...(options.headers as Record<string, string>) };

  // Only set JSON content type if not FormData (browser sets boundary for FormData)
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include", // ← CRITICAL: This sends cookies with requests
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Clear session and redirect to login if unauthorized
      if (typeof window !== "undefined") {
        localStorage.removeItem("bharatbuild_session"); // Hardcoded key to avoid circular import
        if (
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register")
        ) {
          window.location.href = "/login";
        }
      }
    }

    // Try to parse error response
    let errorMessage = "Request failed";
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      // If JSON parsing fails, try to get text
      try {
        const errorText = await res.text();
        if (errorText) errorMessage = errorText;
      } catch (textError) {
        // Use default error message
      }
    }

    // Include status code in error message for debugging
    const error = new Error(`${errorMessage} (HTTP ${res.status})`);
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => fetcher<T>(endpoint),

  post: <T>(endpoint: string, data: unknown) => {
    const isFormData = data instanceof FormData;
    return fetcher<T>(endpoint, {
      method: "POST",
      body: isFormData ? (data as FormData) : JSON.stringify(data),
    });
  },

  put: <T>(endpoint: string, data: unknown) => {
    const isFormData = data instanceof FormData;
    return fetcher<T>(endpoint, {
      method: "PUT",
      body: isFormData ? (data as FormData) : JSON.stringify(data),
    });
  },

  patch: <T>(endpoint: string, data: unknown) => {
    const isFormData = data instanceof FormData;
    return fetcher<T>(endpoint, {
      method: "PATCH",
      body: isFormData ? (data as FormData) : JSON.stringify(data),
    });
  },

  delete: <T>(endpoint: string, data?: Record<string, unknown>) =>
    fetcher<T>(endpoint, {
      method: "DELETE",
      ...(data ? { body: JSON.stringify(data) } : {}),
    }),

  getBlob: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch blob");
    return res.blob();
  },

  defaults: {
    baseURL: API_URL,
    headers: {
      "Content-Type": "application/json",
    },
  },
};
