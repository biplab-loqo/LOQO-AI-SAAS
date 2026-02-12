'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Check, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { motion, AnimatePresence } from 'framer-motion'

interface ShotItem {
  shot: string
  intent_title: string
  intent: string
  emotion: string
  narrative_function: string
  estimated_duration: string
}

interface BeatWithShots {
  beat_number: number
  title: string
  scene_ref: string
  screenplay_lines: string[]
  time_range: string
  description: string
  emotion: string
  shots: ShotItem[]
}

interface ShotVersion {
  id: string
  partId: string
  content: string
  metadata: { versionNo: number; edited: boolean; current: boolean }
  parsedBeats: BeatWithShots[]
  totalShots: number
}

export default function ShotListPage() {
  const params = useParams()
  const projectId = params.id as string
  const episodeId = params.episodeId as string
  const sceneId = params.sceneId as string

  const [versions, setVersions] = useState<ShotVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBeat, setExpandedBeat] = useState<number | null>(null)
  const [oldVersionsOpen, setOldVersionsOpen] = useState(false)
  const [settingCurrent, setSettingCurrent] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null)

  const parseContent = (content: string): { beats: BeatWithShots[]; totalShots: number } => {
    try {
      const parsed = JSON.parse(content)
      const beats: BeatWithShots[] = parsed.beats || []
      const totalShots = beats.reduce((sum, b) => sum + (b.shots?.length || 0), 0)
      return { beats, totalShots }
    } catch {
      return { beats: [], totalShots: 0 }
    }
  }

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true)
      const raw = await apiClient.getShots(sceneId)
      const mapped: ShotVersion[] = raw.map((s: any) => {
        const { beats, totalShots } = parseContent(s.content)
        return {
          id: s.id,
          partId: s.partId,
          content: s.content,
          metadata: s.metadata,
          parsedBeats: beats,
          totalShots,
        }
      })
      mapped.sort((a, b) => {
        if (a.metadata.current && !b.metadata.current) return -1
        if (!a.metadata.current && b.metadata.current) return 1
        return b.metadata.versionNo - a.metadata.versionNo
      })
      setVersions(mapped)
    } catch (error) {
      console.error('Failed to load shots', error)
    } finally {
      setLoading(false)
    }
  }, [sceneId])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  const currentVersion = versions.find(v => v.metadata.current)
  const otherVersions = versions.filter(v => !v.metadata.current)

  const checkScrollShadows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowLeftShadow(el.scrollLeft > 10)
    setShowRightShadow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScrollShadows()
    el.addEventListener('scroll', checkScrollShadows)
    return () => el.removeEventListener('scroll', checkScrollShadows)
  }, [currentVersion, checkScrollShadows])

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction === 'left' ? -380 : 380, behavior: 'smooth' })
  }

  const handleSetCurrent = async (versionId: string) => {
    try {
      setSettingCurrent(versionId)
      await apiClient.setShotCurrent(versionId)
      await fetchVersions()
      setOldVersionsOpen(false)
    } catch (error) {
      console.error('Failed to set current', error)
    } finally {
      setSettingCurrent(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    if (x < 60 && showLeftShadow) setHoverZone('left')
    else if (x > width - 60 && showRightShadow) setHoverZone('right')
    else setHoverZone(null)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <Link href={`/project/${projectId}/episode/${episodeId}/scene/${sceneId}`}>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-accent transition-colors">
                <ArrowLeft size={16} />
                Back to Part
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Shot List</h1>
            <p className="text-sm text-muted-foreground mt-1">Detailed shot intents and cinematography mapped per beat</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-xl bg-secondary/30 animate-pulse" />
              ))}
            </div>
          ) : !currentVersion ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>No shot data available yet.</p>
            </div>
          ) : (
            <>
              {/* ===== CURRENT VERSION BOX ===== */}
              <div className="rounded-2xl border border-cyan-500/20 bg-card overflow-hidden shadow-sm">
                {/* Version Header */}
                <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-cyan-500/5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 text-xs font-semibold">
                      <Check size={12} />
                      Current
                    </div>
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                      <Tag size={10} />
                      v{currentVersion.metadata.versionNo}
                    </span>
                    {currentVersion.metadata.edited && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">Edited</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {currentVersion.parsedBeats.length} beats · {currentVersion.totalShots} shots
                  </span>
                </div>

                {/* Scrollable Beat-Shot Cards */}
                <div
                  className="relative"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoverZone(null)}
                >
                  {/* Left shadow + button */}
                  <AnimatePresence>
                    {hoverZone === 'left' && showLeftShadow && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-card via-card/80 to-transparent flex items-center justify-start pl-2"
                      >
                        <button
                          onClick={() => scrollByAmount('left')}
                          className="w-8 h-8 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 flex items-center justify-center transition-all shadow-md"
                        >
                          <ChevronLeft size={16} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Right shadow + button */}
                  <AnimatePresence>
                    {hoverZone === 'right' && showRightShadow && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-card via-card/80 to-transparent flex items-center justify-end pr-2"
                      >
                        <button
                          onClick={() => scrollByAmount('right')}
                          className="w-8 h-8 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 flex items-center justify-center transition-all shadow-md"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Scrollable Content */}
                  <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto p-6 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {currentVersion.parsedBeats.map((beat, idx) => (
                      <motion.div
                        key={beat.beat_number}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={cn(
                          'flex-shrink-0 w-[360px] rounded-xl border bg-background overflow-hidden transition-all cursor-pointer',
                          expandedBeat === beat.beat_number
                            ? 'border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                            : 'border-border/50 hover:border-cyan-500/20 hover:shadow-md'
                        )}
                        onClick={() => setExpandedBeat(expandedBeat === beat.beat_number ? null : beat.beat_number)}
                      >
                        {/* Beat header */}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/15 text-cyan-400 font-bold text-xs">
                              {beat.beat_number}
                            </span>
                            <h3 className="text-sm font-semibold text-foreground truncate flex-1">{beat.title}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                              {beat.shots?.length || 0} shots
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{beat.description}</p>

                          {/* Shot pills */}
                          <div className="flex flex-wrap gap-1.5">
                            {beat.shots?.map((shot) => (
                              <span
                                key={shot.shot}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-medium"
                              >
                                {shot.shot} · {shot.estimated_duration}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Expanded: shot details */}
                        <AnimatePresence>
                          {expandedBeat === beat.beat_number && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border/50 p-4 space-y-3 bg-secondary/20">
                                {beat.shots?.map((shot) => (
                                  <div key={shot.shot} className="rounded-lg border border-border/50 bg-background p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-cyan-400 uppercase">Shot {shot.shot}</span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">
                                        {shot.estimated_duration}
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-semibold text-foreground">{shot.intent_title}</h4>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">{shot.intent}</p>
                                    <div className="flex gap-3 pt-1">
                                      <div>
                                        <p className="text-[9px] font-semibold text-muted-foreground uppercase">Emotion</p>
                                        <p className="text-[11px] text-foreground">{shot.emotion}</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-semibold text-muted-foreground uppercase">Function</p>
                                        <p className="text-[11px] text-foreground truncate max-w-[180px]">{shot.narrative_function}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ===== OLD VERSIONS COLLAPSIBLE ===== */}
              {otherVersions.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                  <button
                    onClick={() => setOldVersionsOpen(!oldVersionsOpen)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Other Versions</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {otherVersions.length}
                      </span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={cn('text-muted-foreground transition-transform', oldVersionsOpen && 'rotate-180')}
                    />
                  </button>

                  <AnimatePresence>
                    {oldVersionsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/50 divide-y divide-border/30">
                          {otherVersions.map(v => (
                            <div key={v.id} className="px-6 py-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                                  <Tag size={10} />
                                  v{v.metadata.versionNo}
                                </span>
                                {v.metadata.edited && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">Edited</span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {v.parsedBeats.length} beats · {v.totalShots} shots
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50"
                                disabled={settingCurrent === v.id}
                                onClick={() => handleSetCurrent(v.id)}
                              >
                                {settingCurrent === v.id ? (
                                  <div className="w-3 h-3 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                                ) : (
                                  <Check size={12} />
                                )}
                                Set as Current
                              </Button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
