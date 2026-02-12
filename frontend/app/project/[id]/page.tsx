'use client'

import React, { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Layers, Plus, Sparkles, Clapperboard, UserCircle, MapPin, Box, ChevronDown, BookOpen, Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient, AssetOut } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudioSectionLoader } from "@/components/studio-loading"
import { motion, AnimatePresence } from 'framer-motion'

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
  const [characters, setCharacters] = useState<AssetOut[]>([])
  const [locations, setLocations] = useState<AssetOut[]>([])
  const [props, setProps] = useState<AssetOut[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedEp, setExpandedEp] = useState<string | null>(null)

  // Create episode dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newEpisodeNumber, setNewEpisodeNumber] = useState(1)
  const [newBibleText, setNewBibleText] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [bibleMode, setBibleMode] = useState<'text' | 'file'>('text')
  const [selectedBibleFile, setSelectedBibleFile] = useState<File | null>(null)
  const bibleFileInputRef = useRef<HTMLInputElement>(null)

  const handleCreateEpisode = async () => {
    try {
      setIsCreating(true)
      let bibleText = newBibleText.trim()
      if (bibleMode === 'file' && selectedBibleFile) {
        bibleText = await selectedBibleFile.text()
      }
      const newEpisode = await apiClient.createEpisode(projectId, {
        episodeNumber: newEpisodeNumber,
        bibleText: bibleText || undefined
      })
      setEpisodes(prev => [...prev, {
        id: newEpisode.id,
        number: newEpisode.episodeNumber,
        bibleText: newEpisode.bibleText ?? null,
        parts: [],
      }])
      setIsCreateDialogOpen(false)
      setNewBibleText("")
      setNewEpisodeNumber(prev => prev + 1)
      setBibleMode('text')
      setSelectedBibleFile(null)
    } catch (error) { console.error("Failed to create episode", error) }
    finally { setIsCreating(false) }
  }

  useEffect(() => {
    let alive = true
    const fetchProject = async () => {
      try {
        setLoading(true)
        const [data, chars, locs, prps] = await Promise.all([
          apiClient.getProjectFull(projectId),
          apiClient.getCharacters(projectId).catch(() => []),
          apiClient.getLocations(projectId).catch(() => []),
          apiClient.getProps(projectId).catch(() => []),
        ])
        if (!alive) return
        setProject({ id: data.id, name: data.name, description: data.description })
        setCharacters(chars)
        setLocations(locs)
        setProps(prps)
        setEpisodes(data.episodes.map((ep: any) => ({
          id: ep.id,
          number: ep.episodeNumber,
          bibleText: ep.bibleText,
          parts: (ep.parts || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            partNumber: p.partNumber,
          })),
        })))
        if (data.episodes.length > 0) {
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
  const totalAssets = characters.length + locations.length + props.length

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
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Box size={14} className="text-pink-500" />
                  <span className="font-semibold text-foreground">{totalAssets}</span>
                  <span className="text-muted-foreground">Assets</span>
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
                    <Label htmlFor="ep-number" className="text-xs font-semibold">Episode Number</Label>
                    <Input id="ep-number" type="number" value={newEpisodeNumber} onChange={(e) => setNewEpisodeNumber(parseInt(e.target.value))} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-accent" />Show Bible (Optional)
                    </Label>
                    <Tabs value={bibleMode} onValueChange={(v) => setBibleMode(v as 'text' | 'file')}>
                      <TabsList className="grid w-full grid-cols-2 rounded-xl">
                        <TabsTrigger value="text" className="rounded-lg"><FileText className="w-3.5 h-3.5 mr-2" />Write</TabsTrigger>
                        <TabsTrigger value="file" className="rounded-lg"><Upload className="w-3.5 h-3.5 mr-2" />Upload File</TabsTrigger>
                      </TabsList>
                      <TabsContent value="text">
                        <Textarea
                          value={newBibleText}
                          onChange={(e) => setNewBibleText(e.target.value)}
                          className="rounded-xl min-h-[120px] text-sm"
                          placeholder="Enter the show bible text..."
                        />
                      </TabsContent>
                      <TabsContent value="file">
                        <div className="border-2 border-dashed rounded-xl p-6 text-center">
                          <input ref={bibleFileInputRef} type="file" accept=".txt" onChange={(e) => setSelectedBibleFile(e.target.files?.[0] || null)} className="hidden" />
                          <Button type="button" variant="outline" onClick={() => bibleFileInputRef.current?.click()} className="rounded-xl"><Upload className="w-4 h-4 mr-2" />Choose .txt file</Button>
                          {selectedBibleFile && <p className="text-sm text-muted-foreground mt-2">Selected: {selectedBibleFile.name}</p>}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button onClick={handleCreateEpisode} disabled={isCreating} className="rounded-xl bg-accent hover:bg-accent/90 shadow-md">
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
                const isExpanded = expandedEp === ep.id
                return (
                  <motion.div
                    key={ep.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                  >
                    <div className="border border-border/40 rounded-xl bg-card overflow-hidden hover:border-accent/20 transition-all">
                      {/* Episode row */}
                      <button
                        onClick={() => setExpandedEp(isExpanded ? null : ep.id)}
                        className="w-full flex items-center gap-4 p-4 text-left group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/10 flex items-center justify-center flex-shrink-0">
                          <Clapperboard className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                            Episode {ep.number}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>{ep.parts.length} part{ep.parts.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <Link
                          href={`/project/${projectId}/episode/${ep.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-muted-foreground hover:text-accent transition-colors px-2"
                        >
                          Open
                        </Link>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={16} className="text-muted-foreground" />
                        </motion.div>
                      </button>

                      {/* Expanded parts */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border/30 bg-muted/30">
                              {ep.parts.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                  No parts yet — open the episode to add parts
                                </div>
                              ) : (
                                <div className="divide-y divide-border/20">
                                  {ep.parts
                                    .sort((a, b) => a.partNumber - b.partNumber)
                                    .map((part, pi) => (
                                      <motion.div
                                        key={part.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: pi * 0.03 }}
                                      >
                                        <Link href={`/project/${projectId}/episode/${ep.id}/part/${part.id}`}>
                                          <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/5 transition-colors group cursor-pointer">
                                            <div className="w-7 h-7 rounded-lg bg-accent/8 flex items-center justify-center flex-shrink-0">
                                              <Layers size={13} className="text-accent/60" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
                                                {part.title || `Part ${part.partNumber}`}
                                              </p>
                                            </div>
                                            <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-accent transition-colors" />
                                          </div>
                                        </Link>
                                      </motion.div>
                                    ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.section>

        {/* ═══ Assets ═══ */}
        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Assets</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{characters.length} characters</span>
              <span>·</span>
              <span>{locations.length} locations</span>
              <span>·</span>
              <span>{props.length} props</span>
            </div>
          </div>

          {totalAssets === 0 ? (
            <Card className="p-10 text-center border-dashed rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-3">
                <Box className="w-6 h-6 text-pink-400/50" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No assets yet</p>
              <p className="text-xs text-muted-foreground">Characters, locations, and props will appear here</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Characters */}
              {characters.map((char, i) => (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.03 }}
                >
                  <Link href={`/project/${projectId}/characters`}>
                    <div className="border border-border/40 rounded-xl bg-card p-4 hover:border-pink-500/30 hover:shadow-md hover:shadow-pink-500/5 transition-all group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                          <UserCircle size={16} className="text-pink-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground group-hover:text-pink-400 transition-colors truncate">{char.name}</p>
                          <p className="text-[11px] text-muted-foreground">Character</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {/* Locations */}
              {locations.map((loc, i) => (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (characters.length + i) * 0.03 }}
                >
                  <Link href={`/project/${projectId}/locations`}>
                    <div className="border border-border/40 rounded-xl bg-card p-4 hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5 transition-all group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <MapPin size={16} className="text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors truncate">{loc.name}</p>
                          <p className="text-[11px] text-muted-foreground">Location</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {/* Props */}
              {props.map((prop, i) => (
                <motion.div
                  key={prop.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (characters.length + locations.length + i) * 0.03 }}
                >
                  <Link href={`/project/${projectId}/props`}>
                    <div className="border border-border/40 rounded-xl bg-card p-4 hover:border-orange-500/30 hover:shadow-md hover:shadow-orange-500/5 transition-all group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <Box size={16} className="text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground group-hover:text-orange-400 transition-colors truncate">{prop.name}</p>
                          <p className="text-[11px] text-muted-foreground">Prop</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  )
}
