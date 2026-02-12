'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronRight, BookOpen, Plus, FileText, Upload, Clapperboard, Layers, Image as ImageIcon, Video, ChevronDown } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { StudioSectionLoader } from '@/components/studio-loading'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'

interface PartItem {
  id: string
  title: string
  partNumber: number
  storyboardCount: number
  imageCount: number
  clipCount: number
}

export default function EpisodePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const episodeId = params.episodeId as string

  const [episodeData, setEpisodeData] = useState<{ id: string; episodeNumber: number; bibleText: string | null } | null>(null)
  const [parts, setParts] = useState<PartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newPartTitle, setNewPartTitle] = useState('')
  const [newPartNumber, setNewPartNumber] = useState(1)
  const [scriptText, setScriptText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [scriptMode, setScriptMode] = useState<'text' | 'file'>('text')
  const [isProcessing, setIsProcessing] = useState(false)
  const [bibleExpanded, setBibleExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    const fetchData = async () => {
      try {
        setLoading(true)
        const fullProject = await apiClient.getProjectFull(projectId)
        if (!alive) return
        const ep = fullProject.episodes.find((e: any) => e.id === episodeId)
        if (!ep) { console.error('Episode not found in project'); setLoading(false); return }
        setEpisodeData({ id: ep.id, episodeNumber: ep.episodeNumber, bibleText: ep.bibleText })
        setParts(ep.parts.map((p: any) => ({
          id: p.id, title: p.title, partNumber: p.partNumber,
          storyboardCount: p.storyboardCount ?? 0, imageCount: p.imageCount ?? 0, clipCount: p.clipCount ?? 0,
        })))
        if (ep.parts.length > 0) {
          const maxNum = Math.max(...ep.parts.map((p: any) => p.partNumber))
          setNewPartNumber(maxNum + 1)
        }
      } catch (error) {
        console.error('Failed to load episode', error)
        toast.error('Failed to load episode')
      } finally {
        if (alive) setLoading(false)
      }
    }
    fetchData()
    return () => { alive = false }
  }, [projectId, episodeId])

  const handleCreatePart = async () => {
    if (!newPartTitle.trim()) { toast.error('Part title is required'); return }
    setIsProcessing(true)
    try {
      const createdPart = await apiClient.createPart(projectId, episodeId, {
        title: newPartTitle.trim(), partNumber: newPartNumber, scriptText: scriptText.trim() || undefined,
      })
      toast.success('Part created — generating content...')
      setDialogOpen(false); setNewPartTitle(''); setNewPartNumber(prev => prev + 1); setScriptText(''); setSelectedFile(null)
      router.push(`/project/${projectId}/episode/${episodeId}/part/${createdPart.id}?new=true`)
    } catch (error) { console.error('Failed to create part', error); toast.error('Failed to create part') }
    finally { setIsProcessing(false) }
  }

  if (loading) return <StudioSectionLoader message="Loading episode..." />
  if (!episodeData) return <div className="p-6 text-center">Episode not found</div>

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Animated Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative border-b border-border bg-card">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-accent/60 to-transparent" />
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                  <Clapperboard className="w-5 h-5 text-accent" />
                </motion.div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Episode {episodeData.episodeNumber}</p>
                  <h1 className="text-2xl font-bold text-foreground">Episode {episodeData.episodeNumber}</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs border-accent/30 text-accent bg-accent/5">
                  <Layers className="w-3.5 h-3.5 mr-1" />{parts.length} Part{parts.length !== 1 ? 's' : ''}
                </Badge>

              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-md" size="sm">
                  <Plus size={16} className="mr-2" />Add Part
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Create Part</DialogTitle>
                  <DialogDescription>Enter details for the new part. Optionally provide a script to auto-generate beats and storyboard.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="partTitle" className="text-xs font-semibold">Title</Label>
                    <Input id="partTitle" value={newPartTitle} onChange={(e) => setNewPartTitle(e.target.value)} placeholder="Part title" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partNumber" className="text-xs font-semibold">Part Number</Label>
                    <Input id="partNumber" type="number" min={1} value={newPartNumber} onChange={(e) => setNewPartNumber(Number(e.target.value))} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Script Input (Optional)</Label>
                    <p className="text-xs text-muted-foreground">Provide a script to automatically generate beats and storyboard panels</p>
                    <Tabs value={scriptMode} onValueChange={(v) => setScriptMode(v as 'text' | 'file')}>
                      <TabsList className="grid w-full grid-cols-2 rounded-xl"><TabsTrigger value="text" className="rounded-lg"><FileText className="w-3.5 h-3.5 mr-2" />Write Script</TabsTrigger><TabsTrigger value="file" className="rounded-lg"><Upload className="w-3.5 h-3.5 mr-2" />Upload File</TabsTrigger></TabsList>
                      <TabsContent value="text"><Textarea placeholder="Paste or write your script here..." value={scriptText} onChange={(e) => setScriptText(e.target.value)} rows={6} className="font-mono text-sm rounded-xl" /></TabsContent>
                      <TabsContent value="file">
                        <div className="border-2 border-dashed rounded-xl p-6 text-center">
                          <input ref={fileInputRef} type="file" accept=".txt" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
                          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl"><Upload className="w-4 h-4 mr-2" />Choose .txt file</Button>
                          {selectedFile && <p className="text-sm text-muted-foreground mt-2">Selected: {selectedFile.name}</p>}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isProcessing} className="rounded-xl">Cancel</Button>
                    <Button onClick={handleCreatePart} disabled={isProcessing} className="rounded-xl bg-accent hover:bg-accent/90 shadow-md">{isProcessing ? 'Creating...' : 'Create Part'}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Bible Text Section */}
      {episodeData.bibleText && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="max-w-5xl mx-auto px-6 mt-5">
          <div className="rounded-xl border border-accent/20 bg-gradient-to-r from-accent/5 via-accent/[0.02] to-transparent overflow-hidden">
            <button onClick={() => setBibleExpanded(!bibleExpanded)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent/5 transition-colors">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold text-accent">Show Bible</span>
                <span className="text-xs text-muted-foreground ml-2">{episodeData.bibleText.length} characters</span>
              </div>
              <motion.div animate={{ rotate: bibleExpanded ? 180 : 0 }}><ChevronDown className="w-4 h-4 text-muted-foreground" /></motion.div>
            </button>
            <AnimatePresence>
              {bibleExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                  <div className="px-5 pb-4 border-t border-accent/10">
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed pt-3">{episodeData.bibleText}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Parts Grid */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {parts.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-12 text-center border-dashed rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7 text-accent/50" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No parts yet</p>
              <p className="text-xs text-muted-foreground">Add parts to this episode to get started</p>
            </Card>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parts.map((part, i) => (
              <motion.div key={part.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <Link href={`/project/${projectId}/episode/${episodeId}/part/${part.id}`}>
                  <Card className="h-full p-5 rounded-2xl hover:border-accent/40 hover:bg-accent/[0.03] transition-all cursor-pointer group border-border/40 hover:shadow-lg hover:shadow-accent/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Layers className="w-3.5 h-3.5 text-accent" />
                          </div>
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Part {part.partNumber}</p>
                        </div>
                        <h3 className="text-base font-bold text-foreground mb-3 group-hover:text-accent transition-colors">{part.title}</h3>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400/80 border border-pink-500/15 font-medium"><ImageIcon className="w-3 h-3 inline mr-1" />{part.imageCount} img</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/15 font-medium"><Video className="w-3 h-3 inline mr-1" />{part.clipCount} clips</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0 ml-3 mt-1" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
