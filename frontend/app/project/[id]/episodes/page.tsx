'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, ChevronRight, ImagePlus, Sparkles, Check } from 'lucide-react'
import { CanonBadge } from '@/components/project-breadcrumb'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Episode {
  id: string
  title: string
  episode_number: number
  status: string
  description: string
  sceneCount: number
  completedScenes: number
  thumbnail: string | null
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft':
      return 'bg-secondary text-muted-foreground'
    case 'in-progress':
      return 'bg-accent/10 text-accent'
    case 'locked':
      return 'bg-emerald-500/15 text-emerald-400'
    default:
      return 'bg-secondary text-muted-foreground'
  }
}

export default function EpisodesPage() {
  const params = useParams()
  const projectId = params.id as string
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [generating, setGenerating] = useState<number | null>(null)
  const [justGenerated, setJustGenerated] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newEpisodeNumber, setNewEpisodeNumber] = useState(1)

  useEffect(() => {
    let isMounted = true
    const fetchEpisodes = async () => {
      try {
        setLoading(true)
        const fullProject = await apiClient.getProjectFull(projectId)
        if (!isMounted) return
        const mapped = fullProject.episodes.map((ep: any) => ({
          id: ep.id,
          title: `Episode ${ep.episodeNumber}`,
          episode_number: ep.episodeNumber,
          status: 'draft',
          description: ep.bibleText || '',
          sceneCount: ep.parts?.length || 0,
          completedScenes: 0,
          thumbnail: null,
        }))
        setEpisodes(mapped)
      } catch (error) {
        console.error('Failed to load episodes', error)
        toast.error('Failed to load episodes')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchEpisodes()
    return () => {
      isMounted = false
    }
  }, [projectId])

  const handleCreateEpisode = async () => {
    if (!newTitle.trim()) {
      toast.error('Episode title is required')
      return
    }

    try {
      const created = await apiClient.createEpisode(projectId, {
        episodeNumber: newEpisodeNumber,
        bibleText: newTitle.trim()
      })
      setEpisodes((prev) => [
        ...prev,
        {
          id: created.id,
          title: `Episode ${created.episodeNumber}`,
          episode_number: created.episodeNumber,
          status: 'draft',
          description: created.bibleText || '',
          sceneCount: 0,
          completedScenes: 0,
          thumbnail: null,
        },
      ])
      setDialogOpen(false)
      setNewTitle('')
      toast.success('Episode created')
    } catch (error) {
      console.error('Failed to create episode', error)
      toast.error('Failed to create episode')
    }
  }

  const handleGenerateThumbnail = (epNumber: number) => {
    setGenerating(epNumber)
    // Simulate AI thumbnail generation
    setTimeout(() => {
      setEpisodes((prev) =>
        prev.map((ep) =>
          ep.episode_number === epNumber
            ? { ...ep, thumbnail: `/images/ep-0${epNumber}-thumb.jpg` }
            : ep
        )
      )
      setGenerating(null)
      setJustGenerated(epNumber)
      setTimeout(() => setJustGenerated(null), 2000)
    }, 2400)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-8 bg-card">
        <div className="max-w-7xl mx-auto flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">Episodes</h1>
              <CanonBadge level="project" />
            </div>
            <p className="text-sm text-muted-foreground">Organize and structure your story across episodes and scenes.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" size="sm">
                <Plus size={16} className="mr-2" />
                Add Episode
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Episode</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="episodeTitle">Title</Label>
                  <Input
                    id="episodeTitle"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Episode title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="episodeNumber">Episode Number</Label>
                  <Input
                    id="episodeNumber"
                    type="number"
                    min={1}
                    value={newEpisodeNumber}
                    onChange={(e) => setNewEpisodeNumber(Number(e.target.value))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateEpisode}>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-6">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading episodes...</div>
            ) : episodes.length === 0 ? (
              <div className="text-sm text-muted-foreground">No episodes yet.</div>
            ) : episodes.map((episode) => {
              const isGenerating = generating === episode.episode_number
              const wasJustGenerated = justGenerated === episode.episode_number
              const progress = episode.sceneCount > 0
                ? Math.round((episode.completedScenes / episode.sceneCount) * 100)
                : 0

              return (
                <div key={episode.id} className="border border-border rounded-lg bg-card hover:border-accent/30 transition-colors overflow-hidden">
                  <div className="flex min-h-[140px]">
                    {/* Thumbnail area */}
                    <div className="relative w-60 flex-shrink-0 bg-secondary border-r border-border group">
                      {episode.thumbnail ? (
                        <>
                          <Image
                            src={episode.thumbnail || "/placeholder.svg"}
                            alt={`Episode ${episode.episode_number} thumbnail`}
                            width={240}
                            height={140}
                            className="w-full h-full object-cover"
                          />
                          {/* Regenerate overlay on hover */}
                          <Link
                            href={`/project/${projectId}/episode/${episode.id}/thumbnail`}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                              <ImagePlus size={12} />
                              Edit Thumbnail
                            </span>
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/project/${projectId}/episode/${episode.id}/thumbnail`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-muted-foreground hover:text-accent transition-colors"
                        >
                          <ImagePlus size={20} />
                          <span className="text-[10px] font-medium">Create Thumbnail</span>
                        </Link>
                      )}
                      {/* Ep number badge */}
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-background/80 backdrop-blur text-[10px] font-bold text-foreground">
                        EP{episode.episode_number}
                      </div>
                      {wasJustGenerated && (
                        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 animate-pulse pointer-events-none">
                          <Check size={24} className="text-emerald-400" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <Link href={`/project/${projectId}/episode/${episode.id}`} className="flex-1 min-w-0">
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${getStatusColor(episode.status)}`}>
                                {episode.status}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-1.5">{episode.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{episode.description || 'No description yet.'}</p>
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{episode.sceneCount} parts</span>
                            <span className="text-border">|</span>
                            <span>{episode.completedScenes} complete</span>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <div className="w-24 h-1 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium w-7 text-right">{progress}%</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Thumbnail workspace link */}
          <div className="mt-6 border border-dashed border-border rounded-lg bg-card/50 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Episode Thumbnails</p>
                  <p className="text-xs text-muted-foreground">Open the thumbnail editor for any episode to generate, style, and adjust cover art</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
