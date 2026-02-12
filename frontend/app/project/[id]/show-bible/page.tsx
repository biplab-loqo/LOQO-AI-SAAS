'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StudioSectionLoader } from '@/components/studio-loading'

type ProjectData = {
  id: string
  name: string
  description?: string
}

type EpisodeSummary = {
  id: string
  number: number
  title: string
  beatsCount: number
  shotsCount: number
  screenplayLinesCount: number
}

export default function ShowBiblePage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<ProjectData | null>(null)
  const [episodeSummaries, setEpisodeSummaries] = useState<EpisodeSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      try {
        setLoading(true)
        const fullProject = await apiClient.getProjectFull(projectId)

        if (!isMounted) return

        setProject({
          id: fullProject.id,
          name: fullProject.name,
          description: fullProject.description || '',
        })

        const episodeDetails = fullProject.episodes.map((ep: any) => {
          let beatsCount = 0
          let shotsCount = 0
          let screenplayLinesCount = 0

          for (const part of (ep.parts || [])) {
            beatsCount += part.beatCount ?? 0
            shotsCount += part.shotCount ?? 0
          }

          return {
            id: ep.id,
            number: ep.episodeNumber,
            title: `Episode ${ep.episodeNumber}`,
            beatsCount,
            shotsCount,
            screenplayLinesCount,
          }
        })

        if (!isMounted) return
        setEpisodeSummaries(episodeDetails)
      } catch (error) {
        console.error('Failed to load show bible data', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()
    return () => {
      isMounted = false
    }
  }, [projectId])

  const stats = useMemo(() => {
    const episodes = episodeSummaries.length
    const beats = episodeSummaries.reduce((sum, ep) => sum + ep.beatsCount, 0)
    const shots = episodeSummaries.reduce((sum, ep) => sum + ep.shotsCount, 0)
    const screenplayLines = episodeSummaries.reduce((sum, ep) => sum + ep.screenplayLinesCount, 0)

    return { episodes, beats, shots, screenplayLines }
  }, [episodeSummaries])

  if (loading) {
    return <StudioSectionLoader message="Loading project bible..." />
  }

  if (!project) {
    return <div className="p-6 text-center">Project not found</div>
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border p-6 bg-card">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-2">Project Bible</p>
          <h1 className="text-2xl font-bold text-foreground mb-2">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.description || 'No description'}</p>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Episodes', value: stats.episodes },
              { label: 'Beats', value: stats.beats },
              { label: 'Shots', value: stats.shots },
            ].map((stat) => (
              <Card key={stat.label} className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
              </Card>
            ))}
          </div>

          {/* Project Overview */}
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Project Details</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {project.description || 'No description provided.'}
              </p>
            </div>
          </Card>

          {/* Story Structure Overview */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Story Structure</h2>
            <div className="space-y-4">
              {episodeSummaries.map((episode) => (
                <div key={episode.id} className="border border-border rounded p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground">Episode {episode.number}: {episode.title}</h3>
                    <Badge className="bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300 capitalize">in-progress</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground mt-3">
                    <div>
                      <p className="font-semibold text-muted-foreground">Beats</p>
                      <p className="text-foreground/80">{episode.beatsCount}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Shots</p>
                      <p className="text-foreground/80">{episode.shotsCount}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Screenplay Lines</p>
                      <p className="text-foreground/80">{episode.screenplayLinesCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* World Building Summary */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Characters */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Characters</h2>
              <p className="text-xs text-muted-foreground">Coming soon — character management is being redesigned.</p>
            </Card>

            {/* Locations */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Locations</h2>
              <p className="text-xs text-muted-foreground">Coming soon — location management is being redesigned.</p>
            </Card>
          </div>

          {/* Production Metadata */}
          <Card className="p-6 space-y-4 border-dashed">
            <h2 className="text-lg font-semibold text-foreground mb-4">Production Metadata</h2>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="font-semibold text-muted-foreground mb-1">Total Screenplay Lines</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.screenplayLines}
                </p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground mb-1">Average Beat Duration</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.beats > 0 ? `${Math.round((stats.screenplayLines / stats.beats) * 10) / 10}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground mb-1">Average Shots per Beat</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.beats > 0 ? Math.round((stats.shots / stats.beats) * 10) / 10 : 'N/A'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
