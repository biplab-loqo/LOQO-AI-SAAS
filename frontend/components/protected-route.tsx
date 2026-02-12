'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

interface ProtectedRouteProps {
  children: ReactNode
  requireOrganization?: boolean
}

export function ProtectedRoute({ 
  children, 
  requireOrganization = false 
}: ProtectedRouteProps) {
  const { user, organization, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
      } else if (requireOrganization && !organization) {
        router.push('/onboarding')
      }
    }
  }, [user, organization, loading, requireOrganization, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requireOrganization && !organization) {
    return null
  }

  return <>{children}</>
}
