'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User, TokenResponse } from '@/types'
import { authApi } from '@/services/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isParent: boolean
  isChild: boolean
  login: (username: string, password: string) => Promise<void>
  register: (data: { email: string; username: string; password: string; full_name: string; role?: string }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setIsLoading(false)
        return
      }
      const { data } = await authApi.getMe()
      setUser(data)
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (username: string, password: string) => {
    const { data } = await authApi.login(username, password)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    // Set cookie for middleware (server-side auth check)
    document.cookie = `access_token=${data.access_token}; path=/; max-age=${60*60*24}; SameSite=Lax`
    document.cookie = `user=${JSON.stringify(data.user)}; path=/; max-age=${60*60*24}; SameSite=Lax`
    setUser(data.user)
  }

  const register = async (registerData: { email: string; username: string; password: string; full_name: string; role?: string }) => {
    const { data } = await authApi.register(registerData)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    document.cookie = `access_token=${data.access_token}; path=/; max-age=${60*60*24}; SameSite=Lax`
    document.cookie = `user=${JSON.stringify(data.user)}; path=/; max-age=${60*60*24}; SameSite=Lax`
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    // Clear auth cookies
    document.cookie = 'access_token=; path=/; max-age=0'
    document.cookie = 'user=; path=/; max-age=0'
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isParent: user?.role === 'parent',
        isChild: user?.role === 'child',
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
