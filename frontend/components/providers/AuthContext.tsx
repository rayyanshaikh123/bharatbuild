"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, UserRole, auth } from "@/lib/api/auth";

const STORAGE_KEY = "bharatbuild_user";

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
          const storedUser = JSON.parse(stored) as User;
          const validatedUser = await validateSession(storedUser);

          if (validatedUser) {
            setUser(validatedUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validatedUser));
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

  // Persist user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
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