'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Film, Download, Trash2, Play, Pause, Columns, Grid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import { StudioSectionLoader } from '@/components/studio-loading'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRef } from 'react'

interface ClipItem {
  id: string
  partId: string
  shotId: string
  clipUrl: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

interface ShotInfo {
  id: string
  shotName: string
  shotNumber: number
}

export default function ClipsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const episodeId = params.episodeId as string
  const sceneId = params.sceneId as string
  const basePath = `/project/${projectId}/episode/${episodeId}/scene/${sceneId}`

  const [clips, setClips] = useState<ClipItem[]>([])
  const [shots, setShots] = useState<ShotInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [previewClip, setPreviewClip] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'columns' | 'grid'>('columns')
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [clipData, shotData] = await Promise.all([
          apiClient.getPartClips(sceneId),
          apiClient.getShots(sceneId),
        ])
        setClips(clipData)
        setShots(shotData.map((s: any) => ({ id: s.id, shotName: s.shotName, shotNumber: s.shotNumber })))
      } catch (err) {
        console.error('Failed to fetch clips:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [projectId, episodeId, sceneId])

  // Build shot name map
  const shotNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    shots.forEach(s => { map[s.id] = s.shotName })
    return map
  }, [shots])

  // Group clips by shotId
  const groupedClips = useMemo(() => {
    const groups: Record<string, ClipItem[]> = {}
    clips.forEach(clip => {
      const key = clip.shotId
      if (!groups[key]) groups[key] = []
      groups[key].push(clip)
    })
    const sortedEntries = Object.entries(groups).sort((a, b) => {
      const shotA = shots.find(s => s.id === a[0])
      const shotB = shots.find(s => s.id === b[0])
      return (shotA?.shotNumber || 0) - (shotB?.shotNumber || 0)
    })
    return sortedEntries
  }, [clips, shots])

  const handleDelete = async (clipId: string) => {
    try {
      await apiClient.deleteClip(clipId)
      setClips(prev => prev.filter(c => c.id !== clipId))
    } catch (err) {
      console.error('Failed to delete clip:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <StudioSectionLoader message="Loading clips..." />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-card/50 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <Link href={basePath}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-accent/10 hover:text-accent">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <Film size={16} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Clips</h1>
              <p className="text-[10px] text-muted-foreground">{clips.length} clips across {groupedClips.length} shots</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
            <button
              onClick={() => setViewMode('columns')}
              className={`p-1.5 transition-colors ${viewMode === 'columns' ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Columns size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Grid size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {clips.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Film size={28} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No clips yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Clips will appear here once generated for the shots in this part
            </p>
          </motion.div>
        ) : viewMode === 'columns' ? (
          /* Column view: each shot is a column, clips stacked vertically */
          <div className="flex gap-5 overflow-x-auto pb-4">
            {groupedClips.map(([shotId, shotClips], colIdx) => (
              <motion.div
                key={shotId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: colIdx * 0.08 }}
                className="flex-shrink-0 w-[320px]"
              >
                {/* Shot column header */}
                <div className="mb-3 px-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {shotNameMap[shotId] || `Shot ${shotId.slice(-4)}`}
                    </h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-4">{shotClips.length} clip{shotClips.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Clip stack */}
                <div className="space-y-3">
                  {shotClips.map((clip, clipIdx) => (
                    <ClipCard
                      key={clip.id}
                      clip={clip}
                      index={clipIdx}
                      colIdx={colIdx}
                      shotName={shotNameMap[shotId] || 'Shot'}
                      isPlaying={playingId === clip.id}
                      onPlay={() => setPlayingId(playingId === clip.id ? null : clip.id)}
                      onPreview={() => setPreviewClip(clip.clipUrl)}
                      onDelete={() => handleDelete(clip.id)}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {clips.map((clip, i) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                index={i}
                colIdx={0}
                shotName={shotNameMap[clip.shotId] || 'Shot'}
                isPlaying={playingId === clip.id}
                onPlay={() => setPlayingId(playingId === clip.id ? null : clip.id)}
                onPreview={() => setPreviewClip(clip.clipUrl)}
                onDelete={() => handleDelete(clip.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clip preview modal */}
      <AnimatePresence>
        {previewClip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setPreviewClip(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl w-full"
              onClick={e => e.stopPropagation()}
            >
              <video
                src={previewClip}
                controls
                autoPlay
                className="w-full rounded-xl shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ClipCard({
  clip,
  index,
  colIdx,
  shotName,
  isPlaying,
  onPlay,
  onPreview,
  onDelete,
}: {
  clip: ClipItem
  index: number
  colIdx: number
  shotName: string
  isPlaying: boolean
  onPlay: () => void
  onPreview: () => void
  onDelete: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: colIdx * 0.08 + index * 0.04 }}
      className="group relative rounded-xl overflow-hidden border border-border/30 bg-card/50 hover:border-accent/30 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="relative aspect-video bg-black/20">
        <video
          ref={videoRef}
          src={clip.clipUrl}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
        />
        {/* Play/Pause overlay */}
        <button
          onClick={onPlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
            {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
          </div>
        </button>
        {/* Clip number badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-[10px] text-white font-medium">
          #{index + 1}
        </div>
      </div>

      {/* Footer */}
      <div className="p-2.5 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-foreground truncate">{shotName} - Clip {index + 1}</p>
          {clip.metadata?.duration && (
            <p className="text-[10px] text-muted-foreground">{clip.metadata.duration}s · {clip.metadata.format || 'mp4'}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onPreview}
            className="p-1 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Play size={12} />
          </button>
          <a
            href={clip.clipUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download size={12} />
          </a>
          <button
            onClick={onDelete}
            className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
