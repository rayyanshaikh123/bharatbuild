"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, UserRole, auth } from "@/lib/auth";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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

// Helper to clear auth on 401 responses (call this from api.ts if needed)
export function clearAuthOnUnauthorized() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = "/login";
}