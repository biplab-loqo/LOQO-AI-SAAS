'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Check, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { motion, AnimatePresence } from 'framer-motion'

interface BeatItem {
  Beat_Number: number
  Title: string
  Scene_Ref: string
  Screenplay_lines: string[]
  Time_Range: string
  Description: string
  Emotion: string
}

interface BeatVersion {
  id: string
  partId: string
  content: string
  metadata: { versionNo: number; edited: boolean; current: boolean }
  parsedBeats: BeatItem[]
}

export default function BeatsPage() {
  const params = useParams()
  const projectId = params.id as string
  const episodeId = params.episodeId as string
  const sceneId = params.sceneId as string

  const [versions, setVersions] = useState<BeatVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBeat, setExpandedBeat] = useState<number | null>(null)
  const [oldVersionsOpen, setOldVersionsOpen] = useState(false)
  const [settingCurrent, setSettingCurrent] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null)

  const parseContent = (content: string): BeatItem[] => {
    try {
      const parsed = JSON.parse(content)
      return parsed.beats || []
    } catch {
      return []
    }
  }

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true)
      const raw = await apiClient.getBeats(sceneId)
      const mapped: BeatVersion[] = raw.map((b: any) => ({
        id: b.id,
        partId: b.partId,
        content: b.content,
        metadata: b.metadata,
        parsedBeats: parseContent(b.content),
      }))
      mapped.sort((a, b) => {
        if (a.metadata.current && !b.metadata.current) return -1
        if (!a.metadata.current && b.metadata.current) return 1
        return b.metadata.versionNo - a.metadata.versionNo
      })
      setVersions(mapped)
    } catch (error) {
      console.error('Failed to load beats', error)
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
    el.scrollBy({ left: direction === 'left' ? -360 : 360, behavior: 'smooth' })
  }

  const handleSetCurrent = async (versionId: string) => {
    try {
      setSettingCurrent(versionId)
      await apiClient.setBeatCurrent(versionId)
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
    if (x < 60 && showLeftShadow) {
      setHoverZone('left')
    } else if (x > width - 60 && showRightShadow) {
      setHoverZone('right')
    } else {
      setHoverZone(null)
    }
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
            <h1 className="text-2xl font-bold text-foreground">Beat Breakdown</h1>
            <p className="text-sm text-muted-foreground mt-1">Detailed beat-by-beat analysis parsed from generated content</p>
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
              <p>No beat data available yet.</p>
            </div>
          ) : (
            <>
              {/* ===== CURRENT VERSION BOX ===== */}
              <div className="rounded-2xl border border-accent/20 bg-card overflow-hidden shadow-sm">
                {/* Version Header */}
                <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-accent/5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold">
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
                    {currentVersion.parsedBeats.length} beats
                  </span>
                </div>

                {/* Scrollable Beat Cards with Nav Buttons Inside */}
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
                          className="w-8 h-8 rounded-full bg-accent/15 hover:bg-accent/25 text-accent flex items-center justify-center transition-all shadow-md"
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
                          className="w-8 h-8 rounded-full bg-accent/15 hover:bg-accent/25 text-accent flex items-center justify-center transition-all shadow-md"
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
                        key={beat.Beat_Number}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={cn(
                          'flex-shrink-0 w-[340px] rounded-xl border bg-background overflow-hidden transition-all cursor-pointer',
                          expandedBeat === beat.Beat_Number
                            ? 'border-accent/30 shadow-lg shadow-accent/5'
                            : 'border-border/50 hover:border-accent/20 hover:shadow-md'
                        )}
                        onClick={() => setExpandedBeat(expandedBeat === beat.Beat_Number ? null : beat.Beat_Number)}
                      >
                        {/* Beat card header */}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent/15 text-accent font-bold text-xs">
                              {beat.Beat_Number}
                            </span>
                            <h3 className="text-sm font-semibold text-foreground truncate flex-1">{beat.Title}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{beat.Description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">
                              {beat.Emotion}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                              {beat.Time_Range}s
                            </span>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        <AnimatePresence>
                          {expandedBeat === beat.Beat_Number && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border/50 p-4 space-y-3 bg-secondary/20">
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Scene Reference</p>
                                  <p className="text-xs text-foreground font-mono bg-background px-2 py-1.5 rounded border border-border/50">
                                    {beat.Scene_Ref}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Screenplay Lines</p>
                                  <div className="space-y-1">
                                    {beat.Screenplay_lines.map((line, i) => (
                                      <p key={i} className="text-xs text-muted-foreground italic bg-background px-2 py-1.5 rounded border border-border/50">
                                        {line}
                                      </p>
                                    ))}
                                  </div>
                                </div>
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
                                  {v.parsedBeats.length} beats
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50"
                                disabled={settingCurrent === v.id}
                                onClick={() => handleSetCurrent(v.id)}
                              >
                                {settingCurrent === v.id ? (
                                  <div className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
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
