"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, UserRole, auth } from "@/lib/api/auth";

const STORAGE_KEY = "bharatbuild_session";
const SESSION_DURATION_DAYS = 16;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000; // 16 days in milliseconds

interface StoredSession {
  user: User;
  expiresAt: number; // Unix timestamp
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (role: UserRole, email: string, password: string) => Promise<void>;
  register: (
    role: UserRole,
    data: { name: string; email: string; phone: string; password: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to check if session is expired
function isSessionExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

// Helper to create session with expiry
function createSession(user: User): StoredSession {
  return {
    user,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate session with backend
  const validateSession = useCallback(async (storedUser: User): Promise<User | null> => {
    try {
      const validatedUser = await auth.checkAuth(storedUser.role);
      if (validatedUser) {
        return validatedUser;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Load user from localStorage and validate with backend on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const session = JSON.parse(stored) as StoredSession;
          
          // Check if session has expired
          if (isSessionExpired(session.expiresAt)) {
            localStorage.removeItem(STORAGE_KEY);
            setUser(null);
            return;
          }

          const validatedUser = await validateSession(session.user);

          if (validatedUser) {
            setUser(validatedUser);
            // Refresh session expiry on successful validation
            localStorage.setItem(STORAGE_KEY, JSON.stringify(createSession(validatedUser)));
          } else {
            localStorage.removeItem(STORAGE_KEY);
            setUser(null);
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [validateSession]);

  // Persist user to localStorage when it changes (with expiry)
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(createSession(user)));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = useCallback(async (role: UserRole, email: string, password: string) => {
    const response = await auth.login(role, { email, password });
    setUser(response.user);
  }, []);

  const register = useCallback(
    async (
      role: UserRole,
      data: { name: string; email: string; phone: string; password: string }
    ) => {
      const response = await auth.register(role, data);
      setUser(response.user);
    },
    []
  );

  const logout = useCallback(async () => {
    if (user) {
      try {
        await auth.logout(user.role);
      } catch {
        // Even if logout fails on server, clear local state
      }
    }
    setUser(null);
  }, [user]);

  const refreshSession = useCallback(async () => {
    if (user) {
      const validatedUser = await validateSession(user);
      if (validatedUser) {
        setUser(validatedUser);
      } else {
        setUser(null);
      }
    }
  }, [user, validateSession]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function clearAuthOnUnauthorized() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = "/login";
}

// Re-export types for convenience
export type { User, UserRole } from "@/lib/api/auth";