'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { refreshProjectData } from '@/lib/refresh-events'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronRight, Plus, FileText, Upload, Clapperboard, Layers, ChevronDown, BookOpen, Users, MapPin, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { StudioSectionLoader } from '@/components/studio-loading'
import { motion } from 'framer-motion'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog'

interface PartItem {
  id: string
  title: string
  partNumber: number
}

interface TemplateOption {
  id: string
  version: number
  steps: Array<{ key: string; order: number }>
}

export default function EpisodePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const episodeId = params.episodeId as string

  const [episodeData, setEpisodeData] = useState<{ id: string; episodeNumber: number; title: string; bibleText: string | null } | null>(null)
  const [parts, setParts] = useState<PartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newPartTitle, setNewPartTitle] = useState('')
  const [newPartNumber, setNewPartNumber] = useState(1)
  const [scriptText, setScriptText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [scriptMode, setScriptMode] = useState<'text' | 'file'>('text')
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showBibleOpen, setShowBibleOpen] = useState(false)
  const [showBible, setShowBible] = useState<Record<string, any> | null>(null)
  const [showBibleLoading, setShowBibleLoading] = useState(false)
  const [showBibleError, setShowBibleError] = useState<string | null>(null)

  // Workflow templates
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templatesLoading, setTemplatesLoading] = useState(false)

  useEffect(() => {
    let alive = true
    const fetchData = async () => {
      try {
        setLoading(true)
        const fullProject = await apiClient.getProjectFull(projectId)
        if (!alive) return
        const ep = (fullProject.episodes || []).find((e: any) => e.id === episodeId)
        if (!ep) { console.error('Episode not found in project'); setLoading(false); return }
        setEpisodeData({ id: ep.id, episodeNumber: ep.episodeNumber, title: ep.title || '', bibleText: ep.bibleText })
        setParts((ep.parts || []).map((p: any) => ({
          id: p.id, title: p.title, partNumber: p.partNumber,
        })))
        if (ep.parts && ep.parts.length > 0) {
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

  // Load workflow templates
  useEffect(() => {
    let alive = true
    const fetchTemplates = async () => {
      setTemplatesLoading(true)
      try {
        const list = await apiClient.getTemplates()
        if (!alive) return
        setTemplates(list.map((t: any) => ({ id: t.id, version: t.version, steps: t.steps })))
        // Auto-select first template if available
        if (list.length > 0) setSelectedTemplateId(list[0].id)
      } catch { /* ignore — dropdown will be empty */ }
      finally { if (alive) setTemplatesLoading(false) }
    }
    fetchTemplates()
    return () => { alive = false }
  }, [])

  const handleCreatePart = async () => {
    if (!newPartTitle.trim()) { toast.error('Part title is required'); return }
    if (!selectedTemplateId) { toast.error('Please select a workflow template'); return }
    setIsProcessing(true)
    try {
      let finalScript = scriptText.trim()
      if (scriptMode === 'file' && selectedFile) {
        finalScript = await selectedFile.text()
      }
      const createdPart = await apiClient.createPart(projectId, episodeId, {
        title: newPartTitle.trim(),
        partNumber: newPartNumber,
        scriptText: finalScript || undefined,
        templateVersionId: selectedTemplateId,
      })
      toast.success('Part created — ready to generate steps!')
      setDialogOpen(false); setNewPartTitle(''); setNewPartNumber(prev => prev + 1); setScriptText(''); setSelectedFile(null)
      refreshProjectData()
      router.push(`/project/${projectId}/episode/${episodeId}/part/${createdPart.id}`)
    } catch (error) { console.error('Failed to create part', error); toast.error('Failed to create part') }
    finally { setIsProcessing(false) }
  }

  const loadShowBible = async () => {
    if (showBible || showBibleLoading) return
    setShowBibleLoading(true)
    try {
      const res = await apiClient.getEpisodeShowBible(episodeId)
      setShowBible(res.showBible || null)
      setShowBibleError(null)
    } catch (err: any) {
      setShowBibleError(err?.message || 'Failed to load show bible')
    } finally {
      setShowBibleLoading(false)
    }
  }

  if (loading) return <StudioSectionLoader message="Loading episode..." />
  if (!episodeData) return <div className="p-6 text-center">Episode not found</div>

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
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
                  <h1 className="text-2xl font-bold text-foreground">{episodeData.title || `Episode ${episodeData.episodeNumber}`}</h1>
                </div>
              </div>
              <Badge variant="outline" className="text-xs border-accent/30 text-accent bg-accent/5">
                <Layers className="w-3.5 h-3.5 mr-1" />{parts.length} Part{parts.length !== 1 ? 's' : ''}
              </Badge>
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
                  <DialogDescription>Enter details for the new part. Provide a script and select a workflow template to start the pipeline.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="partTitle" className="text-xs font-semibold">Title</Label>
                    <Input id="partTitle" value={newPartTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPartTitle(e.target.value)} placeholder="Part title" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partNumber" className="text-xs font-semibold">Part Number</Label>
                    <Input id="partNumber" type="number" min={1} value={newPartNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPartNumber(Number(e.target.value))} className="rounded-xl" />
                  </div>

                  {/* Workflow Template Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="template" className="text-xs font-semibold flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-accent" /> Workflow Template
                    </Label>
                    <p className="text-xs text-muted-foreground">Choose a pipeline template that defines the generation steps</p>
                    {templatesLoading ? (
                      <div className="h-10 rounded-xl bg-muted/30 animate-pulse" />
                    ) : templates.length === 0 ? (
                      <p className="text-xs text-amber-500 py-2">No templates available. Contact your admin to create one.</p>
                    ) : (
                      <select
                        id="template"
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                      >
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>
                            Pipeline v{t.version} — {t.steps.length} steps
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedTemplateId && (() => {
                      const sel = templates.find(t => t.id === selectedTemplateId)
                      if (!sel) return null
                      return (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {sel.steps.sort((a, b) => a.order - b.order).map((s, i) => (
                            <span key={s.key} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                              <span className="text-[9px] opacity-60">{i + 1}.</span>
                              {s.key.replace(/^(run_|generate_)/, '').replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Script Input */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Script Input</Label>
                    <p className="text-xs text-muted-foreground">Provide the script text for this part. The pipeline will use it to generate content step by step.</p>
                    <Tabs value={scriptMode} onValueChange={(v: string) => setScriptMode(v as 'text' | 'file')}>
                      <TabsList className="grid w-full grid-cols-2 rounded-xl">
                        <TabsTrigger value="text" className="rounded-lg"><FileText className="w-3.5 h-3.5 mr-2" />Write Script</TabsTrigger>
                        <TabsTrigger value="file" className="rounded-lg"><Upload className="w-3.5 h-3.5 mr-2" />Upload File</TabsTrigger>
                      </TabsList>
                      <TabsContent value="text"><Textarea placeholder="Paste or write your script here..." value={scriptText} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScriptText(e.target.value)} rows={6} className="font-mono text-sm rounded-xl" /></TabsContent>
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
                    <Button onClick={handleCreatePart} disabled={isProcessing || !selectedTemplateId} className="rounded-xl bg-accent hover:bg-accent/90 shadow-md">{isProcessing ? 'Creating...' : 'Create Part'}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Asset Quick Links */}
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div>
          <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wide mb-2">Assets</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Dialog open={showBibleOpen} onOpenChange={(open) => {
            setShowBibleOpen(open)
            if (open) loadShowBible()
          }}>
            <DialogTrigger asChild>
              <Card className="h-full p-5 rounded-2xl border border-border/40 hover:border-accent/40 hover:bg-accent/[0.06] transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Show Bible</p>
                    <p className="text-xs text-muted-foreground">Episode-level show bible</p>
                  </div>
                </div>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Episode Show Bible</DialogTitle>
                <DialogDescription>Episode-level show bible</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {showBibleLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 size={24} className="animate-spin text-accent/70" />
                    <p className="text-sm text-muted-foreground mt-3">Loading show bible…</p>
                  </div>
                ) : showBibleError ? (
                  <p className="text-sm text-red-500">{showBibleError}</p>
                ) : showBible ? (
                  <div className="space-y-3">
                    {Object.entries(showBible).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">{key.replace(/_/g, ' ')}</p>
                        <pre className="whitespace-pre-wrap text-sm text-foreground/80 bg-muted/20 rounded-lg p-3">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No show bible found for this episode.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Link href={`/project/${projectId}/episode/${episodeId}/characters`}>
            <Card className="h-full p-5 rounded-2xl border border-border/40 hover:border-accent/40 hover:bg-accent/[0.06] transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Characters</p>
                  <p className="text-xs text-muted-foreground">Episode-level character assets</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href={`/project/${projectId}/episode/${episodeId}/locations`}>
            <Card className="h-full p-5 rounded-2xl border border-border/40 hover:border-accent/40 hover:bg-accent/[0.06] transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Locations</p>
                  <p className="text-xs text-muted-foreground">Episode-level location assets</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Parts Grid */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wide mb-4">Parts</h2>
        {parts.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-12 text-center border-dashed rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7 text-accent/50" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No parts yet</p>
              <p className="text-xs text-muted-foreground">Add parts with a script to start the production pipeline</p>
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
