"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  type AuthUser,
  getToken,
  getMeApi,
  loginApi,
  type LoginCredentials,
  logoutApi,
  registerApi,
  type RegisterData,
  removeToken,
  setToken,
} from "@/lib/api-client"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<boolean>
  register: (data: RegisterData) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Check for existing session on mount
  useEffect(() => {
    async function checkAuth() {
      const token = getToken()
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await getMeApi()
        if (response.data) {
          setUser(response.data)
        } else {
          // Token is invalid, remove it
          removeToken()
        }
      } catch (err) {
        console.error("Auth check failed:", err)
        removeToken()
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await loginApi(credentials)

      if (response.error) {
        setError(response.error)
        setLoading(false)
        return false
      }

      if (response.data) {
        setToken(response.data.token)
        setUser(response.data.user)
        setLoading(false)
        
        // Redirect based on role
        const role = response.data.user.role
        router.push(`/${role}`)
        return true
      }

      setLoading(false)
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
      setLoading(false)
      return false
    }
  }, [router])

  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await registerApi(data)

      if (response.error) {
        setError(response.error)
        setLoading(false)
        return false
      }

      if (response.data) {
        setToken(response.data.token)
        setUser(response.data.user)
        setLoading(false)
        
        // Redirect based on role
        const role = response.data.user.role
        router.push(`/${role}`)
        return true
      }

      setLoading(false)
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
      setLoading(false)
      return false
    }
  }, [router])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await logoutApi()
    } catch (err) {
      console.error("Logout API failed:", err)
    } finally {
      removeToken()
      setUser(null)
      setLoading(false)
      router.push("/login")
    }
  }, [router])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
