'use client'

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Layers, Plus, Sparkles, Clapperboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient, ProjectFullOut } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { refreshProjectData } from '@/lib/refresh-events'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StudioSectionLoader } from "@/components/studio-loading"
import { motion } from 'framer-motion'

/* ────────────────────────────────────────────────────────────
   TYPES
   ──────────────────────────────────────────────────────────── */
interface PartSummary {
  id: string
  title: string
  partNumber: number
}

interface EpisodeSummary {
  id: string
  number: number
  title: string
  bibleText: string | null
  parts: PartSummary[]
}

/* ────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────── */
export default function ProjectOverviewPage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()

  const [project, setProject] = useState<{ id: string; name: string; description?: string | null } | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Create episode dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newEpisodeNumber, setNewEpisodeNumber] = useState(1)
  const [newEpisodeTitle, setNewEpisodeTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateEpisode = async () => {
    if (!newEpisodeTitle.trim()) return
    try {
      setIsCreating(true)
      const newEpisode = await apiClient.createEpisode(projectId, {
        episodeNumber: newEpisodeNumber,
        title: newEpisodeTitle.trim(),
      })
      setEpisodes(prev => [...prev, {
        id: newEpisode.id,
        number: newEpisode.episodeNumber,
        title: newEpisode.title || '',
        bibleText: newEpisode.bibleText ?? null,
        parts: [],
      }])
      setIsCreateDialogOpen(false)
      setNewEpisodeTitle('')
      setNewEpisodeNumber(prev => prev + 1)
      refreshProjectData()
    } catch (error) { console.error("Failed to create episode", error) }
    finally { setIsCreating(false) }
  }

  useEffect(() => {
    let alive = true
    const fetchProject = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getProjectFull(projectId)
        if (!alive) return
        setProject({ id: data.id, name: data.name, description: data.description })
        setEpisodes((data.episodes || []).map((ep: any) => ({
          id: ep.id,
          number: ep.episodeNumber,
          title: ep.title || '',
          bibleText: ep.bibleText,
          parts: (ep.parts || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            partNumber: p.partNumber,
          })),
        })))
        if (data.episodes && data.episodes.length > 0) {
          const maxNum = Math.max(...data.episodes.map((e: any) => e.episodeNumber))
          setNewEpisodeNumber(maxNum + 1)
        }
      } catch (error) { console.error('Failed to load project', error) }
      finally { if (alive) setLoading(false) }
    }
    fetchProject()
    return () => { alive = false }
  }, [projectId])

  if (loading) {
    return <StudioSectionLoader message="Loading project..." />
  }

  if (!project) return null

  // Compute totals
  const totalParts = episodes.reduce((s, e) => s + e.parts.length, 0)

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* ═══ Header ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative border-b border-border bg-card"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-accent/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Project Overview</p>
                <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{project.description}</p>
                )}
              </div>

              {/* Inline Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5">
                  <Clapperboard size={14} className="text-accent" />
                  <span className="font-semibold text-foreground">{episodes.length}</span>
                  <span className="text-muted-foreground">Episodes</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Layers size={14} className="text-emerald-500" />
                  <span className="font-semibold text-foreground">{totalParts}</span>
                  <span className="text-muted-foreground">Parts</span>
                </div>
              </div>
            </div>

            <Badge className="bg-accent/15 text-accent border border-accent/20 text-xs font-semibold flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 mr-1" />In Progress
            </Badge>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* ═══ Episodes & Parts ═══ */}
        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Episodes & Parts</h2>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-accent hover:text-accent hover:bg-accent/10 px-3 rounded-lg">
                  <Plus size={14} className="mr-1.5" /> Add Episode
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Create New Episode</DialogTitle>
                  <DialogDescription>Add a new episode to your series.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="ep-title" className="text-xs font-semibold">Episode Title <span className="text-red-400">*</span></Label>
                    <Input id="ep-title" value={newEpisodeTitle} onChange={(e) => setNewEpisodeTitle(e.target.value)} placeholder="e.g. The Beginning" className="rounded-xl" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ep-number" className="text-xs font-semibold">Episode Number</Label>
                    <Input id="ep-number" type="number" value={newEpisodeNumber} onChange={(e) => setNewEpisodeNumber(parseInt(e.target.value))} className="rounded-xl" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button onClick={handleCreateEpisode} disabled={isCreating || !newEpisodeTitle.trim()} className="rounded-xl bg-accent hover:bg-accent/90 shadow-md">
                    {isCreating ? "Creating..." : "Create Episode"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {episodes.length === 0 ? (
            <Card className="p-10 text-center border-dashed rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Clapperboard className="w-6 h-6 text-accent/50" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No episodes yet</p>
              <p className="text-xs text-muted-foreground">Create your first episode to get started</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {episodes.map((ep, i) => {
                return (
                  <motion.div
                    key={ep.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                  >
                    <Link href={`/project/${projectId}/episode/${ep.id}`}>
                      <div className="border border-border/40 rounded-xl bg-card overflow-hidden hover:border-accent/30 hover:bg-accent/[0.03] transition-all cursor-pointer group">
                        {/* Episode row */}
                        <div className="flex items-center gap-4 p-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/10 flex items-center justify-center flex-shrink-0">
                            <Clapperboard className="w-5 h-5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                              {ep.title ? ep.title : `Episode ${ep.number}`}
                            </p>
                            <p className="text-xs text-muted-foreground/60 font-medium">Episode {ep.number}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              <span>{ep.parts.length} part{ep.parts.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-accent transition-colors flex-shrink-0" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  )
}
