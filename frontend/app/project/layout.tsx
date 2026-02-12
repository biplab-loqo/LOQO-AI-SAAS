'use client'

import React from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { StudioPageLoader } from "@/components/studio-loading"

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, organization, loading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
        return
      }
      if (!organization) {
        router.replace('/onboarding')
        return
      }
    }
  }, [loading, organization, user, router])

  if (loading) {
    return <StudioPageLoader message="Loading studio..." />
  }

  if (!user || !organization) {
    return <StudioPageLoader message="Redirecting..." />
  }

  return <>{children}</>
}
