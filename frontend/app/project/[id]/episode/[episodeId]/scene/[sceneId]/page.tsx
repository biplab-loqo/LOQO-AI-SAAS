'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileText, Camera, Layers, ImagePlus, Film, ArrowRight } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { StudioSectionLoader } from '@/components/studio-loading'
import { motion } from 'framer-motion'

type PipelineStep = 'beat-map' | 'shot-list' | 'storyboard' | 'images' | 'clips'

const pipelineSteps: { key: PipelineStep; label: string; icon: React.ElementType; href: string; color: string; gradient: string }[] = [
  { key: 'beat-map', label: 'Beat Map', icon: FileText, href: '/beats', color: 'text-purple-400', gradient: 'from-purple-500/20 to-violet-500/20' },
  { key: 'shot-list', label: 'Shot List', icon: Camera, href: '/shots', color: 'text-cyan-400', gradient: 'from-cyan-500/20 to-blue-500/20' },
  { key: 'storyboard', label: 'Storyboard', icon: Layers, href: '/storyboard', color: 'text-orange-400', gradient: 'from-orange-500/20 to-amber-500/20' },
  { key: 'images', label: 'Images', icon: ImagePlus, href: '/images', color: 'text-pink-400', gradient: 'from-pink-500/20 to-rose-500/20' },
  { key: 'clips', label: 'Clips', icon: Film, href: '/clips', color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-green-500/20' },
]

export default function PartPage() {
  const params = useParams()
  const projectId = params.id as string
  const episodeId = params.episodeId as string
  const sceneId = params.sceneId as string
  const basePath = `/project/${projectId}/episode/${episodeId}/scene/${sceneId}`

  const [loading, setLoading] = useState(true)
  const [partTitle, setPartTitle] = useState('Part')
  const [episodeNumber, setEpisodeNumber] = useState<number | string>('')
  const [counts, setCounts] = useState({
    beats: 0,
    shots: 0,
    storyboard: 0,
    images: 0,
    clips: 0,
  })

  useEffect(() => {
    let isMounted = true
    const fetchCounts = async () => {
      try {
        setLoading(true)
        const [episode, part] = await Promise.all([
          apiClient.getEpisode(projectId, episodeId),
          apiClient.getPart(projectId, episodeId, sceneId),
        ])

        if (!isMounted) return
        setEpisodeNumber(episode.episodeNumber)
        setPartTitle(part.title)

        const [beats, shots, images, clips] = await Promise.all([
          apiClient.getBeats(sceneId),
          apiClient.getShots(sceneId),
          apiClient.getPartImages(sceneId),
          apiClient.getPartClips(sceneId),
        ])
        const shotsCount = shots.length
        const imagesCount = images.length
        const clipsCount = clips.length

        const storyboardCount = 0 // TODO: Fetch storyboard count separately

        if (!isMounted) return
        setCounts({
          beats: beats.length,
          shots: shotsCount,
          storyboard: storyboardCount,
          images: imagesCount,
          clips: clipsCount,
        })
      } catch (error) {
        console.error('Failed to load scene summary', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchCounts()
    return () => {
      isMounted = false
    }
  }, [projectId, episodeId, sceneId])

  const stepStats = useMemo(() => ({
    'beat-map': counts.beats,
    'shot-list': counts.shots,
    storyboard: counts.storyboard,
    images: counts.images,
    clips: counts.clips,
  }), [counts])

  if (loading) {
    return <StudioSectionLoader message="Loading part..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-accent font-bold uppercase tracking-widest">Episode {episodeNumber}</p>
              <h1 className="text-2xl font-bold text-foreground mt-1">{partTitle}</h1>
              <p className="text-xs text-muted-foreground mt-1">Production Pipeline</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {pipelineSteps.map((step, i) => {
            const StepIcon = step.icon
            const count = stepStats[step.key]
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link href={`${basePath}${step.href}`} className="block group">
                  <div className="border border-border/30 rounded-2xl bg-card/50 p-5 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-3`}>
                      <StepIcon size={18} className={step.color} />
                    </div>
                    <span className="text-sm font-bold text-foreground block">{step.label}</span>
                    <p className="text-xs text-muted-foreground mt-1">{count} items</p>
                    <div className="flex items-center gap-1 mt-3 text-[10px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Open</span>
                      <ArrowRight size={10} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl border-border/50 hover:border-accent/30 hover:text-accent">
            <Link href={`${basePath}/beats`}>View Beat Map</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl border-border/50 hover:border-accent/30 hover:text-accent">
            <Link href={`${basePath}/shots`}>View Shot List</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl border-border/50 hover:border-accent/30 hover:text-accent">
            <Link href={`${basePath}/storyboard`}>View Storyboard</Link>
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
