'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Film, ArrowRight, Sparkles, ChevronRight } from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { GlobalTopbar } from '@/components/global-topbar'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { StudioPageLoader, DashboardSkeleton } from '@/components/studio-loading'

interface Project {
  id: string
  name: string
  description: string | null
  organization_id: string
  created_at: string
  updated_at: string
}

const cardAccents = [
  { gradient: 'from-purple-600 to-violet-600', border: 'hover:border-purple-500/40', glow: 'group-hover:shadow-purple-500/10', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { gradient: 'from-cyan-500 to-blue-600', border: 'hover:border-cyan-500/40', glow: 'group-hover:shadow-cyan-500/10', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { gradient: 'from-pink-500 to-rose-600', border: 'hover:border-pink-500/40', glow: 'group-hover:shadow-pink-500/10', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { gradient: 'from-orange-500 to-amber-600', border: 'hover:border-orange-500/40', glow: 'group-hover:shadow-orange-500/10', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { gradient: 'from-emerald-500 to-green-600', border: 'hover:border-emerald-500/40', glow: 'group-hover:shadow-emerald-500/10', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { gradient: 'from-blue-500 to-indigo-600', border: 'hover:border-blue-500/40', glow: 'group-hover:shadow-blue-500/10', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
]

export default function DashboardPage() {
  const { user, organization, loading } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string; avatarUrl: string | null }>>([])

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
        return
      }
      if (!organization) {
        router.replace('/onboarding')
        return
      }
      fetchDashboardData()
    }
  }, [user, organization, loading, router])

  const fetchDashboardData = async () => {
    try {
      setLoadingProjects(true)
      const [projectsData, membersData] = await Promise.all([
        apiClient.getProjects(),
        apiClient.getMembers().catch(() => []),
      ])
      setProjects(projectsData)
      setMembers(membersData)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoadingProjects(false)
    }
  }

  if (loading || !user || !organization) {
    return <StudioPageLoader message="Preparing your studio..." />
  }

  return (
    <div className="flex h-screen bg-background flex-col">
      <GlobalTopbar />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-h-screen bg-background overflow-y-auto">
          {/* Header */}
          <header className="relative bg-card border-b border-border/50 sticky top-0 z-40 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/[0.03] via-transparent to-[hsl(var(--studio-cyan)/0.03)]" />
            <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-semibold text-accent uppercase tracking-widest">Studio Dashboard</span>
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                  Welcome back, <span className="bg-gradient-to-r from-accent to-[hsl(var(--studio-cyan))] bg-clip-text text-transparent">{user.name.split(' ')[0]}</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{organization.name} · {projects.length} project{projects.length !== 1 ? 's' : ''}</p>
              </div>
              <Link href="/dashboard/create-project">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 rounded-xl shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all">
                  <Plus size={18} />
                  New Project
                </Button>
              </Link>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-6 py-10 w-full space-y-8">
            {loadingProjects ? (
              <DashboardSkeleton />
            ) : (
              <>
                {/* Projects Grid with Team Snapshot */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Film className="w-5 h-5 text-accent" />
                        Your Projects
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} in your organization</p>
                    </div>

                    {/* Team Members Quick Snapshot */}
                    {members.length > 0 && (
                      <Link href="/team" className="group">
                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-border/50 bg-card hover:border-accent/30 hover:bg-accent/5 transition-all">
                          <div className="flex -space-x-2">
                            {members.slice(0, 4).map((member, idx) => (
                              <div
                                key={member.id}
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 border-2 border-background flex items-center justify-center flex-shrink-0 transition-transform group-hover:translate-y-[-2px]"
                                style={{ transitionDelay: `${idx * 50}ms` }}
                              >
                                {member.avatarUrl ? (
                                  <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <span className="text-xs font-bold text-accent">{member.name.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                            ))}
                            {members.length > 4 && (
                              <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-muted-foreground">+{members.length - 4}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-xs font-semibold text-foreground">Team</p>
                              <p className="text-[10px] text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                            </div>
                            <ChevronRight size={14} className="text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>

                  {projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {projects.map((project, index) => {
                        const accent = cardAccents[index % cardAccents.length]
                        return (
                          <Link key={project.id} href={`/project/${project.id}`}>
                            <div className={`group relative rounded-2xl border border-border/50 bg-card ${accent.border} transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-xl ${accent.glow}`}>
                              {/* Gradient top bar */}
                              <div className={`h-1 bg-gradient-to-r ${accent.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

                              {/* Hover glow effect */}
                              <div className={`absolute inset-0 bg-gradient-to-br ${accent.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />

                              <div className="relative p-6">
                                <div className="flex items-center justify-between mb-4">
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${accent.badge}`}>
                                    <Film size={12} />
                                    Project
                                  </div>
                                  <ChevronRight size={16} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-all group-hover:translate-x-0.5" />
                                </div>

                                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-accent transition-colors">{project.name}</h3>

                                {project.description && (
                                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{project.description}</p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Film size={12} /> Project</span>
                                </div>

                                <div className="mt-5 pt-4 border-t border-border/50">
                                  <div className="flex items-center justify-between text-sm font-medium text-accent group-hover:text-accent/90">
                                    Open Project
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
                        <Film className="w-7 h-7 text-accent" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">No projects yet</h3>
                      <p className="text-muted-foreground text-sm mb-6 max-w-sm">Create your first cinematic project to start using AI-powered pre-production tools.</p>
                      <Link href="/dashboard/create-project">
                        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 rounded-xl shadow-lg shadow-accent/20">
                          <Plus size={18} />
                          Create Your First Project
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
