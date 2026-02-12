"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient, StudioData } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Sparkles, Camera, Layers, Image as ImageIcon, Video,
  ChevronRight, ChevronLeft, ChevronDown, RefreshCw, Clapperboard,
  Play, X, Wand2, ZoomIn, Download, Trash2, GripVertical,
  User2, MapPin, Puzzle, Box, Eye
} from 'lucide-react'
import { RightPanel } from '@/components/right-panel'


// ─── Emotion badge color map ─────────────────────────────────
const emotionColors: Record<string, string> = {
  tension: 'bg-red-500/15 text-red-400 border-red-500/30',
  curiosity: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  wonder: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  dread: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  fear: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  awe: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  hope: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  joy: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  sadness: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  anger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  love: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  isolation: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  terror: 'bg-red-600/15 text-red-500 border-red-600/30',
  sublime: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  debate: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  neutral: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  anticipation: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  control: 'bg-blue-600/15 text-blue-500 border-blue-600/30',
  scrutiny: 'bg-amber-600/15 text-amber-500 border-amber-600/30',
  reassurance: 'bg-green-500/15 text-green-400 border-green-500/30',
  tenderness: 'bg-pink-400/15 text-pink-300 border-pink-400/30',
  humiliation: 'bg-red-400/15 text-red-300 border-red-400/30',
  power: 'bg-violet-600/15 text-violet-500 border-violet-600/30',
  prickly: 'bg-orange-400/15 text-orange-300 border-orange-400/30',
  deflation: 'bg-slate-400/15 text-slate-300 border-slate-400/30',
  resentment: 'bg-rose-400/15 text-rose-300 border-rose-400/30',
  comic: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30',
  irritation: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  mischief: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  hurt: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
  discomfort: 'bg-gray-400/15 text-gray-300 border-gray-400/30',
  judgment: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  suspense: 'bg-indigo-400/15 text-indigo-300 border-indigo-400/30',
  contempt: 'bg-red-500/15 text-red-400 border-red-500/30',
  vulnerability: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  authority: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  insecurity: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  relief: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  innocence: 'bg-teal-400/15 text-teal-300 border-teal-400/30',
  finality: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

// ─── Horizontal scroll container ─────────────────────────────
function HScrollContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(checkScroll)
    observer.observe(el)
    return () => observer.disconnect()
  }, [checkScroll, children])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.6
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <div className="relative group/scroll">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card/90 border border-border/50 shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all opacity-0 group-hover/scroll:opacity-100"
        >
          <ChevronLeft size={16} />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-card/90 border border-border/50 shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all opacity-0 group-hover/scroll:opacity-100"
        >
          <ChevronRight size={16} />
        </button>
      )}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={cn("flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40 [&::-webkit-scrollbar-track]:bg-transparent", className)}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Key-Value display ───────────────────────────────────────
function KV({ label, value, accent }: { label: string; value?: string | null; accent?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className={cn("text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex-shrink-0 min-w-[60px]", accent)}>{label}</span>
      <span className="text-[13px] text-foreground/80 leading-relaxed">{value}</span>
    </div>
  )
}

function EmotionBadge({ emotion }: { emotion?: string }) {
  if (!emotion) return null
  const key = Object.keys(emotionColors).find(k => emotion.toLowerCase().includes(k.toLowerCase()))
  const c = key ? emotionColors[key] : 'bg-muted text-muted-foreground border-border/30'
  return <Badge variant="outline" className={cn("text-[11px] font-semibold", c)}>{emotion}</Badge>
}

// ─── Skeleton Loading ────────────────────────────────────────
function SkeletonCards({ count = 4 }: { count?: number }) {
  const heights = [280, 340, 250, 310, 260, 320, 290]
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex-shrink-0 w-[400px] rounded-2xl border border-border/20 overflow-hidden"
          style={{ height: heights[i % heights.length] }}>
          <div className="p-4 border-b border-border/10 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-muted/40 animate-pulse" />
              <div className="h-4 w-32 rounded-md bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            </div>
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 + (i % 3) }).map((_, j) => (
              <div key={j} className="h-3 rounded bg-muted/20 animate-pulse" style={{ animationDelay: `${(i * 4 + j) * 60}ms`, width: `${50 + Math.random() * 50}%` }} />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────
function EmptyState({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-accent/40" />
      </div>
      <p className="text-base font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    </motion.div>
  )
}

// ─── Section header ──────────────────────────────────────────
function SectionHeader({ color, title, sub, onRegenerate, isRegenerating }: {
  color: string; title: string; sub: string; onRegenerate?: () => void; isRegenerating?: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={cn("h-8 w-1 rounded-full bg-gradient-to-b", color)} />
        <div>
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{sub}</p>
        </div>
      </div>
      {onRegenerate && (
        <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isRegenerating}
          className="h-9 rounded-lg text-sm gap-1.5 border-accent/20 text-accent hover:bg-accent/10 hover:text-accent">
          <RefreshCw className={cn("w-3.5 h-3.5", isRegenerating && "animate-spin")} />
          {isRegenerating ? 'Regenerating...' : 'Regenerate'}
        </Button>
      )}
    </div>
  )
}

// ─── Image categories config ─────────────────────────────────
const IMAGE_CATEGORIES = [
  { key: 'shot', label: 'Shot Images', icon: Camera, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20', gradient: 'from-accent/10 to-accent/5' },
  { key: 'character', label: 'Character Images', icon: User2, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', gradient: 'from-pink-500/10 to-pink-500/5' },
  { key: 'location', label: 'Location Images', icon: MapPin, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', gradient: 'from-emerald-500/10 to-emerald-500/5' },
  { key: 'props', label: 'Props & Other', icon: Puzzle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', gradient: 'from-amber-500/10 to-amber-500/5' },
]


/* ================================================================
   HELPERS: parse content safely
   ================================================================ */
function parseContentArray(raw: string | undefined | null): any[] {
  if (!raw) return []
  try {
    const obj = JSON.parse(raw)
    if (Array.isArray(obj)) return obj
    return [obj]
  } catch {
    return []
  }
}


/* ================================================================
   HELPER: group versioned documents by version number
   Each doc = one version of ALL items for a part
   Returns: { versionNo, selected, items[], docId }[]
   ================================================================ */
function groupVersions(
  docs: Array<{ id: string; content: string; metadata: { versionNo: number; edited: boolean; selected: boolean } }>
): Array<{ versionNo: number; selected: boolean; items: any[]; docId: string }> {
  return docs
    .map(doc => ({
      versionNo: doc.metadata.versionNo,
      selected: doc.metadata.selected,
      items: parseContentArray(doc.content),
      docId: doc.id,
    }))
    .sort((a, b) => {
      // Selected version first, then by versionNo descending
      if (a.selected && !b.selected) return -1
      if (!a.selected && b.selected) return 1
      return b.versionNo - a.versionNo
    })
}


// ─── Generation phases config ────────────────────────────────
const GEN_PHASES = [
  { tab: 'characters' as const, label: 'Loading Characters', icon: User2 },
  { tab: 'locations' as const, label: 'Loading Locations', icon: MapPin },
  { tab: 'props' as const, label: 'Loading Props', icon: Box },
  { tab: 'beats' as const, label: 'Generating Beats', icon: Sparkles },
  { tab: 'shots' as const, label: 'Generating Shots', icon: Camera },
  { tab: 'storyboard' as const, label: 'Generating Storyboard', icon: Layers },
  { tab: 'images' as const, label: 'Generating Images', icon: ImageIcon },
  { tab: 'clips' as const, label: 'Generating Clips', icon: Video },
]

function GeneratingOverlay({ phase }: { phase: typeof GEN_PHASES[number] }) {
  const Icon = phase.icon
  return (
    <motion.div
      key={phase.label}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="relative mb-8">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center"
        >
          <Icon className="w-10 h-10 text-accent" />
        </motion.div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute -inset-3 rounded-full border-2 border-transparent border-t-accent/30"
        />
      </div>
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        className="text-xl font-bold text-accent mb-1"
      >{phase.label}...</motion.p>
      <p className="text-sm text-muted-foreground mb-8">AI is crafting your content</p>
      <div className="w-full overflow-hidden">
        <div className="flex gap-4 justify-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ delay: i * 0.12, duration: 2, repeat: Infinity }}
              className="flex-shrink-0 w-[260px] rounded-xl border border-border/20 bg-card/30 overflow-hidden"
            >
              <div className="h-2 bg-accent/10 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-3/4 rounded bg-muted/30 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                <div className="h-3 w-full rounded bg-muted/20 animate-pulse" style={{ animationDelay: `${i * 150 + 100}ms` }} />
                <div className="h-3 w-2/3 rounded bg-muted/20 animate-pulse" style={{ animationDelay: `${i * 150 + 200}ms` }} />
                <div className="h-8 w-full rounded bg-muted/10 animate-pulse mt-2" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}


/* ================================================================
   MAIN PAGE COMPONENT
   ================================================================ */
export default function PartPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const partIdParam = params.partId as string

  const [loading, setLoading] = useState(true)
  const [studioData, setStudioData] = useState<StudioData | null>(null)
  const [activeTab, setActiveTab] = useState<'characters' | 'locations' | 'props' | 'beats' | 'shots' | 'storyboard' | 'images' | 'clips'>('characters')

  const [regenerating, setRegenerating] = useState<Record<string, boolean>>({})
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({})
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState<any>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ shot: true, character: true, location: true, props: true })

  // ─── Generation animation state ────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false)
  const [genPhase, setGenPhase] = useState(0)

  useEffect(() => {
    if (searchParams.get('new') !== 'true') return
    setIsGenerating(true)
    setGenPhase(0)
    setActiveTab('characters')
    const PHASE_DURATION = 1800
    const timers: NodeJS.Timeout[] = []
    GEN_PHASES.forEach((phase, i) => {
      if (i > 0) {
        timers.push(setTimeout(() => {
          setGenPhase(i)
          setActiveTab(phase.tab)
        }, i * PHASE_DURATION))
      }
    })
    timers.push(setTimeout(() => {
      setIsGenerating(false)
      setGenPhase(0)
      setActiveTab('characters')
      window.history.replaceState({}, '', window.location.pathname)
    }, GEN_PHASES.length * PHASE_DURATION))
    return () => timers.forEach(clearTimeout)
  }, [searchParams])

  // ─── Fetch ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.getPartStudio(partIdParam)
      setStudioData(data)
    } catch (e) { console.error("Failed to load studio data", e) }
    finally { setLoading(false) }
  }, [partIdParam])

  useEffect(() => { loadData() }, [loadData])

  // ─── Derived data ──────────────────────────────────────────
  const ep = studioData?.episode
  const part = studioData?.part

  const beatVersions = useMemo(() => groupVersions(studioData?.beats || []), [studioData?.beats])
  const shotVersions = useMemo(() => groupVersions(studioData?.shots || []), [studioData?.shots])
  const storyboardVersions = useMemo(() => groupVersions(studioData?.storyboards || []), [studioData?.storyboards])

  // Selected version item counts
  const selectedBeats = beatVersions.find(v => v.selected)?.items || []
  const selectedShotBeats = shotVersions.find(v => v.selected)?.items || []
  // Flatten all shots from beat→shots structure for counting
  const selectedShots = selectedShotBeats.flatMap((b: any) => b.shots || [])
  const selectedPanels = storyboardVersions.find(v => v.selected)?.items || []

  // Images grouped by category
  const imagesByCategory = useMemo(() => {
    const groups: Record<string, any[]> = { shot: [], character: [], location: [], props: [] }
    for (const img of (studioData?.images || [])) {
      const cat = img.category || 'shot'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(img)
    }
    return groups
  }, [studioData?.images])

  const groupByShotFolder = (imgs: any[]) => {
    const groups: Record<string, any[]> = {}
    imgs.forEach(img => {
      // Extract folder name from image name (e.g., "Shot_1/1.jpeg" → "Shot_1")
      const name = img.name || ''
      const parts = name.split('/')
      const folder = parts.length > 1 ? parts[0] : 'Unsorted'
      if (!groups[folder]) groups[folder] = []
      groups[folder].push(img)
    })
    // Sort by Shot number (Shot_1, Shot_2, ... Shot_16)
    return Object.entries(groups).sort((a, b) => {
      const numA = parseInt(a[0].replace(/\D/g, '')) || 999
      const numB = parseInt(b[0].replace(/\D/g, '')) || 999
      return numA - numB
    })
  }

  const groupByCharFolder = (imgs: any[]) => {
    const groups: Record<string, any[]> = {}
    imgs.forEach(img => {
      // Extract path from name: "Characters/Gayatri/CU-MCU/1.png" → "Gayatri/CU-MCU"
      const name = img.name || ''
      const parts = name.split('/')
      // Remove "Characters/" prefix and filename
      const folder = parts.length >= 3
        ? parts.slice(1, -1).join('/')  // "Gayatri/CU-MCU" or "Gayatri/Full_Body"
        : parts.length === 2
          ? parts[0]  // "Gayatri"
          : 'Unsorted'
      if (!groups[folder]) groups[folder] = []
      groups[folder].push(img)
    })
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }

  // Clips grouped by shot folder
  const clipsByFolder = useMemo(() => {
    const m: Record<string, any[]> = {}
    for (const c of (studioData?.clips || [])) {
      const name = c.name || ''
      const parts = name.split('/')
      const folder = parts.length > 1 ? parts[0] : 'Unsorted'
      if (!m[folder]) m[folder] = []
      m[folder].push(c)
    }
    return Object.entries(m).sort((a, b) => {
      const numA = parseInt(a[0].replace(/\D/g, '')) || 999
      const numB = parseInt(b[0].replace(/\D/g, '')) || 999
      return numA - numB
    })
  }, [studioData?.clips])

  // ─── Version toggle ────────────────────────────────────────
  const toggleVersion = (key: string) => setExpandedVersions(prev => ({ ...prev, [key]: !prev[key] }))

  // ─── Set as selected version ───────────────────────────────
  const selectVersion = useCallback(async (docId: string) => {
    try {
      await apiClient.selectContent(docId)
      await loadData()
    } catch (e) { console.error('Failed to select version:', e) }
  }, [loadData])

  // ─── Regenerate ────────────────────────────────────────────
  const handleRegenerate = useCallback((section: string) => {
    setRegenerating(prev => ({ ...prev, [section]: true }))
    setTimeout(() => setRegenerating(prev => ({ ...prev, [section]: false })), 3000)
  }, [])

  // ─── Delete media ──────────────────────────────────────────
  const handleDeleteMedia = async (mediaId: string) => {
    try {
      await apiClient.deleteMedia(mediaId)
      setStudioData(prev => prev ? {
        ...prev,
        images: prev.images.filter(i => i.id !== mediaId),
        clips: prev.clips.filter(c => c.id !== mediaId),
      } : prev)
    } catch (e) { console.error('Failed to delete media:', e) }
  }

  const toggleCategory = (key: string) => setExpandedCategories(p => ({ ...p, [key]: !p[key] }))

  // ─── Drag handler ─────────────────────────────────────────
  const onImageDragStart = (e: React.DragEvent, img: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: img.id, src: img.imageUrl, title: img.name || 'Image', type: 'image' }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const currentImages = (studioData?.images || []).map(i => ({ id: i.id, src: i.imageUrl, title: i.name || i.id, type: 'image' as const }))
  const currentClips = (studioData?.clips || []).map(c => ({ id: c.id, src: c.clipUrl, title: c.name || c.id, thumbnail: c.clipUrl, type: 'clip' as const }))

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="h-full flex bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="relative border-b border-border px-6 py-3 bg-card flex-shrink-0">
          <div className="absolute top-0 left-0 right-0 h-[2px] studio-gradient-accent opacity-60" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                <Clapperboard className="w-4 h-4 text-accent" />
                <p className="text-sm font-bold text-accent tracking-wide">EP {ep?.episodeNumber ?? '?'}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <p className="text-base font-semibold text-foreground">{part?.title || 'Loading...'}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs border-accent/30 text-accent bg-accent/5">
              <Sparkles className="w-3.5 h-3.5 mr-1" />AI Studio
            </Badge>
          </div>
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Tabs value={activeTab} onValueChange={(v) => !isGenerating && setActiveTab(v as any)} className="w-full">
            <TabsList className={cn("inline-flex h-12 items-center justify-center rounded-xl bg-card border border-border/60 p-1 mb-6 shadow-sm transition-all", isGenerating && "pointer-events-none")}>
              {(['characters', 'locations', 'props', 'beats', 'shots', 'storyboard', 'images', 'clips'] as const).map(tab => {
                const icons: Record<string, React.ElementType> = { characters: User2, locations: MapPin, props: Box, beats: Sparkles, shots: Camera, storyboard: Layers, images: ImageIcon, clips: Video }
                const counts: Record<string, number> = {
                  characters: studioData?.characters?.length || 0,
                  locations: studioData?.locations?.length || 0,
                  props: studioData?.props?.length || 0,
                  beats: selectedBeats.length, shots: selectedShots.length, storyboard: selectedPanels.length,
                  images: studioData?.images?.length || 0, clips: studioData?.clips?.length || 0
                }
                const tabLabels: Record<string, string> = {
                  characters: 'Characters', locations: 'Locations', props: 'Props',
                  beats: 'Beats', shots: 'Shots', storyboard: 'Storyboard',
                  images: 'Images', clips: 'Clips'
                }
                const Icon = icons[tab]
                const genTabIdx = GEN_PHASES.findIndex(p => p.tab === tab)
                const isGenDone = isGenerating && genTabIdx < genPhase
                const isGenActive = isGenerating && genTabIdx === genPhase
                return (
                  <TabsTrigger key={tab} value={tab} className={cn(
                    "rounded-lg px-5 py-2.5 text-sm font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md transition-all gap-2",
                    isGenerating && !isGenActive && !isGenDone && "opacity-40",
                    isGenDone && "opacity-70",
                    isGenActive && "animate-pulse"
                  )}>
                    <Icon className="w-4 h-4" />
                    {tabLabels[tab] || tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {!isGenerating && counts[tab] > 0 && <span className="ml-1 text-xs opacity-70">({counts[tab]})</span>}
                    {isGenDone && <span className="ml-1 text-xs text-emerald-400">✓</span>}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {/* ═══ GENERATION ANIMATION OVERLAY ═══ */}
            {isGenerating && (
              <AnimatePresence mode="wait">
                <GeneratingOverlay key={genPhase} phase={GEN_PHASES[genPhase]} />
              </AnimatePresence>
            )}

            {!isGenerating && (
            <>
            {/* ═══════════════════════════════════════════════
                CHARACTERS TAB
                ═══════════════════════════════════════════════ */}
            <TabsContent value="characters" className="mt-0">
              <SectionHeader color="from-pink-500 to-pink-500/30" title="Characters"
                sub={`${studioData?.characters?.length || 0} character${(studioData?.characters?.length || 0) !== 1 ? 's' : ''} in this project`} />

              {loading ? <SkeletonCards count={4} /> : !studioData?.characters?.length ? (
                <EmptyState icon={User2} label="No characters yet" sub="Characters will be seeded when a part is created" />
              ) : (
                <HScrollContainer>
                  {studioData.characters.map((char, idx) => {
                    const data = (() => { try { return JSON.parse(char.content) } catch { return {} } })()
                    return (
                      <motion.div key={char.id} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: idx * 0.08, duration: 0.3 }}
                        className="flex-shrink-0 w-[340px] rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden hover:border-pink-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/5">
                        {/* Character Header */}
                        <div className="p-4 border-b border-border/20 bg-gradient-to-r from-pink-500/10 via-pink-500/5 to-transparent">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
                              <User2 className="w-5 h-5 text-pink-400" />
                            </div>
                            <div>
                              <span className="text-base font-bold text-foreground">{char.name}</span>
                              {data['Age & Gender'] && (
                                <p className="text-xs text-muted-foreground">{data['Age & Gender']}</p>
                              )}
                            </div>
                          </div>
                          {data['Cultural Context'] && (
                            <Badge variant="outline" className="mt-2 text-[10px] border-pink-500/20 text-pink-400 bg-pink-500/5">
                              {data['Cultural Context']}
                            </Badge>
                          )}
                        </div>
                        {/* Character Info */}
                        <div className="p-4 space-y-2 max-h-[200px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
                          {data['Physical Description'] && <KV label="Look" value={data['Physical Description']} accent="text-pink-400" />}
                          {data['Attire'] && <KV label="Attire" value={data['Attire']} accent="text-pink-400" />}
                          {data['Visual Design'] && <KV label="Style" value={data['Visual Design']} />}
                        </div>
                        {/* Character Images Stack */}
                        {char.images && char.images.length > 0 && (
                          <div className="border-t border-border/20 p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <ImageIcon size={11} className="text-pink-400" />
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Reference ({char.images.length})
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {char.images.slice(0, 6).map((img, i) => (
                                <motion.div key={img.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: idx * 0.08 + i * 0.04 }}
                                  className="group relative aspect-square rounded-lg overflow-hidden border border-border/30 bg-secondary/30 cursor-pointer"
                                  onClick={() => setPreviewImage(img.imageUrl)}>
                                  <img src={img.imageUrl} alt={char.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                    <Eye className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                            {char.images.length > 6 && (
                              <p className="text-[10px] text-muted-foreground text-center mt-1.5">+{char.images.length - 6} more</p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </HScrollContainer>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════
                LOCATIONS TAB
                ═══════════════════════════════════════════════ */}
            <TabsContent value="locations" className="mt-0">
              <SectionHeader color="from-emerald-500 to-emerald-500/30" title="Locations"
                sub={`${studioData?.locations?.length || 0} location${(studioData?.locations?.length || 0) !== 1 ? 's' : ''} in this project`} />

              {loading ? <SkeletonCards count={4} /> : !studioData?.locations?.length ? (
                <EmptyState icon={MapPin} label="No locations yet" sub="Locations will be seeded when a part is created" />
              ) : (
                <HScrollContainer>
                  {studioData.locations.map((loc, idx) => {
                    const data = (() => { try { return JSON.parse(loc.content) } catch { return {} } })()
                    const vp = data.visual_profile || {}
                    return (
                      <motion.div key={loc.id} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: idx * 0.08, duration: 0.3 }}
                        className="flex-shrink-0 w-[340px] rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
                        {/* Location Header */}
                        <div className="p-4 border-b border-border/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-base font-bold text-foreground truncate block">{loc.name}</span>
                              {data.type && (
                                <p className="text-xs text-muted-foreground">{data.type}</p>
                              )}
                            </div>
                          </div>
                          {data.narrative_role && (
                            <Badge variant="outline" className="mt-2 text-[10px] border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
                              {data.narrative_role}
                            </Badge>
                          )}
                        </div>
                        {/* Location Info */}
                        <div className="p-4 space-y-2 max-h-[200px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
                          {vp.environment && <KV label="Env" value={vp.environment} accent="text-emerald-400" />}
                          {vp.architecture_or_space && <KV label="Arch" value={vp.architecture_or_space} accent="text-emerald-400" />}
                          {vp.lighting_time_of_day && <KV label="Light" value={vp.lighting_time_of_day} />}
                          {vp.cultural_or_era_style && <KV label="Style" value={vp.cultural_or_era_style} />}
                          {vp.key_objects_or_features?.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {vp.key_objects_or_features.map((obj: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-[10px] border-emerald-500/15 text-emerald-300/70">{obj}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Location Images Stack */}
                        {loc.images && loc.images.length > 0 && (
                          <div className="border-t border-border/20 p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <ImageIcon size={11} className="text-emerald-400" />
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Reference ({loc.images.length})
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {loc.images.slice(0, 6).map((img, i) => (
                                <motion.div key={img.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: idx * 0.08 + i * 0.04 }}
                                  className="group relative aspect-square rounded-lg overflow-hidden border border-border/30 bg-secondary/30 cursor-pointer"
                                  onClick={() => setPreviewImage(img.imageUrl)}>
                                  <img src={img.imageUrl} alt={loc.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                    <Eye className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                            {loc.images.length > 6 && (
                              <p className="text-[10px] text-muted-foreground text-center mt-1.5">+{loc.images.length - 6} more</p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </HScrollContainer>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════
                PROPS TAB
                ═══════════════════════════════════════════════ */}
            <TabsContent value="props" className="mt-0">
              <SectionHeader color="from-orange-500 to-orange-500/30" title="Props & Extras"
                sub={`${studioData?.props?.length || 0} prop${(studioData?.props?.length || 0) !== 1 ? 's' : ''} in this project`} />

              {loading ? <SkeletonCards count={3} /> : !studioData?.props?.length ? (
                <EmptyState icon={Box} label="No props yet" sub="Props will be seeded when a part is created" />
              ) : (
                <HScrollContainer>
                  {studioData.props.map((prop, idx) => {
                    const data = (() => { try { return JSON.parse(prop.content) } catch { return {} } })()
                    return (
                      <motion.div key={prop.id} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: idx * 0.08, duration: 0.3 }}
                        className="flex-shrink-0 w-[340px] rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden hover:border-orange-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5">
                        {/* Prop Header */}
                        <div className="p-4 border-b border-border/20 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                              <Box className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                              <span className="text-base font-bold text-foreground">{prop.name}</span>
                              {prop.category && (
                                <p className="text-xs text-muted-foreground capitalize">{prop.category}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Prop Info */}
                        <div className="p-4 space-y-2 max-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
                          {data.description && <KV label="Desc" value={data.description} accent="text-orange-400" />}
                          {Object.entries(data).filter(([k]) => !['name', 'description', 'category'].includes(k)).map(([key, value]) => (
                            <KV key={key} label={key.replace(/_/g, ' ').substring(0, 8)} value={typeof value === 'string' ? value : JSON.stringify(value)} />
                          ))}
                        </div>
                        {/* Prop Images Stack */}
                        {prop.images && prop.images.length > 0 && (
                          <div className="border-t border-border/20 p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <ImageIcon size={11} className="text-orange-400" />
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Reference ({prop.images.length})
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {prop.images.slice(0, 4).map((img, i) => (
                                <motion.div key={img.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: idx * 0.08 + i * 0.04 }}
                                  className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-border/30 bg-secondary/30 cursor-pointer"
                                  onClick={() => setPreviewImage(img.imageUrl)}>
                                  <img src={img.imageUrl} alt={prop.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                    <Eye className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                            {prop.images.length > 4 && (
                              <p className="text-[10px] text-muted-foreground text-center mt-1.5">+{prop.images.length - 4} more</p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </HScrollContainer>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════
                BEATS TAB
                ═══════════════════════════════════════════════ */}
            <TabsContent value="beats" className="mt-0">
              <SectionHeader color="from-accent to-accent/30" title="Narrative Beats"
                sub={`${selectedBeats.length} beat${selectedBeats.length !== 1 ? 's' : ''} · ${beatVersions.length} version${beatVersions.length !== 1 ? 's' : ''}`}
                onRegenerate={() => handleRegenerate('beats')} isRegenerating={regenerating.beats} />

              {loading || regenerating.beats ? <SkeletonCards count={4} /> : beatVersions.length === 0 ? (
                <EmptyState icon={Sparkles} label="No beats yet" sub="Generate beats from the AI panel" />
              ) : (
                <div className="space-y-4">
                  {beatVersions.map((version, vIdx) => {
                    const vKey = `beats-v${version.versionNo}`
                    const isExpanded = version.selected || expandedVersions[vKey]
                    return (
                      <motion.div key={version.docId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: vIdx * 0.08 }}
                        className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
                        {/* Version Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-b border-border/20">
                          <div className="flex items-center gap-3">
                            <button onClick={() => toggleVersion(vKey)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </motion.div>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                                </div>
                                <span className="text-base font-bold">Version {version.versionNo}</span>
                              </div>
                            </button>
                            {version.selected && (
                              <Badge variant="outline" className="text-xs border-accent/30 text-accent bg-accent/10">Selected</Badge>
                            )}
                            <span className="text-sm text-muted-foreground">{version.items.length} beat{version.items.length !== 1 ? 's' : ''}</span>
                          </div>
                          {!version.selected && (
                            <Button variant="outline" size="sm" onClick={() => selectVersion(version.docId)}
                              className="h-8 rounded-lg text-sm gap-1.5 border-accent/20 text-accent hover:bg-accent/10">
                              Set as Selected
                            </Button>
                          )}
                        </div>
                        {/* Version Content */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                              <div className="p-4">
                                <HScrollContainer>
                                  {version.items.map((beat: any, idx: number) => (
                                    <motion.div key={idx} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                      transition={{ delay: idx * 0.06, duration: 0.3 }}
                                      className="flex-shrink-0 w-[400px] rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5">
                                      <div className="p-4 border-b border-border/20 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-accent" />
                                          </div>
                                          <span className="text-base font-bold text-foreground truncate max-w-[280px]">
                                            {beat.Title || beat.title || `Beat ${idx + 1}`}
                                          </span>
                                        </div>
                                        {(beat.Emotion || beat.emotion) && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {String(beat.Emotion || beat.emotion).split(',').map((em: string, i: number) => (
                                              <EmotionBadge key={i} emotion={em.trim()} />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="p-4 space-y-1 max-h-[420px] overflow-y-auto">
                                        <KV label="Beat #" value={String(beat.Beat_Number || beat.beat_number || idx + 1)} accent="text-accent" />
                                        <KV label="Scene" value={beat.Scene_Ref || beat.scene_ref} accent="text-accent" />
                                        <KV label="Time" value={beat.Time_Range || beat.time_range} />
                                        <KV label="Description" value={beat.Description || beat.description} />
                                        {(beat.Screenplay_lines || beat.screenplay_lines)?.length > 0 && (
                                          <div className="pt-2">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Screenplay</span>
                                            <div className="mt-1 space-y-1">
                                              {(beat.Screenplay_lines || beat.screenplay_lines || []).map((line: string, li: number) => (
                                                <p key={li} className="text-sm text-foreground/80 pl-3 border-l-2 border-accent/20 leading-relaxed">{line}</p>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  ))}
                                </HScrollContainer>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════
                SHOTS TAB
                ═══════════════════════════════════════════════ */}
            <TabsContent value="shots" className="mt-0">
              <SectionHeader color="from-[hsl(var(--studio-cyan))] to-[hsl(var(--studio-cyan)/0.3)]" title="Shot Breakdown"
                sub={`${selectedShots.length} shot${selectedShots.length !== 1 ? 's' : ''} across ${selectedShotBeats.length} beat${selectedShotBeats.length !== 1 ? 's' : ''} · ${shotVersions.length} version${shotVersions.length !== 1 ? 's' : ''}`}
                onRegenerate={() => handleRegenerate('shots')} isRegenerating={regenerating.shots} />

              {loading || regenerating.shots ? <SkeletonCards count={4} /> : shotVersions.length === 0 ? (
                <EmptyState icon={Camera} label="No shots yet" sub="Generate shots from the AI panel" />
              ) : (
                <div className="space-y-4">
                  {shotVersions.map((version, vIdx) => {
                    const vKey = `shots-v${version.versionNo}`
                    const isExpanded = version.selected || expandedVersions[vKey]
                    const allShotsInVersion = version.items.flatMap((b: any) => b.shots || [])
                    return (
                      <motion.div key={version.docId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: vIdx * 0.08 }}
                        className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[hsl(var(--studio-cyan)/0.1)] via-[hsl(var(--studio-cyan)/0.05)] to-transparent border-b border-border/20">
                          <div className="flex items-center gap-3">
                            <button onClick={() => toggleVersion(vKey)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </motion.div>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[hsl(var(--studio-cyan)/0.15)] flex items-center justify-center">
                                  <Camera className="w-3.5 h-3.5 text-[hsl(var(--studio-cyan))]" />
                                </div>
                                <span className="text-base font-bold">Version {version.versionNo}</span>
                              </div>
                            </button>
                            {version.selected && (
                              <Badge variant="outline" className="text-xs border-[hsl(var(--studio-cyan)/0.3)] text-[hsl(var(--studio-cyan))] bg-[hsl(var(--studio-cyan)/0.1)]">Selected</Badge>
                            )}
                            <span className="text-sm text-muted-foreground">{allShotsInVersion.length} shot{allShotsInVersion.length !== 1 ? 's' : ''} · {version.items.length} beat{version.items.length !== 1 ? 's' : ''}</span>
                          </div>
                          {!version.selected && (
                            <Button variant="outline" size="sm" onClick={() => selectVersion(version.docId)}
                              className="h-8 rounded-lg text-sm gap-1.5 border-[hsl(var(--studio-cyan)/0.2)] text-[hsl(var(--studio-cyan))] hover:bg-[hsl(var(--studio-cyan)/0.1)]">
                              Set as Selected
                            </Button>
                          )}
                        </div>
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                              <div className="p-4">
                                {/* Horizontal scroll container for beat columns */}
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                  {version.items.map((beat: any, bIdx: number) => (
                                    <div key={bIdx} className="flex-shrink-0 w-[400px] space-y-3">
                                      {/* Beat header */}
                                      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm rounded-xl border border-border/30 p-3">
                                        <div className="flex items-center gap-2">
                                          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-[hsl(var(--studio-cyan))] to-[hsl(var(--studio-cyan)/0.3)]" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-foreground truncate">Beat {beat.beat_number || bIdx + 1}: {beat.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{beat.scene_ref} · {beat.time_range}</p>
                                          </div>
                                        </div>
                                        {beat.emotion && (
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {String(beat.emotion).split(',').map((em: string, i: number) => (
                                              <EmotionBadge key={i} emotion={em.trim()} />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      {/* Shots stacked vertically */}
                                      <div className="space-y-3">
                                        {(beat.shots || []).map((shot: any, sIdx: number) => (
                                          <motion.div key={sIdx} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ delay: sIdx * 0.06, duration: 0.3 }}
                                            className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden hover:border-[hsl(var(--studio-cyan)/0.3)] transition-all duration-300 hover:shadow-lg">
                                            <div className="p-4 border-b border-border/20 bg-gradient-to-r from-[hsl(var(--studio-cyan)/0.1)] via-[hsl(var(--studio-cyan)/0.05)] to-transparent">
                                              <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-[hsl(var(--studio-cyan)/0.15)] flex items-center justify-center">
                                                  <Camera className="w-4 h-4 text-[hsl(var(--studio-cyan))]" />
                                                </div>
                                                <span className="text-base font-bold truncate">Shot {shot.shot}</span>
                                              </div>
                                              {shot.emotion && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                  {String(shot.emotion).split(',').map((em: string, i: number) => (
                                                    <EmotionBadge key={i} emotion={em.trim()} />
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                            <div className="p-4 space-y-1">
                                              <KV label="Title" value={shot.intent_title} accent="text-[hsl(var(--studio-cyan))]" />
                                              {shot.intent && (
                                                <div className="py-1.5">
                                                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Intent</span>
                                                  <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{shot.intent}</p>
                                                </div>
                                              )}
                                              <KV label="Function" value={shot.narrative_function} />
                                              <KV label="Duration" value={shot.estimated_duration} />
                                            </div>
                                          </motion.div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════
                STORYBOARD TAB
                ═══════════════════════════════════════════════ */}
            <TabsContent value="storyboard" className="mt-0">
              <SectionHeader color="from-[hsl(var(--studio-pink))] to-[hsl(var(--studio-pink)/0.3)]" title="Storyboard Panels"
                sub={`${selectedPanels.length} panel${selectedPanels.length !== 1 ? 's' : ''} · ${storyboardVersions.length} version${storyboardVersions.length !== 1 ? 's' : ''}`}
                onRegenerate={() => handleRegenerate('storyboard')} isRegenerating={regenerating.storyboard} />

              {loading || regenerating.storyboard ? <SkeletonCards count={4} /> : storyboardVersions.length === 0 ? (
                <EmptyState icon={Layers} label="No storyboard yet" sub="Generate storyboard from the AI panel" />
              ) : (
                <div className="space-y-4">
                  {storyboardVersions.map((version, vIdx) => {
                    const vKey = `storyboard-v${version.versionNo}`
                    const isExpanded = version.selected || expandedVersions[vKey]
                    return (
                      <motion.div key={version.docId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: vIdx * 0.08 }}
                        className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[hsl(var(--studio-pink)/0.1)] via-[hsl(var(--studio-pink)/0.05)] to-transparent border-b border-border/20">
                          <div className="flex items-center gap-3">
                            <button onClick={() => toggleVersion(vKey)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </motion.div>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[hsl(var(--studio-pink)/0.15)] flex items-center justify-center">
                                  <Layers className="w-3.5 h-3.5 text-[hsl(var(--studio-pink))]" />
                                </div>
                                <span className="text-base font-bold">Version {version.versionNo}</span>
                              </div>
                            </button>
                            {version.selected && (
                              <Badge variant="outline" className="text-xs border-[hsl(var(--studio-pink)/0.3)] text-[hsl(var(--studio-pink))] bg-[hsl(var(--studio-pink)/0.1)]">Selected</Badge>
                            )}
                            <span className="text-sm text-muted-foreground">{version.items.length} panel{version.items.length !== 1 ? 's' : ''}</span>
                          </div>
                          {!version.selected && (
                            <Button variant="outline" size="sm" onClick={() => selectVersion(version.docId)}
                              className="h-8 rounded-lg text-sm gap-1.5 border-[hsl(var(--studio-pink)/0.2)] text-[hsl(var(--studio-pink))] hover:bg-[hsl(var(--studio-pink)/0.1)]">
                              Set as Selected
                            </Button>
                          )}
                        </div>
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                              <div className="p-4">
                                <HScrollContainer>
                                  {version.items.map((panel: any, idx: number) => (
                                    <motion.div key={idx} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                      transition={{ delay: idx * 0.06, duration: 0.3 }}
                                      className="flex-shrink-0 w-[380px] rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden hover:border-[hsl(var(--studio-pink)/0.3)] transition-all duration-300 hover:shadow-lg">
                                      <div className="p-4 border-b border-border/20 bg-gradient-to-r from-[hsl(var(--studio-pink)/0.1)] via-[hsl(var(--studio-pink)/0.05)] to-transparent">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-xl bg-[hsl(var(--studio-pink)/0.15)] flex items-center justify-center">
                                            <Layers className="w-4 h-4 text-[hsl(var(--studio-pink))]" />
                                          </div>
                                          <div>
                                            <span className="text-base font-bold">Panel {(panel.metadata?.panel_number ?? idx + 1)}</span>
                                            {panel.metadata?.shot_summary && (
                                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{panel.metadata.shot_summary}</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="p-4 space-y-1 max-h-[400px] overflow-y-auto">
                                        {panel.cinematography && (
                                          <div className="py-1">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--studio-pink))]">Cinematography</span>
                                            <div className="mt-1">
                                              <KV label="Shot" value={panel.cinematography.shot_size_angle} />
                                              <KV label="Lens" value={panel.cinematography.lens_intent} />
                                              <KV label="Movement" value={panel.cinematography.camera_movement} />
                                            </div>
                                          </div>
                                        )}
                                        {panel.composition && (
                                          <div className="py-1 border-t border-border/10">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--studio-pink))]">Composition</span>
                                            <div className="mt-1">
                                              <KV label="Subject" value={panel.composition.subject_composition} />
                                              <KV label="Action" value={panel.composition.action} />
                                            </div>
                                          </div>
                                        )}
                                        {panel.setting && (
                                          <div className="py-1 border-t border-border/10">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--studio-pink))]">Setting</span>
                                            <div className="mt-1">
                                              <KV label="Location" value={panel.setting.key_location} />
                                              <KV label="Scene" value={panel.setting.scenography} />
                                              <KV label="Time" value={panel.setting.time_context} />
                                            </div>
                                          </div>
                                        )}
                                        {panel.character_focal_position && (
                                          <div className="py-1 border-t border-border/10">
                                            <KV label="Focal" value={panel.character_focal_position} accent="text-[hsl(var(--studio-pink))]" />
                                          </div>
                                        )}
                                        {panel.characters?.length > 0 && (
                                          <div className="py-1 border-t border-border/10">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--studio-pink))]">Characters</span>
                                            <div className="mt-1 space-y-1">
                                              {panel.characters.map((ch: any, ci: number) => (
                                                <div key={ci} className="flex items-start gap-2 py-0.5">
                                                  <Badge variant="outline" className="text-[10px] flex-shrink-0">{ch.character_name}</Badge>
                                                  <span className="text-[13px] text-foreground/70">{ch.character_visual_identity}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {panel.audio && (
                                          <div className="py-1 border-t border-border/10">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--studio-pink))]">Audio</span>
                                            <div className="mt-1">
                                              <KV label="Dialogue" value={panel.audio.dialogue !== 'NA' ? panel.audio.dialogue : undefined} />
                                              <KV label="Cue" value={panel.audio.audio_cue_intent} />
                                            </div>
                                          </div>
                                        )}
                                        {panel.story_context && (
                                          <div className="py-1 border-t border-border/10">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--studio-pink))]">Story Context</span>
                                            <div className="mt-1">
                                              <KV label="Style" value={panel.story_context.visual_style_guide} />
                                              <KV label="Project" value={panel.story_context.project_context} />
                                              <KV label="Era" value={panel.story_context.era_culture_context} />
                                              <KV label="Theme" value={panel.story_context.emotional_thematic_intent} />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  ))}
                                </HScrollContainer>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════
                IMAGES TAB
                ═══════════════════════════════════════════════ */}
            <TabsContent value="images" className="mt-0 space-y-5">
              <SectionHeader color="from-[hsl(var(--studio-orange))] to-[hsl(var(--studio-orange)/0.3)]" title="Generated Images"
                sub={`${studioData?.images?.length || 0} images — drag to AI panel`}
                onRegenerate={() => handleRegenerate('images')} isRegenerating={regenerating.images} />

              {loading || regenerating.images ? <SkeletonCards /> : (studioData?.images?.length || 0) === 0 ? (
                <EmptyState icon={ImageIcon} label="No images yet" sub="Generate images from the AI panel" />
              ) : (
                IMAGE_CATEGORIES.map((cat, ci) => {
                  const catImages = imagesByCategory[cat.key] || []
                  if (catImages.length === 0) return null
                  const expanded = expandedCategories[cat.key]
                  const CatIcon = cat.icon
                  return (
                    <motion.div key={cat.key} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.08 }}
                      className={cn("rounded-2xl border overflow-hidden", cat.border, expanded && "shadow-sm")}>
                      <button onClick={() => toggleCategory(cat.key)}
                        className={cn("w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-card/80", `bg-gradient-to-r ${cat.gradient} to-transparent`)}>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", cat.bg)}>
                            <CatIcon className={cn("w-4 h-4", cat.color)} />
                          </div>
                          <span className="text-base font-bold text-foreground">{cat.label}</span>
                          <Badge variant="outline" className={cn("text-xs", cat.border, cat.color)}>{catImages.length}</Badge>
                        </div>
                        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }} className="overflow-hidden">
                            <div className="p-5 border-t border-border/20">
                              {cat.key === 'shot' ? (
                                <div className="flex gap-5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                                  {groupByShotFolder(catImages).map(([folder, imgs], colIdx) => (
                                    <div key={folder} className="flex-shrink-0 w-[260px]">
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-accent to-accent/50" />
                                        <h3 className="text-sm font-bold text-foreground truncate">{folder.replace(/_/g, ' ')}</h3>
                                        <Badge variant="outline" className="text-[10px] ml-auto">{imgs.length}</Badge>
                                      </div>
                                      <div className="space-y-3">
                                        {imgs.map((img: any, ii: number) => (
                                          <DraggableImageCard key={img.id} img={img} imgIdx={ii} colIdx={colIdx}
                                            onDragStart={onImageDragStart}
                                            onPreview={() => setPreviewImage(img.imageUrl)}
                                            onDelete={() => handleDeleteMedia(img.id)} />
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : cat.key === 'character' ? (
                                <div className="flex gap-5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                                  {groupByCharFolder(catImages).map(([folder, imgs], colIdx) => (
                                    <div key={folder} className="flex-shrink-0 w-[260px]">
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-pink-400/50" />
                                        <h3 className="text-sm font-bold text-foreground truncate">{folder.replace(/_/g, ' ')}</h3>
                                        <Badge variant="outline" className="text-[10px] ml-auto">{imgs.length}</Badge>
                                      </div>
                                      <div className="space-y-3">
                                        {imgs.map((img: any, ii: number) => (
                                          <DraggableImageCard key={img.id} img={img} imgIdx={ii} colIdx={colIdx}
                                            onDragStart={onImageDragStart}
                                            onPreview={() => setPreviewImage(img.imageUrl)}
                                            onDelete={() => handleDeleteMedia(img.id)} />
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                  {catImages.map((img: any, i: number) => (
                                    <DraggableImageCard key={img.id} img={img} imgIdx={i} colIdx={0}
                                      onDragStart={onImageDragStart}
                                      onPreview={() => setPreviewImage(img.imageUrl)}
                                      onDelete={() => handleDeleteMedia(img.id)} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════
                CLIPS TAB
                ═══════════════════════════════════════════════ */}
            <TabsContent value="clips" className="mt-0">
              <SectionHeader color="from-[hsl(var(--studio-green))] to-[hsl(var(--studio-green)/0.3)]" title="Video Clips"
                sub={`${studioData?.clips?.length || 0} clips`}
                onRegenerate={() => handleRegenerate('clips')} isRegenerating={regenerating.clips} />

              {loading || regenerating.clips ? <SkeletonCards /> : clipsByFolder.length === 0 ? (
                <EmptyState icon={Video} label="No clips yet" sub="Generate clips from the AI panel" />
              ) : (
                <HScrollContainer className="min-h-[300px]">
                  {clipsByFolder.map(([folder, clips], ci) => (
                    <div key={folder} className="flex-shrink-0 w-72 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md bg-[hsl(var(--studio-green)/0.1)] flex items-center justify-center">
                          <Video className="w-3.5 h-3.5 text-[hsl(var(--studio-green))]" />
                        </div>
                        <h3 className="text-base font-bold">{folder.replace(/_/g, ' ')}</h3>
                        <Badge variant="outline" className="text-xs ml-auto">{clips.length}</Badge>
                      </div>
                      <div className="flex flex-col gap-3">
                        {clips.map((clip: any, ii: number) => (
                          <motion.div key={clip.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: ci * 0.08 + ii * 0.04 }}
                            className="group relative rounded-xl overflow-hidden border border-border/30 hover:border-[hsl(var(--studio-green)/0.4)] cursor-pointer"
                            onClick={() => { setModalItem({ src: clip.clipUrl, title: clip.name || 'Clip', type: 'clip' }); setModalOpen(true) }}>
                            <div className="aspect-video bg-black relative">
                              <video src={clip.clipUrl} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform border border-white/20">
                                  <Play className="w-4 h-4 text-white ml-0.5" />
                                </div>
                              </div>
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteMedia(clip.id) }}
                                className="p-1.5 rounded-lg bg-red-500/20 backdrop-blur-sm hover:bg-red-500/40 text-white">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </HScrollContainer>
              )}
            </TabsContent>
            </>
            )}
          </Tabs>
        </div>
      </div>

      {/* Right Panel */}
      <RightPanel
        allImages={currentImages} allClips={currentClips}
        onPromptSubmit={() => {}} onRegenerate={() => handleRegenerate(activeTab)}
        onIterate={() => handleRegenerate(activeTab)} onImageSelect={() => {}}
        generatedResult={null} onCloseResult={() => {}}
        onRegenerateBeats={() => handleRegenerate('beats')}
        onRegenerateShots={() => handleRegenerate('shots')}
        onRegenerateStoryboard={() => handleRegenerate('storyboard')}
        onGenerateImage={() => {}} onGenerateClip={() => {}}
      />

      {/* ═══ MODALS ═══ */}
      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setPreviewImage(null)}>
            <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalOpen && modalItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setModalOpen(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-card border border-border/50 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h3 className="text-base font-bold">Preview</h3>
                <button onClick={() => setModalOpen(false)} className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="aspect-video rounded-xl overflow-hidden border border-border/50 bg-black">
                  {modalItem.type === 'clip'
                    ? <video src={modalItem.src} controls className="w-full h-full object-contain" />
                    : <img src={modalItem.src} alt="" className="w-full h-full object-cover" />}
                </div>
                <p className="text-base font-bold">{modalItem.title}</p>
                <button onClick={() => setModalOpen(false)} className="w-full px-4 py-2.5 rounded-xl border border-border/50 hover:bg-secondary text-sm font-semibold">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


/* ================================================================
   DRAGGABLE IMAGE CARD
   ================================================================ */
function DraggableImageCard({ img, imgIdx, colIdx, onDragStart, onPreview, onDelete }: {
  img: any; imgIdx: number; colIdx: number
  onDragStart: (e: React.DragEvent, img: any) => void
  onPreview: () => void; onDelete: () => void
}) {
  return (
    <div draggable onDragStart={(e) => onDragStart(e, img)} className="cursor-grab active:cursor-grabbing">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: colIdx * 0.06 + imgIdx * 0.03 }}
        className="group relative rounded-xl overflow-hidden border border-border/30 bg-card/50 hover:border-accent/30 transition-all duration-300 shadow-sm hover:shadow-lg">
        <img src={img.imageUrl} alt={`Image ${imgIdx + 1}`} className="w-full h-auto object-cover" onClick={onPreview} loading="lazy" />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-1 rounded-md bg-black/40 backdrop-blur-sm"><GripVertical size={12} className="text-white" /></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3">
          <div className="flex items-center gap-2 w-full">
            <button onClick={onPreview} className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"><ZoomIn size={14} /></button>
            <a href={img.imageUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"><Download size={14} /></a>
            <button onClick={onDelete} className="p-1.5 rounded-lg bg-red-500/20 backdrop-blur-sm hover:bg-red-500/40 text-white ml-auto"><Trash2 size={14} /></button>
          </div>
        </div>
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-xs text-white font-medium">#{imgIdx + 1}</div>
      </motion.div>
    </div>
  )
}
