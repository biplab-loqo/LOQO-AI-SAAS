'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'

interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  bio?: string
}

interface Organization {
  id: string
  name: string
  members: Array<{
    id: string
    email: string
    name: string
    avatarUrl?: string
  }>
  created_at: string
}

interface AuthContextType {
  user: User | null
  organization: Organization | null
  loading: boolean
  login: (credential: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  createOrganization: (name: string) => Promise<void>
  addTeamMember: (email: string) => Promise<void>
  updateProfile: (data: { name?: string; bio?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

      apiClient.setToken(token)
      const data = await apiClient.getMe()
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
      })
      
      if (data.has_organization && data.organization) {
        setOrganization(data.organization)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      apiClient.clearToken()
      setUser(null)
      setOrganization(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credential: string) => {
    try {
      const response = await apiClient.googleLogin(credential)
      
      setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        avatarUrl: response.user.avatarUrl,
        bio: response.user.bio,
      })

      if (response.has_organization && response.organization) {
        setOrganization(response.organization)
        router.push('/dashboard')
      } else {
        router.push('/onboarding')
      }
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setOrganization(null)
      router.push('/auth/login')
    }
  }

  const refreshUser = async () => {
    try {
      const data = await apiClient.getMe()
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
      })
      
      if (data.has_organization && data.organization) {
        setOrganization(data.organization)
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  const createOrganization = async (name: string) => {
    try {
      const org = await apiClient.createOrganization(name)
      setOrganization(org)
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to create organization:', error)
      throw error
    }
  }

  const addTeamMember = async (email: string) => {
    try {
      await apiClient.addMember(email)
      await refreshUser()
    } catch (error) {
      console.error('Failed to add team member:', error)
      throw error
    }
  }

  const updateProfile = async (data: { name?: string; bio?: string }) => {
    try {
      const updated = await apiClient.updateProfile(data)
      setUser({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
      })
    } catch (error) {
      console.error('Failed to update profile:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        login,
        logout,
        refreshUser,
        createOrganization,
        addTeamMember,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
