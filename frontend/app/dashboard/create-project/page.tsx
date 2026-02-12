'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { GlobalTopbar } from '@/components/global-topbar'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/context/auth-context'
import { StudioPageLoader } from '@/components/studio-loading'

export default function CreateProjectPage() {
  const router = useRouter()
  const { user, organization, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  // Auth check
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
  }, [user, organization, loading, router])

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Project name is required')
      return
    }

    setIsLoading(true)
    try {
      const project = await apiClient.createProject({
        name: formData.name,
        description: formData.description || undefined,
      })
      
      toast.success('Project created successfully!')
      router.push(`/project/${project.id}`)
    } catch (error) {
      console.error('Failed to create project:', error)
      toast.error('Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || !user || !organization) {
    return <StudioPageLoader message="Preparing studio..." />
  }

  return (
    <div className="flex h-screen bg-background flex-col">
      <GlobalTopbar />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-h-screen bg-background overflow-y-auto">
          {/* Header */}
          <header className="bg-card border-b border-border sticky top-0 z-40">
            <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft size={16} />
                  Back to projects
                </Button>
              </Link>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-3xl mx-auto px-6 py-12 w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Create New Project</h1>
              <p className="text-muted-foreground">Start a new cinematic project.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Project Details */}
              <Card className="bg-card border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">Project Details</h2>

                <div className="space-y-6">
                  {/* Project Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground font-medium">
                      Project Name *
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g., The Forgotten City"
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-foreground font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Brief overview of your project..."
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-24 resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Link href="/dashboard">
                  <Button type="button" variant="outline" disabled={isLoading}>
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isLoading ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </div>
  )
}
