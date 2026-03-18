'use client'

import React, { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  Sparkles, Clock, Loader2, RefreshCw, ChevronRight,
  ChevronLeft, AlertCircle, Film, Send, Lock, Image as ImageIcon,
  CornerDownLeft, FileText, Pencil, Save, CheckCircle, CheckCircle2, X, ExternalLink,
  History, Eye, Layers, Camera, Palette, Trash2, Upload, Plus, PanelRight, PanelRightClose,
  Clapperboard, PlayCircle, Download, ChevronDown,
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  apiClient, ExecutionStatus, ExecutionStepSummary,
  StepData, StepHistoryEntry, extractStepData, stepDisplayName, PartOut,
  type RichEntityAssets, type LabeledImage, type ShotOut, type ClipOut, type CharacterOut, type LocationOut,
} from '@/lib/api-client'
import { STEP_DISPLAY_TEMPLATE, type TabTemplate } from '@/lib/step-display-template'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { OptimizedVideo } from '@/components/optimized-video'

// ─── Step palette — cycles dynamically, no hardcoded step names ─────────────

type StepPalette = {
  accent: string; bg: string; bgSoft: string
  border: string; borderSoft: string; gradient: string
  headerGradient: string; hover: string
  icon: React.ElementType
}

const FALLBACK_PALETTES: StepPalette[] = [
  { accent: 'text-violet-400', bg: 'bg-violet-500/15', bgSoft: 'bg-violet-500/10', border: 'border-violet-500/30', borderSoft: 'border-violet-500/20', gradient: 'from-violet-500 to-violet-500/30', headerGradient: 'from-violet-500/10 via-transparent to-transparent', hover: 'hover:border-violet-500/30', icon: Sparkles },
  { accent: 'text-sky-400',    bg: 'bg-sky-500/15',    bgSoft: 'bg-sky-500/10',    border: 'border-sky-500/30',    borderSoft: 'border-sky-500/20',    gradient: 'from-sky-500 to-sky-500/30',       headerGradient: 'from-sky-500/10 via-transparent to-transparent',    hover: 'hover:border-sky-500/30',    icon: Layers  },
  { accent: 'text-emerald-400',bg: 'bg-emerald-500/15',bgSoft: 'bg-emerald-500/10',border: 'border-emerald-500/30',borderSoft: 'border-emerald-500/20',gradient: 'from-emerald-500 to-emerald-500/30', headerGradient: 'from-emerald-500/10 via-transparent to-transparent',hover: 'hover:border-emerald-500/30', icon: Film    },
  { accent: 'text-amber-400',  bg: 'bg-amber-500/15',  bgSoft: 'bg-amber-500/10',  border: 'border-amber-500/30',  borderSoft: 'border-amber-500/20',  gradient: 'from-amber-500 to-amber-500/30',   headerGradient: 'from-amber-500/10 via-transparent to-transparent',  hover: 'hover:border-amber-500/30',  icon: FileText},
  { accent: 'text-pink-400',   bg: 'bg-pink-500/15',   bgSoft: 'bg-pink-500/10',   border: 'border-pink-500/30',   borderSoft: 'border-pink-500/20',   gradient: 'from-pink-500 to-pink-500/30',     headerGradient: 'from-pink-500/10 via-transparent to-transparent',   hover: 'hover:border-pink-500/30',   icon: Camera  },
  { accent: 'text-cyan-400',   bg: 'bg-cyan-500/15',   bgSoft: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   borderSoft: 'border-cyan-500/20',   gradient: 'from-cyan-500 to-cyan-500/30',     headerGradient: 'from-cyan-500/10 via-transparent to-transparent',   hover: 'hover:border-cyan-500/30',   icon: Eye     },
  { accent: 'text-orange-400', bg: 'bg-orange-500/15', bgSoft: 'bg-orange-500/10', border: 'border-orange-500/30', borderSoft: 'border-orange-500/20', gradient: 'from-orange-500 to-orange-500/30', headerGradient: 'from-orange-500/10 via-transparent to-transparent', hover: 'hover:border-orange-500/30', icon: Palette },
]

const _paletteMap: Record<string, number> = {}; let _paletteCtr = 0
function getPalette(stepKey: string): StepPalette {
  if (!(stepKey in _paletteMap)) { _paletteMap[stepKey] = _paletteCtr % FALLBACK_PALETTES.length; _paletteCtr++ }
  return FALLBACK_PALETTES[_paletteMap[stepKey]]
}



// ─── Helpers ──────────────────────────────────────────────────

function KV({ label, value, accent }: { label: string; value?: string | null; accent?: string }) {
  if (!value) return null
  // Parse \n in strings as real line breaks
  const parts = value.split(/\\n|\n/)
  return (
    <div className="grid grid-cols-[minmax(110px,32%)_minmax(0,1fr)] gap-1.5 py-0.5 items-start max-w-full">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-normal break-words leading-tight">{label}</span>
      <span className="min-w-0 text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
        {parts.map((p, i) => (<React.Fragment key={i}>{p}{i < parts.length - 1 && <br />}</React.Fragment>))}
      </span>
    </div>
  )
}

/** Small labelled badge — used in execution metadata rows */
function MetaChip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/20 border border-border/20">
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">{label}</span>
      <span className={cn('text-[10px] text-foreground/70', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, gradient }: { icon: React.ElementType; title: string; gradient: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn('h-8 w-1 rounded-full bg-gradient-to-b', gradient)} />
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h2 className="text-base font-bold text-foreground">{title}</h2>
    </div>
  )
}

function HScrollContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const check = useCallback(() => {
    const el = ref.current; if (!el) return
    setCanLeft(el.scrollLeft > 0); setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])
  useEffect(() => { check(); const el = ref.current; if (el) el.addEventListener('scroll', check); window.addEventListener('resize', check); return () => { if (el) el.removeEventListener('scroll', check); window.removeEventListener('resize', check) } }, [check])
  const scroll = (dir: 'left' | 'right') => { ref.current?.scrollBy({ left: dir === 'left' ? -360 : 360, behavior: 'smooth' }); setTimeout(check, 400) }
  return (
    <div className={cn('relative group/scroll', className)}>
      {canLeft && <button onClick={() => scroll('left')} className="absolute left-0 top-0 bottom-0 z-10 w-12 flex items-center justify-center bg-gradient-to-r from-background via-background/80 to-transparent opacity-0 group-hover/scroll:opacity-100 transition-opacity"><div className="w-8 h-8 rounded-full bg-card border border-border/50 shadow-md flex items-center justify-center hover:scale-110 transition-transform"><ChevronLeft className="w-4 h-4" /></div></button>}
      <div ref={ref} className="flex gap-4 overflow-x-auto px-1 py-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
      {canRight && <button onClick={() => scroll('right')} className="absolute right-0 top-0 bottom-0 z-10 w-12 flex items-center justify-center bg-gradient-to-l from-background via-background/80 to-transparent opacity-0 group-hover/scroll:opacity-100 transition-opacity"><div className="w-8 h-8 rounded-full bg-card border border-border/50 shadow-md flex items-center justify-center hover:scale-110 transition-transform"><ChevronRight className="w-4 h-4" /></div></button>}
    </div>
  )
}

function SkeletonCards({ count = 4 }: { count?: number }) {
  return (<HScrollContainer>{Array.from({ length: count }).map((_, i) => (<div key={i} className="flex-shrink-0 w-[340px] rounded-2xl border border-border/20 overflow-hidden h-[320px] animate-pulse"><div className="p-4 border-b border-border/10 bg-muted/20"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-muted/40" /><div className="h-4 w-32 rounded-md bg-muted/40" /></div></div><div className="p-4 space-y-3">{[80, 65, 50, 70, 40].map((w, j) => (<div key={j} className="h-3 rounded bg-muted/20" style={{ width: `${w}%` }} />))}</div></div>))}</HScrollContainer>)
}

function EmptyState({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub: string }) {
  return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16"><div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4"><Icon className="w-8 h-8 text-accent/40" /></div><p className="text-base font-semibold text-foreground">{label}</p><p className="text-sm text-muted-foreground mt-1">{sub}</p></motion.div>)
}

function StepCard({ p, width = 280, idx = 0, header, children, isApproved = false, onRequestEdit }: { p: StepPalette; width?: number; idx?: number; header: React.ReactNode; children: React.ReactNode; isApproved?: boolean; onRequestEdit?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
      className="flex-shrink-0 rounded-2xl border-2 border-border/50 bg-card overflow-hidden transition-all duration-300 shadow-[0_2px_8px_0_rgb(0_0_0/0.12)] hover:shadow-[0_4px_16px_0_rgb(0_0_0/0.16)] hover:border-border/70 dark:shadow-[0_2px_8px_0_rgb(0_0_0/0.3)]"
      style={{ width }}>
      <div className={cn(
        'p-4 border-b-2 border-border/30 bg-gradient-to-r from-secondary/20 to-secondary/5 relative',
        (isApproved || onRequestEdit) && 'pr-24'
      )}>
        {header}
        {isApproved && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg border border-green-500/30 bg-green-500/10 text-green-500">
            <Lock size={10} />
            <span className="text-[10px] font-semibold">Approved</span>
          </div>
        )}
        {!isApproved && onRequestEdit && (
          <button
            onClick={onRequestEdit}
            className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-all text-[10px] font-bold"
          >
            <Pencil size={10} /> Edit
          </button>
        )}
      </div>
      <div className="overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
        {children}
      </div>
    </motion.div>
  )
}

// ─── Panel edit field helpers ────────────────────────────────

/** A single editable field in the AI right panel. Supports deep nested paths. */
interface PanelEditField {
  id: string                        // unique React key (dot-path)
  label: string                     // human-readable label
  value: string                     // current editable string
  pathParts: (string | number)[]    // path for value reconstruction
  isGroupHeader?: boolean           // array-item boundary (not editable)
}

function _ppLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Recursively flatten object data into a list of PanelEditFields. */
function flattenDataForPanel(data: Record<string, any>): PanelEditField[] {
  const out: PanelEditField[] = []
  function walk(obj: any, parts: (string | number)[], labelParts: string[]): void {
    if (obj === null || obj === undefined) return
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      out.push({ id: parts.join('.'), label: labelParts.join(' › '), value: String(obj), pathParts: parts })
      return
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        const itemParts = [...parts, i]
        const itemLabel = `${labelParts.join(' › ')} [${i + 1}]`
        if (item && typeof item === 'object') {
          out.push({ id: itemParts.join('.') + '.__head', label: itemLabel, value: '', pathParts: itemParts, isGroupHeader: true })
          Object.entries(item).forEach(([k, v]) => {
            if (k.startsWith('_')) return
            walk(v, [...itemParts, k], [itemLabel, _ppLabel(k)])
          })
        } else {
          out.push({ id: itemParts.join('.'), label: itemLabel, value: item == null ? '' : String(item), pathParts: itemParts })
        }
      })
      return
    }
    if (typeof obj === 'object') {
      Object.entries(obj).forEach(([k, v]) => {
        if (k.startsWith('_')) return
        walk(v, [...parts, k], [...labelParts, _ppLabel(k)])
      })
    }
  }
  Object.entries(data).forEach(([k, v]) => {
    if (k.startsWith('_')) return
    walk(v, [k], [_ppLabel(k)])
  })
  return out
}

/** Reconstruct the original data shape from edited panel fields. */
function reconstructFromPanelFields(fields: PanelEditField[], original: Record<string, any>): Record<string, any> {
  const result = JSON.parse(JSON.stringify(original))
  for (const k of Object.keys(result)) { if (k.startsWith('_')) delete result[k] }
  for (const field of fields) {
    if (field.isGroupHeader) continue
    let obj: any = result
    const parts = field.pathParts
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]
      if (obj[p] === undefined || obj[p] === null) obj[p] = typeof parts[i + 1] === 'number' ? [] : {}
      obj = obj[p]
    }
    const last = parts[parts.length - 1]
    const cur = obj[last]
    if (typeof cur === 'number') { const n = Number(field.value); obj[last] = isNaN(n) ? field.value : n }
    else if (typeof cur === 'boolean') { obj[last] = field.value === 'true' }
    else { try { obj[last] = JSON.parse(field.value) } catch { obj[last] = field.value } }
  }
  return result
}

// ─── Per-card editing ─────────────────────────────────────────

interface CardImageGroup {
  label: string
  urls: string[]
  stepKey: string   // which backend step these images belong to
}

interface EditingCard {
  cardTitle: string
  cardData: Record<string, any>
  mergeType: 'dict-entry' | 'array-item' | 'top-level-keys'
  parentKey?: string
  dictKey?: string
  arrayIndex?: number
  imageGroups?: CardImageGroup[]  // images associated with this card
}

// ─── Image lightbox context ──────────────────────────────────

/** Open lightbox: pass the full sibling URL array + current index for navigation */
const ImageViewCtx = React.createContext<(urls: string[], index: number, label?: string) => void>(() => {})

/** Manage images (delete / upload) in the context of a step */
interface ImageManageActions {
  onDelete: (stepKey: string, urlToRemove: string, group?: string) => Promise<void>
  onUpload: (stepKey: string, files: FileList, existingUrlsOverride?: string[]) => Promise<void>
}
const ImageManageCtx = React.createContext<ImageManageActions>({
  onDelete: async () => {},
  onUpload: async () => {},
})

// ─── Image lightbox modal ─────────────────────────────────────

function ImageLightbox({ urls, startIndex, label, onClose }: {
  urls: string[]; startIndex: number; label?: string; onClose: () => void
}) {
  const [idx, setIdx] = useState(startIndex)
  const prev = useCallback(() => setIdx(i => (i - 1 + urls.length) % urls.length), [urls.length])
  const next = useCallback(() => setIdx(i => (i + 1) % urls.length), [urls.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  const url = urls[idx] ?? ''
  const hasMany = urls.length > 1

  const handleDownload = useCallback(async () => {
    try {
      const res = await fetch(url, { mode: 'cors' })
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      const rawName = url.split('/').pop()?.split('?')[0] ?? 'image'
      a.download = label ? `${label.replace(/[^a-z0-9_\-. ]/gi, '_')}.${rawName.split('.').pop() ?? 'jpg'}` : rawName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [url, label])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.18 }}
        className="relative max-w-[92vw] max-h-[92vh] flex flex-col select-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute -top-3.5 -right-3.5 z-10 w-8 h-8 rounded-full bg-card border border-border/50 flex items-center justify-center text-foreground hover:bg-secondary hover:scale-110 transition-all shadow-xl">
          <X size={16} />
        </button>

        {/* Download — top-left corner of the image */}
        <button onClick={handleDownload}
          className="absolute -top-3.5 left-0 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card border border-border/50 text-foreground/80 hover:bg-secondary hover:text-foreground hover:scale-105 transition-all shadow-xl text-[11px] font-medium"
          title="Download image">
          <Download size={13} />
          <span>Download</span>
        </button>

        {/* Prev arrow */}
        {hasMany && (
          <button onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white/80 hover:bg-black/70 hover:scale-110 transition-all shadow-lg">
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Image */}
        <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
          <img key={url} src={url} alt={label || 'Image'} className="max-w-[92vw] max-h-[82vh] object-contain block" />
        </div>

        {/* Next arrow */}
        {hasMany && (
          <button onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white/80 hover:bg-black/70 hover:scale-110 transition-all shadow-lg">
            <ChevronRight size={20} />
          </button>
        )}

        {/* Caption + counter + dot indicators */}
        <div className="mt-2.5 flex items-center justify-center gap-3">
          {label && <p className="text-white text-[18px] font-bold truncate max-w-[400px]">{label}</p>}
          {hasMany && (
            <span className="text-white/50 text-[14px] font-semibold flex-shrink-0">{idx + 1} / {urls.length}</span>
          )}
          {hasMany && urls.length <= 16 && (
            <div className="flex items-center gap-1">
              {urls.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className={cn('w-1.5 h-1.5 rounded-full transition-all', i === idx ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/60')} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── S3 Image component ──────────────────────────────────────

/** Context that lets S3Image know about its siblings so the lightbox can navigate */
const ImageGalleryCtx = React.createContext<{ urls: string[]; getLabel: (url: string) => string | undefined }>({ urls: [], getLabel: () => undefined })

function S3Image({ url, label, className, onDelete }: {
  url: string; label?: string; className?: string; onDelete?: () => void
}) {
  const [err, setErr] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const viewImage = React.useContext(ImageViewCtx)
  const gallery = React.useContext(ImageGalleryCtx)

  const handleView = useCallback(() => {
    const siblings = gallery.urls.length > 1 ? gallery.urls : [url]
    const idx = siblings.indexOf(url)
    viewImage(siblings, idx >= 0 ? idx : 0, label)
  }, [gallery.urls, url, viewImage, label])

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onDelete) return
    setDeleting(true)
    try { await onDelete() } finally { setDeleting(false) }
  }, [onDelete])

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      // Fetch via XHR so we get a real blob (works for cross-origin presigned URLs too)
      const res = await fetch(url, { mode: 'cors' })
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      // Derive a filename: last path segment, strip query string
      const rawName = url.split('/').pop()?.split('?')[0] ?? 'image'
      a.download = label ? `${label.replace(/[^a-z0-9_\-. ]/gi, '_')}.${rawName.split('.').pop() ?? 'jpg'}` : rawName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // Fallback: open in new tab so user can save manually
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [url, label])

  if (!url || err) return (
    <div className={cn('rounded-xl border-2 shadow-md border-border/20 bg-muted/20 flex items-center justify-center min-h-[120px]', className)}>
      <div className="text-center p-2">
        <ImageIcon className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
        <p className="text-[9px] text-muted-foreground/40 truncate max-w-[120px]">{label || 'Image unavailable'}</p>
      </div>
    </div>
  )
  return (
    <div className={cn('group/img relative rounded-xl border-2 shadow-md border-border/20 bg-black/10 dark:bg-white/5 overflow-hidden', className)}>
      <img src={url} alt={label || 'Image'} onError={() => setErr(true)}
        className="w-full h-auto object-contain block cursor-zoom-in" loading="lazy"
        draggable
        onDragStart={e => { e.dataTransfer.setData('text/plain', url); e.dataTransfer.effectAllowed = 'copy' }}
        onClick={handleView} />
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
        <p className="text-[10px] text-white/90 font-medium truncate">{label || url.split('/').pop()}</p>
      </div>
      {/* Action buttons top-right */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
        <button onClick={e => { e.stopPropagation(); handleView() }}
          className="p-1.5 rounded-md bg-black/50 text-white/80 hover:bg-black/70 hover:text-white hover:scale-110 transition-all" title="View full size">
          <Eye size={11} />
        </button>
        <button onClick={handleDownload}
          className="p-1.5 rounded-md bg-black/50 text-white/80 hover:bg-black/70 hover:text-white hover:scale-110 transition-all" title="Download image">
          <Download size={11} />
        </button>
        {onDelete && (
          <button onClick={handleDelete} disabled={deleting}
            className="p-1.5 rounded-md bg-red-600/70 text-white/90 hover:bg-red-500 hover:scale-110 transition-all disabled:opacity-50" title="Delete image">
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Step Version Selector ────────────────────────────────────

function VersionSelector({ versions, activeVersionId, onSelect, stepKey }: {
  versions: StepHistoryEntry[]
  activeVersionId: string | null
  onSelect: (versionId: string) => void
  stepKey: string
}) {
  const p = getPalette(stepKey)
  if (versions.length <= 1) return null

  return (
    <div className="flex items-center gap-2 mb-4 px-1">
      <History size={13} className="text-muted-foreground flex-shrink-0" />
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex-shrink-0">Versions</span>
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {versions.map(v => {
          const isActive = v.step_version_id === activeVersionId
          return (
            <button
              key={v.step_version_id}
              onClick={() => onSelect(v.step_version_id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all',
                isActive ? 'bg-accent text-accent-foreground shadow-sm' :
                v.has_output ? 'text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-border/30' :
                'text-muted-foreground/50 hover:text-muted-foreground/80 border border-border/20'
              )}
            >
              <span>v{v.version_no}</span>
              {v.lineage?.type && v.lineage.type !== 'migrated_v4' && v.lineage.type !== 'seeded' && (
                <span className="text-[9px] opacity-60">{v.lineage.type}</span>
              )}
              {v.status === 'running' && <Loader2 size={9} className="animate-spin" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Universal JSON Renderer ──────────────────────────────────

/** Inline image grid — view-only, click to lightbox with nav */
function ImageGrid({ urls, name }: { urls: string[]; name: string }) {
  const displayName = name.replace(/_/g, ' ')
  const galleryCtx = React.useMemo(() => ({
    urls,
    getLabel: (_url: string) => displayName,
  }), [urls, displayName])
  if (!urls.length) return null
  return (
    <ImageGalleryCtx.Provider value={galleryCtx}>
      <div className="mt-2 flex flex-col gap-3">
        {urls.map((url, i) => (
          <S3Image key={url} url={url} label={`${displayName} ${i + 1}`} className="w-full rounded-xl" />
        ))}
      </div>
    </ImageGalleryCtx.Provider>
  )
}

/** Image grid that shows each image with its own label (e.g. "Anchor Full", "Front Closeup") */
function LabeledImageGrid({ images, onIterateImage, isAnchor = false }: { images: LabeledImage[]; onIterateImage?: (image: LabeledImage) => void; isAnchor?: boolean }) {
  const urls = React.useMemo(() => images.map(i => i.url), [images])
  const galleryCtx = React.useMemo(() => ({
    urls,
    getLabel: (url: string) => images.find(i => i.url === url)?.label ?? '',
  }), [urls, images])
  if (!images.length) return null
  
  if (isAnchor) {
    // Anchor images: full width, iterate button at top-right
    return (
      <ImageGalleryCtx.Provider value={galleryCtx}>
        <div className="mt-2 flex flex-col gap-3">
          {images.map((img, i) => (
            <div key={img.url + i} className="relative group">
              <S3Image url={img.url} label={img.label} className="w-full rounded-xl" />
              {onIterateImage && (
                <button
                  type="button"
                  onClick={() => onIterateImage(img)}
                  className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white font-semibold hover:bg-black/80 transition-all"
                >
                  <RefreshCw size={9} /> Iterate
                </button>
              )}
              <span className="absolute bottom-2 left-2 right-2 text-[9px] font-medium text-white bg-black/60 px-2 py-1 rounded truncate">{img.label}</span>
            </div>
          ))}
        </div>
      </ImageGalleryCtx.Provider>
    )
  }
  
  // Reference images: original layout
  return (
    <ImageGalleryCtx.Provider value={galleryCtx}>
      <div className="mt-2 flex flex-col gap-4">
        {images.map((img, i) => (
          <div key={img.url + i} className="flex flex-col gap-1.5">
            <S3Image url={img.url} label={img.label} className="w-full rounded-xl" />
            <span className="text-[10px] font-medium text-muted-foreground/70 text-center truncate px-1">{img.label}</span>
            {onIterateImage && (
              <button
                onClick={() => onIterateImage(img)}
                className="mx-auto mt-1 flex items-center gap-1 px-2 py-1 rounded-lg border border-border/30 bg-secondary/30 text-[10px] font-semibold text-foreground/70 hover:text-foreground hover:bg-secondary/60 transition-all"
              >
                <RefreshCw size={10} /> Iterate
              </button>
            )}
          </div>
        ))}
      </div>
    </ImageGalleryCtx.Provider>
  )
}

/** Collage-style grid — 2-column masonry with clickable thumbnails for lightbox */
function CollageImageGrid({ urls, name }: { urls: string[]; name: string }) {
  const viewImage = React.useContext(ImageViewCtx)
  if (!urls.length) return null
  return (
    <div className="grid grid-cols-2 gap-1.5 mt-2">
      {urls.map((url, i) => (
        <button
          key={url + i}
          onClick={() => viewImage(urls, i)}
          className="relative rounded-lg overflow-hidden aspect-square border border-border/20 group/coll bg-black/10 hover:border-accent/40 transition-all hover:shadow-md"
        >
          <img src={url} alt={`${name} ${i + 1}`} loading="lazy" className="w-full h-full object-cover"
            draggable onDragStart={e => { e.dataTransfer.setData('text/plain', url); e.dataTransfer.effectAllowed = 'copy' }} />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/coll:opacity-100 transition-opacity flex items-center justify-center">
            <Eye size={18} className="text-white" />
          </div>
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-white font-medium">
            #{i + 1}
          </div>
        </button>
      ))}
    </div>
  )
}

/** Collage-style grid for labeled images */
function CollageImageGridLabeled({ images, onIterateImage }: { images: LabeledImage[]; onIterateImage?: (image: LabeledImage) => void }) {
  const viewImage = React.useContext(ImageViewCtx)
  const urls = React.useMemo(() => images.map(i => i.url), [images])
  if (!images.length) return null
  return (
    <div className="grid grid-cols-2 gap-1.5 mt-2">
      {images.map((img, i) => (
        <button
          key={img.url + i}
          onClick={() => viewImage(urls, i)}
          className="relative rounded-lg overflow-hidden aspect-square border border-border/20 group/coll bg-black/10 hover:border-accent/40 transition-all hover:shadow-md"
        >
          <img src={img.url} alt={img.label} loading="lazy" className="w-full h-full object-cover"
            draggable onDragStart={e => { e.dataTransfer.setData('text/plain', img.url); e.dataTransfer.effectAllowed = 'copy' }} />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/coll:opacity-100 transition-opacity flex items-center justify-center">
            <Eye size={18} className="text-white" />
          </div>
          {onIterateImage && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onIterateImage(img) }}
              className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white font-semibold hover:bg-black/80 transition-all"
            >
              <RefreshCw size={9} /> Iterate
            </button>
          )}
          <div className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-white font-medium truncate text-center">
            {img.label}
          </div>
        </button>
      ))}
    </div>
  )
}

/** Recursively render any JSON value as plain key: value text.
 *  Parses \n in strings as real line breaks. No tags, badges, or boxes. */
function RenderValue({ label, value, accent, depth = 0 }: { label: string; value: any; accent?: string; depth?: number }) {
  if (value === null || value === undefined) return null
  const prettyLabel = label.replace(/_/g, ' ')

  // String / number / boolean → simple key: value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return <KV label={prettyLabel} value={String(value)} accent={accent} />

  // Array of primitives → pill chips
  if (Array.isArray(value) && value.length > 0 && value.every(v => typeof v !== 'object')) {
    return (
      <div className="py-1">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1.5">{prettyLabel}</p>
        <div className="flex flex-wrap gap-1">
          {value.map((item, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary/50 border border-border/30 text-foreground/80">{String(item)}</span>
          ))}
        </div>
      </div>
    )
  }

  // Array of objects → compact sub-blocks (one per item)
  if (Array.isArray(value) && value.length > 0) {
    return (
      <div className="py-1">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">{prettyLabel}</p>
        <div className="space-y-2 ml-0.5 border-l-2 border-border/20 pl-3">
          {value.map((item, i) => (
            <div key={i} className="rounded-lg bg-secondary/20 p-2 space-y-0.5">
              {typeof item === 'object' && item !== null
                ? Object.entries(item).map(([k, v]) => <RenderValue key={k} label={k} value={v} accent={accent} depth={depth + 1} />)
                : <span className="text-[12px] text-foreground/80">{String(item)}</span>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Nested object — recurse deeper
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (depth < 3) {
      return (
        <div className={cn('py-1', depth > 0 && 'ml-3 border-l border-border/10 pl-3')}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{prettyLabel}</span>
          <div className="mt-0.5 space-y-0.5">
            {Object.entries(value).map(([k, v]) => (
              <RenderValue key={k} label={k} value={v} accent={accent} depth={depth + 1} />
            ))}
          </div>
        </div>
      )
    }
    return <KV label={prettyLabel} value={JSON.stringify(value)} />
  }

  return null
}

/** Picks the best human-readable title from an object */
function bestTitle(obj: Record<string, any>, fallback: string): string {
  for (const key of [
    'display_name',
    'character_name',
    'location_name',
    'name_identifier',
    'name_id',
    'name',
    'title',
    'Name',
    'Title',
    'Name_Identifier',
    'shot_id',
    'id',
    'label',
  ]) {
    if (typeof obj[key] === 'string' && obj[key].length > 0) return obj[key]
  }
  if (obj.metadata && typeof obj.metadata === 'object') {
    if (obj.metadata.panel_number) return `Panel ${obj.metadata.panel_number}`
    if (obj.metadata.shot_summary) return obj.metadata.shot_summary
  }
  return fallback
}

/**
 * Fuzzy-match an entity name to an artifactRefs key.
 * e.g. "GAYATRI" matches "Gayatri", "RANI MAA" matches "Rani_Maa"
 */
function findRefImages(entityName: string, artifactRefs: Record<string, string[]>): string[] {
  if (!entityName || !artifactRefs) return []
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')
  const target = norm(entityName)
  for (const [key, urls] of Object.entries(artifactRefs)) {
    if (norm(key) === target) return urls
  }
  // Partial match: target contains key or key contains target
  for (const [key, urls] of Object.entries(artifactRefs)) {
    if (norm(key).includes(target) || target.includes(norm(key))) return urls
  }
  return []
}

/** Split an array into chunks of n */
function chunkArray<T>(arr: T[], n: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += n) chunks.push(arr.slice(i, i + n))
  return chunks
}

/** One renderer for every step — fully generic, reads whatever structure the DB sends.
 *  _artifactRefs  → grouped image cards per named entity
 *  _s3Uris        → flat image list (chunked into cards) when no artifactRefs
 *  Everything else → plain key: value text, multi-level deep */
function UniversalRenderer({ data, stepKey, approvedStepKeys = new Set(), onRequestEditCard }: {
  data: Record<string, any>; stepKey: string
  approvedStepKeys?: Set<string>
  onRequestEditCard?: (card: EditingCard) => void
}) {
  const p = getPalette(stepKey)
  const Icon = p.icon
  const stepName = stepDisplayName(stepKey)
  const isStepApproved = approvedStepKeys.has(stepKey)

  // ── Pull out image + text sources ──
  const artifactRefs: Record<string, string[]> = data._artifactRefs ?? {}
  // Only use flat s3Uris when there are no named artifactRefs groups
  const s3Uris: string[] = (Object.keys(artifactRefs).length === 0 ? (data._s3Uris ?? []) : [])
  const textBlobs: string[] = data._textBlobs ?? []

  const matchedRefKeys = new Set<string>()

  // ── Categorise top-level keys (skip internal _ keys) ──
  const scalars: [string, any][] = []
  const arrayOfObjects: [string, any[]][] = []
  const dictOfObjects: [string, Record<string, any>][] = []

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('_')) continue
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        arrayOfObjects.push([key, value])
      } else {
        scalars.push([key, value])
      }
    } else if (typeof value === 'object' && value !== null) {
      const vals = Object.values(value)
      if (vals.length > 0 && vals.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
        dictOfObjects.push([key, value as Record<string, any>])
      } else {
        scalars.push([key, value])
      }
    } else {
      scalars.push([key, value])
    }
  }

  const hasArtifactRefs = Object.keys(artifactRefs).length > 0
  const hasS3Uris = s3Uris.length > 0
  const hasTextBlobs = textBlobs.length > 0
  const hasDataBlobs = scalars.length > 0 || arrayOfObjects.length > 0 || dictOfObjects.length > 0
  const hasContent = hasDataBlobs || hasArtifactRefs || hasS3Uris || hasTextBlobs

  if (!hasContent) return <EmptyState icon={Icon} label={`No ${stepName} data`} sub="Content will appear when this step completes" />

  // ── Text-only steps (text_blob prompts with no JSON data) ──
  if (!hasDataBlobs && !hasArtifactRefs && !hasS3Uris && hasTextBlobs) {
    return (
      <div className="space-y-6">
        <SectionHeader icon={Icon} title={stepName} gradient={p.gradient} />
        <HScrollContainer>
          {textBlobs.map((text, idx) => (
            <StepCard key={idx} p={p} width={380} idx={idx}
              header={
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', p.bg)}>
                    <FileText className={cn('w-5 h-5', p.accent)} />
                  </div>
                  <span className="text-base font-bold text-foreground">
                    {stepName} {textBlobs.length > 1 ? `— ${idx + 1} / ${textBlobs.length}` : ''}
                  </span>
                </div>
              }>
              <div className="p-4 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
                <pre className="text-[12px] text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono">{text}</pre>
              </div>
            </StepCard>
          ))}
        </HScrollContainer>
      </div>
    )
  }

  // ── Image-only steps (no blob data) — show image cards directly ──
  if (!hasDataBlobs && !hasTextBlobs && (hasArtifactRefs || hasS3Uris)) {
    return (
      <div className="space-y-6">
        <SectionHeader icon={Icon} title={stepName} gradient={p.gradient} />

        {/* Named groups from artifactRefs */}
        {hasArtifactRefs && (
          <HScrollContainer>
            {Object.entries(artifactRefs).map(([name, urls], idx) => (
              <StepCard key={name} p={p} width={400} idx={idx}
                header={
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', p.bg)}>
                      <Icon className={cn('w-5 h-5', p.accent)} />
                    </div>
                    <span className="text-base font-bold text-foreground truncate max-w-[240px]">
                      {name.replace(/_/g, ' ')}
                    </span>
                  </div>
                }>
                <div className="p-3"><ImageGrid urls={urls} name={name} /></div>
              </StepCard>
            ))}
          </HScrollContainer>
        )}

        {/* Flat image list from s3_uris — chunk into cards of 4 */}
        {hasS3Uris && (
          <HScrollContainer>
            {chunkArray(s3Uris, 4).map((chunk, idx) => (
              <StepCard key={idx} p={p} width={400} idx={idx}
                header={
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', p.bg)}>
                      <ImageIcon className={cn('w-4 h-4', p.accent)} />
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {`Images ${idx * 4 + 1}–${idx * 4 + chunk.length}`}
                    </span>
                  </div>
                }>
                <div className="p-3"><ImageGrid urls={chunk} name={`image_${idx}`} /></div>
              </StepCard>
            ))}
          </HScrollContainer>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader icon={Icon} title={stepName} gradient={p.gradient} />

      {/* ── Top-level scalars → single overview card ── */}
      {scalars.length > 0 && (
        <HScrollContainer>
          <StepCard p={p} width={380} idx={0}
            onRequestEdit={!isStepApproved && onRequestEditCard ? () => onRequestEditCard({ cardTitle: 'Overview', cardData: Object.fromEntries(scalars), mergeType: 'top-level-keys' }) : undefined}
            header={<div className="flex items-center gap-3"><div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', p.bg)}><Icon className={cn('w-5 h-5', p.accent)} /></div><span className="text-base font-bold text-foreground">Overview</span></div>}>
            <div className="p-4 space-y-0.5">
              {scalars.map(([k, v]) => <RenderValue key={k} label={k} value={v} accent={p.accent} />)}
            </div>
          </StepCard>
        </HScrollContainer>
      )}

      {/* ── Array-of-objects → horizontal card scroller ── */}
      {arrayOfObjects.map(([arrKey, items]) => (
        <div key={arrKey}>
          <HScrollContainer>
            {items.map((item, idx) => {
              const title = bestTitle(item, `${arrKey.replace(/_/g, ' ')} ${idx + 1}`)
              const itemImages = hasArtifactRefs ? findRefImages(title, artifactRefs) : []
              if (itemImages.length > 0) {
                for (const k of Object.keys(artifactRefs)) {
                  if (findRefImages(title, { [k]: artifactRefs[k] }).length > 0) matchedRefKeys.add(k)
                }
              }
              return (
                <StepCard key={idx} p={p} width={arrKey === 'storyboard' ? 420 : 400} idx={idx}
                  onRequestEdit={!isStepApproved && onRequestEditCard ? () => onRequestEditCard({ cardTitle: title, cardData: item, mergeType: 'array-item', parentKey: arrKey, arrayIndex: idx }) : undefined}
                  header={<div className="flex items-center gap-3"><div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', p.bg)}><span className={cn('text-xs font-black', p.accent)}>{idx + 1}</span></div><span className="text-base font-bold text-foreground truncate max-w-[300px]">{title}</span></div>}>
                  <div className="p-4 space-y-0.5 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
                    {Object.entries(item).map(([k, v]) => <RenderValue key={k} label={k} value={v} accent={p.accent} />)}
                    {itemImages.length > 0 && <ImageGrid urls={itemImages} name={title} />}
                  </div>
                </StepCard>
              )
            })}
          </HScrollContainer>
        </div>
      ))}

      {/* ── Dict-of-objects → horizontal card scroller with inline images ── */}
      {dictOfObjects.map(([dictKey, entries]) => {
        const keys = Object.keys(entries)
        return (
          <div key={dictKey}>
            <HScrollContainer>
              {keys.map((entryKey, idx) => {
                const entry = entries[entryKey]
                const title = bestTitle(entry, entryKey)
                const entryImages = hasArtifactRefs
                  ? findRefImages(entryKey, artifactRefs).length > 0
                    ? findRefImages(entryKey, artifactRefs)
                    : findRefImages(title, artifactRefs)
                  : []
                if (entryImages.length > 0) {
                  for (const k of Object.keys(artifactRefs)) {
                    if (findRefImages(entryKey, { [k]: artifactRefs[k] }).length > 0 ||
                        findRefImages(title, { [k]: artifactRefs[k] }).length > 0) matchedRefKeys.add(k)
                  }
                }
                return (
                  <StepCard key={entryKey} p={p} width={360} idx={idx}
                    onRequestEdit={!isStepApproved && onRequestEditCard ? () => onRequestEditCard({ cardTitle: title, cardData: entry, mergeType: 'dict-entry', parentKey: dictKey, dictKey: entryKey }) : undefined}
                    header={
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', p.bg)}>
                          <span className={cn('text-sm font-black', p.accent)}>{idx + 1}</span>
                        </div>
                        <span className="text-base font-bold text-foreground truncate max-w-[280px]">{title}</span>
                      </div>
                    }>
                    <div className="p-4 space-y-0.5 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
                      {entryImages.length > 0 && <ImageGrid urls={entryImages} name={title} />}
                      {Object.entries(entry).map(([k, v]) => <RenderValue key={k} label={k} value={v} accent={p.accent} />)}
                    </div>
                  </StepCard>
                )
              })}
            </HScrollContainer>
          </div>
        )
      })}

      {/* ── Text blobs alongside data ── */}
      {hasTextBlobs && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className={p.accent} />
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', p.accent)}>Prompt Files</span>
            <span className="text-[11px] text-muted-foreground">{textBlobs.length}</span>
          </div>
          <HScrollContainer>
            {textBlobs.map((text, idx) => (
              <StepCard key={idx} p={p} width={380} idx={idx}
                header={
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', p.bg)}>
                      <FileText className={cn('w-4 h-4', p.accent)} />
                    </div>
                    <span className="text-sm font-bold text-foreground">File {idx + 1} of {textBlobs.length}</span>
                  </div>
                }>
                <div className="p-4 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
                  <pre className="text-[12px] text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono">{text}</pre>
                </div>
              </StepCard>
            ))}
          </HScrollContainer>
        </div>
      )}

      {/* ── Unmatched artifactRefs → image cards at bottom ── */}
      {hasArtifactRefs && (() => {
        const unmatched = Object.entries(artifactRefs).filter(([k]) => !matchedRefKeys.has(k))
        if (unmatched.length === 0) return null
        return (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={14} className={p.accent} />
              <span className={cn('text-[11px] font-bold uppercase tracking-wider', p.accent)}>Images</span>
            </div>
            <HScrollContainer>
              {unmatched.map(([name, urls], idx) => (
                <StepCard key={name} p={p} width={400} idx={idx}
                  header={
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', p.bg)}>
                        <ImageIcon className={cn('w-4 h-4', p.accent)} />
                      </div>
                      <span className="text-sm font-bold text-foreground truncate max-w-[240px]">
                        {name.replace(/_/g, ' ')}
                      </span>
                    </div>
                  }>
                  <div className="p-3"><ImageGrid urls={urls} name={name} /></div>
                </StepCard>
              ))}
            </HScrollContainer>
          </div>
        )
      })()}
    </div>
  )
}

function LockedStepPlaceholder({ stepKey, stepName, canGenerate }: {
  stepKey: string; stepName: string; canGenerate?: boolean
}) {
  const p = getPalette(stepKey); const Icon = p.icon
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[320px] gap-5">
      <div className={cn('p-5 rounded-2xl border', p.bgSoft, p.borderSoft)}>
        <div className="relative">
          <Icon className={cn('w-10 h-10', p.accent, 'opacity-40')} />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border/50 flex items-center justify-center">
            <Lock size={10} className="text-muted-foreground/60" />
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">{stepName}</p>
        <p className="text-sm text-muted-foreground mt-1.5">
          {canGenerate ? 'Starting generation automatically…' : 'Waiting for previous steps to be approved…'}
        </p>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/30">
        <Clock size={11} className="text-muted-foreground/50 animate-pulse" />
        <span className="text-[11px] text-muted-foreground/60">
          {canGenerate ? 'Pipeline starting…' : 'Approve the previous step to continue'}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Entity Page Renderer (Characters / Locations merged view) ─

function EntityPageRenderer({ data, tabKey, approvedStepKeys = new Set(), onIterateImage, onRequestEditCard }: {
  data: Record<string, any>; tabKey: string
  approvedStepKeys?: Set<string>
  onIterateImage?: (payload: {
    stepKey: string
    anchorStepKey?: string
    referenceStepKey?: string
    imageType: 'anchor' | 'reference'
    image: LabeledImage
    entityName: string
    sectionLabel: string
  }) => void
  onRequestEditCard?: (card: EditingCard) => void
}) {
  const template = STEP_DISPLAY_TEMPLATE.find(t => t.tabKey === tabKey)
  if (!template) return null

  // Per entity-page layout: stepKeys[0]=description, [1]=anchor, [2]=reference-images
  const descriptionStepKey = template.stepKeys[0]
  const anchorStepKey = template.stepKeys[1]
  const viewPackStepKey = template.stepKeys[2]
  const descriptionApproved = approvedStepKeys.has(descriptionStepKey)
  const anchorApproved = anchorStepKey ? approvedStepKeys.has(anchorStepKey) : false
  const viewPackApproved = viewPackStepKey ? approvedStepKeys.has(viewPackStepKey) : false

  const p = getPalette(tabKey)
  const Icon = template.icon
  const entityKey = template.entityKey || ''
  const rawEntities = data[entityKey]

  // Image data from merged steps
  const anchorRefs: Record<string, string[]> = data._anchorRefs ?? {}
  const anchorS3: string[] = data._anchorS3 ?? []
  const viewPackRefs: Record<string, string[]> = data._viewPackRefs ?? {}
  const viewPackS3: string[] = data._viewPackS3 ?? []

  // Rich structured assets (with labels like "Anchor Full", "Front Closeup", etc.)
  const richAnchorAssets: RichEntityAssets[] = data._richAnchorAssets ?? []
  const richViewPackAssets: RichEntityAssets[] = data._richViewPackAssets ?? []

  // Normalise entities to [{ name, props }]
  let entities: Array<{ name: string; props: Record<string, any> }> = []
  if (Array.isArray(rawEntities)) {
    entities = rawEntities.map((item, i) => ({
      name: String(
        item?.display_name ||
        item?.character_name ||
        item?.location_name ||
        item?.name ||
        item?.name_identifier ||
        item?.name_id ||
        bestTitle(item, `${entityKey.replace(/_/g, ' ')} ${i + 1}`)
      ),
      props: item,
    }))
  } else if (rawEntities && typeof rawEntities === 'object') {
    entities = Object.entries(rawEntities).map(([key, val]) => ({
      name: key.replace(/_/g, ' '),
      props: val as Record<string, any>,
    }))
  }

  if (entities.length === 0 && anchorS3.length === 0 && viewPackS3.length === 0) {
    return <EmptyState icon={Icon} label={`No ${template.label} data`} sub="Content will appear when this step completes" />
  }

  // Helper: get anchor images for an entity
  const getAnchorImages = (name: string): LabeledImage[] | string[] => {
    const rich = richAnchorAssets.find(r => r.entityName.toLowerCase() === name.toLowerCase())
    if (rich) return rich.images
    const refs = findRefImages(name, anchorRefs)
    if (refs.length > 0) return refs
    return []
  }

  // Helper: get reference images for an entity
  const getViewPackImages = (name: string): LabeledImage[] | string[] => {
    const rich = richViewPackAssets.find(r => r.entityName.toLowerCase() === name.toLowerCase())
    if (rich) return rich.images
    const refs = findRefImages(name, viewPackRefs)
    if (refs.length > 0) return refs
    return []
  }

  return (
    <div className="space-y-6">
      <SectionHeader icon={Icon} title={template.label} gradient={p.gradient} />

      {/* ── Unified entity cards: description + anchor + viewpack in one ── */}
      <HScrollContainer>
        {entities.map((entity, idx) => {
          const anchorImgs = getAnchorImages(entity.name)
          const viewPackImgs = getViewPackImages(entity.name)
          const hasDescription = !!entity.props && Object.keys(entity.props).length > 0

          return (
            <StepCard key={entity.name} p={p} width={420} idx={idx}
              isApproved={descriptionApproved}
              onRequestEdit={!descriptionApproved && onRequestEditCard ? () => onRequestEditCard({ cardTitle: entity.name, cardData: entity.props, mergeType: 'array-item', parentKey: entityKey, arrayIndex: idx }) : undefined}
              header={
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', p.bg)}>
                    <span className={cn('text-sm font-black', p.accent)}>{idx + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-base font-bold text-foreground block truncate cursor-help">{entity.name}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {entity.name}
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{entityKey.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              }>
              <div className="overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
                {/* ── Description ─────────────────────────── */}
                {hasDescription && (
                  <div className="px-4 pt-4 pb-4 space-y-1">
                    <div className="flex items-center gap-2 mb-3 pb-2">
                      <FileText size={14} className={p.accent} />
                      <span className="text-[14px] font-bold tracking-tight text-foreground">Description</span>
                    </div>
                    {Object.entries(entity.props).map(([k, v]) => (
                      <RenderValue key={k} label={k} value={v} accent={p.accent} />
                    ))}
                  </div>
                )}

                {/* ── Anchor Images ────────────────────────── */}
                {anchorImgs.length > 0 && (
                  <div className="px-4 pb-4 pt-3">
                    <div className="flex items-center gap-2 mb-3 pb-2">
                      <ImageIcon size={14} className={p.accent} />
                      <span className="text-[14px] font-bold tracking-tight text-foreground">Anchor Images</span>
                    </div>
                    {Array.isArray(anchorImgs) && typeof anchorImgs[0] === 'object' && 'label' in (anchorImgs[0] as any)
                      ? <LabeledImageGrid
                          images={anchorImgs as LabeledImage[]}
                          isAnchor={true}
                          onIterateImage={anchorStepKey && !anchorApproved
                            ? (image) => onIterateImage?.({
                                stepKey: anchorStepKey,
                                anchorStepKey,
                                referenceStepKey: viewPackStepKey,
                                imageType: 'anchor',
                                image,
                                entityName: entity.name,
                                sectionLabel: 'Anchor Images',
                              })
                            : undefined
                          }
                        />
                      : <LabeledImageGrid
                          images={(anchorImgs as string[]).map((url, i) => ({ url, label: `Anchor ${i + 1}` }))}
                          isAnchor={true}
                          onIterateImage={anchorStepKey && !anchorApproved
                            ? (image) => onIterateImage?.({
                                stepKey: anchorStepKey,
                                anchorStepKey,
                                referenceStepKey: viewPackStepKey,
                                imageType: 'anchor',
                                image,
                                entityName: entity.name,
                                sectionLabel: 'Anchor Images',
                              })
                            : undefined
                          }
                        />
                    }
                  </div>
                )}

                {/* ── Reference Images ─────────────────────── */}
                {viewPackImgs.length > 0 && (
                  <div className="px-4 pb-4 pt-3">
                    <div className="flex items-center gap-2 mb-3 pb-2">
                      <Layers size={14} className={p.accent} />
                      <span className="text-[14px] font-bold tracking-tight text-foreground">Reference Images</span>
                    </div>
                    {Array.isArray(viewPackImgs) && typeof viewPackImgs[0] === 'object' && 'label' in (viewPackImgs[0] as any)
                      ? <CollageImageGridLabeled
                          images={viewPackImgs as LabeledImage[]}
                          onIterateImage={viewPackStepKey && !viewPackApproved
                            ? (image) => onIterateImage?.({
                                stepKey: viewPackStepKey,
                                anchorStepKey,
                                referenceStepKey: viewPackStepKey,
                                imageType: 'reference',
                                image,
                                entityName: entity.name,
                                sectionLabel: 'Reference Images',
                              })
                            : undefined
                          }
                        />
                      : <CollageImageGridLabeled
                          images={(viewPackImgs as string[]).map((url, i) => ({ url, label: `Reference ${i + 1}` }))}
                          onIterateImage={viewPackStepKey && !viewPackApproved
                            ? (image) => onIterateImage?.({
                                stepKey: viewPackStepKey,
                                anchorStepKey,
                                referenceStepKey: viewPackStepKey,
                                imageType: 'reference',
                                image,
                                entityName: entity.name,
                                sectionLabel: 'Reference Images',
                              })
                            : undefined
                          }
                        />
                    }
                  </div>
                )}
              </div>
            </StepCard>
          )
        })}
      </HScrollContainer>

      {/* Flat anchor/viewpack images not mapped to any entity (fallback) */}
      {anchorS3.length > 0 && Object.keys(anchorRefs).length === 0 && richAnchorAssets.length === 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={14} className={p.accent} />
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', p.accent)}>Anchor Images</span>
          </div>
          <HScrollContainer>
            {chunkArray(anchorS3, 3).map((chunk, i) => (
              <StepCard key={i} p={p} width={380} idx={i}
                header={
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', p.bg)}>
                      <ImageIcon className={cn('w-4 h-4', p.accent)} />
                    </div>
                    <span className="text-sm font-bold text-foreground">{`Anchor ${i * 3 + 1}–${i * 3 + chunk.length}`}</span>
                  </div>
                }>
                <div className="p-3 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
                  <LabeledImageGrid
                    images={chunk.map((url, idx) => ({ url, label: `Anchor ${i * 3 + idx + 1}` }))}
                    isAnchor={true}
                    onIterateImage={anchorStepKey && !anchorApproved
                      ? (image) => onIterateImage?.({
                          stepKey: anchorStepKey,
                          anchorStepKey,
                          referenceStepKey: viewPackStepKey,
                          imageType: 'anchor',
                          image,
                          entityName: template.label,
                          sectionLabel: 'Anchor Images',
                        })
                      : undefined
                    }
                  />
                </div>
              </StepCard>
            ))}
          </HScrollContainer>
        </div>
      )}

      {viewPackS3.length > 0 && Object.keys(viewPackRefs).length === 0 && richViewPackAssets.length === 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={14} className={p.accent} />
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', p.accent)}>Reference Images</span>
          </div>
          <HScrollContainer>
            {chunkArray(viewPackS3, 3).map((chunk, i) => (
              <StepCard key={i} p={p} width={380} idx={i}
                header={
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', p.bg)}>
                      <ImageIcon className={cn('w-4 h-4', p.accent)} />
                    </div>
                    <span className="text-sm font-bold text-foreground">{`Reference ${i * 3 + 1}–${i * 3 + chunk.length}`}</span>
                  </div>
                }>
                <div className="p-3 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
                  <CollageImageGridLabeled
                    images={chunk.map((url, idx) => ({ url, label: `Reference ${i * 3 + idx + 1}` }))}
                    onIterateImage={viewPackStepKey && !viewPackApproved
                      ? (image) => onIterateImage?.({
                          stepKey: viewPackStepKey,
                          anchorStepKey,
                          referenceStepKey: viewPackStepKey,
                          imageType: 'reference',
                          image,
                          entityName: template.label,
                          sectionLabel: 'Reference Images',
                        })
                      : undefined
                    }
                  />
                </div>
              </StepCard>
            ))}
          </HScrollContainer>
        </div>
      )}
    </div>
  )
}

// ─── Shots Renderer (independent `shots` table) ───────────────

function ShotsRenderer({ data, executionId, onEditShot, onIterateShot, onApproveShots, approvingShots, tabStatus }: {
  data: Record<string, any>
  executionId: string
  onEditShot?: (shot: ShotOut) => void
  onIterateShot?: (shot: ShotOut) => void
  onApproveShots?: () => void
  approvingShots?: boolean
  tabStatus?: string
}) {
  const p = getPalette('shots')
  const Icon = Clapperboard

  type ShotGroup = { shotId: string; versions: ShotOut[] }
  const [groups, setGroups] = useState<ShotGroup[]>([])
  const [loadingAll, setLoadingAll] = useState(true)
  const [approvingDocId, setApprovingDocId] = useState<string | null>(null)
  const isStepApproved = tabStatus === 'approved'

  // Load ALL versions for all shots in one call
  useEffect(() => {
    let alive = true
    setLoadingAll(true)
    apiClient.getWorkflowShots(executionId, { latest_only: false })
      .then(all => {
        if (!alive) return
        const map = new Map<string, ShotOut[]>()
        all.forEach(s => {
          const arr = map.get(s.shotId) ?? []
          arr.push(s)
          map.set(s.shotId, arr)
        })
        const grps: ShotGroup[] = [...map.entries()].map(([shotId, vs]) => ({
          shotId,
          // approved version always first, then latest-first within unapproved
          versions: [...vs].sort((a, b) => {
            if (a.isApproved !== b.isApproved) return a.isApproved ? -1 : 1
            return b.version - a.version
          }),
        }))
        grps.sort((a, b) => (a.versions[0]?.sequenceNo ?? 0) - (b.versions[0]?.sequenceNo ?? 0))
        setGroups(grps)
      })
      .catch(() => {
        if (!alive) return
        const shots: ShotOut[] = data._shots ?? []
        const map = new Map<string, ShotOut[]>()
        shots.forEach(s => { map.set(s.shotId, [s]) })
        setGroups([...map.entries()].map(([shotId, versions]) => ({ shotId, versions })))
      })
      .finally(() => { if (alive) setLoadingAll(false) })
    return () => { alive = false }
  }, [executionId, data._shots])

  if (loadingAll && groups.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader icon={Icon} title="Shots" gradient={p.gradient} />
        <SkeletonCards count={6} />
      </div>
    )
  }
  if (groups.length === 0) {
    if (tabStatus === 'locked' || tabStatus === 'ready') {
      return <LockedStepPlaceholder stepKey="generate_images_nano_banana" stepName="Shots" canGenerate={tabStatus === 'ready'} />
    }
    if (tabStatus === 'running') {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[320px] gap-5">
          <div className={cn('p-5 rounded-2xl border', getPalette('shots').bgSoft, getPalette('shots').borderSoft)}>
            <Loader2 className={cn('w-10 h-10 text-accent animate-spin')} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">Generating Shots…</p>
            <p className="text-sm text-muted-foreground mt-1.5">Your shots are being created. This may take a moment.</p>
          </div>
        </motion.div>
      )
    }
    return <EmptyState icon={Icon} label="No Shots data" sub="Content will appear from the shots collection" />
  }

  const handleApprove = async (shot: ShotOut) => {
    setApprovingDocId(shot.id)
    try {
      await apiClient.approveShot(executionId, shot.id)
      // Re-fetch all shots fresh from server to guarantee correct isApproved state
      const all = await apiClient.getWorkflowShots(executionId, { latest_only: false })
      const map = new Map<string, ShotOut[]>()
      all.forEach(s => { const arr = map.get(s.shotId) ?? []; arr.push(s); map.set(s.shotId, arr) })
      const grps: ShotGroup[] = [...map.entries()].map(([shotId, vs]) => ({
        shotId,
        versions: [...vs].sort((a, b) => {
          if (a.isApproved !== b.isApproved) return a.isApproved ? -1 : 1
          return b.version - a.version
        }),
      }))
      grps.sort((a, b) => (a.versions[0]?.sequenceNo ?? 0) - (b.versions[0]?.sequenceNo ?? 0))
      setGroups(grps)
    } catch (e) {
      console.error('Shot approve failed:', e)
    } finally {
      setApprovingDocId(null)
    }
  }

  const handleUnapprove = async (shot: ShotOut) => {
    setApprovingDocId(shot.id)
    try {
      await apiClient.unapproveShot(executionId, shot.id)
      const all = await apiClient.getWorkflowShots(executionId, { latest_only: false })
      const map = new Map<string, ShotOut[]>()
      all.forEach(s => { const arr = map.get(s.shotId) ?? []; arr.push(s); map.set(s.shotId, arr) })
      const grps: ShotGroup[] = [...map.entries()].map(([shotId, vs]) => ({
        shotId,
        versions: [...vs].sort((a, b) => {
          if (a.isApproved !== b.isApproved) return a.isApproved ? -1 : 1
          return b.version - a.version
        }),
      }))
      grps.sort((a, b) => (a.versions[0]?.sequenceNo ?? 0) - (b.versions[0]?.sequenceNo ?? 0))
      setGroups(grps)
    } catch (e) {
      console.error('Shot unapprove failed:', e)
    } finally {
      setApprovingDocId(null)
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader icon={Icon} title="Shots" gradient={p.gradient} />
      <HScrollContainer>
        {groups.map((group, colIdx) => {
          const latest = group.versions[0]
          const shotNum = latest?.shotMetadata?.shotNumber ?? latest?.sequenceNo ?? colIdx + 1

          return (
            <div
              key={group.shotId}
              className="flex-shrink-0 flex flex-col gap-2 self-start"
              style={{ width: 370 }}
            >
              {/* ── Shot heading + intent title ── */}
              <div className="px-3 py-2 rounded-lg bg-secondary/60 border border-border/20 h-[110px] flex flex-col">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-black/30 flex items-center justify-center flex-shrink-0">
                    <Clapperboard size={13} className="text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Shot {shotNum}</p>
                  <span className="ml-auto text-[10px] font-bold text-foreground/60 bg-secondary rounded-md px-1.5 py-0.5">{group.versions.length} ver</span>
                </div>
                <div className="flex-1 min-h-0 mt-1.5 pl-[34px] overflow-hidden">
                  {latest?.oneLinerShotIntent ? (
                    <p className="text-[13px] font-medium text-foreground/80 leading-snug line-clamp-3">
                      {latest.oneLinerShotIntent}
                    </p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground/40 italic">No description</p>
                  )}
                </div>
              </div>

              {/* ── All versions (flat, no collapsible) ── */}
              {group.versions.map((shot) => {
                const isApproving = approvingDocId === shot.id
                const isApproved = shot.isApproved
                return (
                  <div key={shot.id} className="rounded-xl overflow-hidden border border-border/30 bg-card/80 shadow-sm">
                    {shot.startImage?.awsUrl ? (
                      <div className="relative group">
                        <S3Image
                          url={shot.startImage.awsUrl}
                          label={`Shot ${shotNum} v${shot.version}`}
                          className="w-full block"
                        />
                        {/* Top gradient: version badge + approved */}
                        <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-2.5 pt-2.5 pb-8"
                          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/50 text-white/80">v{shot.version}</span>
                            {isApproved && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-lg bg-emerald-500/70 text-white">
                                <CheckCircle size={14} />
                                Approved
                              </span>
                            )}
                          </div>
                          {/* Edit + Iterate buttons */}
                          {!isStepApproved && (onEditShot || onIterateShot) && (
                            <div className="flex items-center gap-1">
                              {onEditShot && (
                                <button
                                  onClick={() => onEditShot(shot)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 hover:bg-amber-500/70 backdrop-blur-sm border border-white/15 text-white text-[10px] font-semibold transition-all"
                                >
                                  <Pencil size={10} /> Edit
                                </button>
                              )}
                              {onIterateShot && (
                                <button
                                  onClick={() => onIterateShot(shot)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 hover:bg-violet-500/70 backdrop-blur-sm border border-white/15 text-white text-[10px] font-semibold transition-all"
                                >
                                  <RefreshCw size={10} /> Iterate
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Bottom hover gradient: approve */}
                        {!isApproved && !isStepApproved && (
                          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-end px-2.5 pb-2.5 pt-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
                            <button
                              onClick={() => handleApprove(shot)}
                              disabled={isApproving}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/70 hover:bg-emerald-500/90 backdrop-blur-sm border border-emerald-400/30 text-white text-xs font-semibold transition-all disabled:opacity-50"
                            >
                              {isApproving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                              Approve
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative flex flex-col">
                        <div className="flex items-center justify-center h-40 bg-muted/10">
                          <p className="text-[11px] text-muted-foreground/40">Pending</p>
                        </div>
                        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2.5 pt-2.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">v{shot.version}</span>
                          {(onEditShot || onIterateShot) && (
                            <div className="flex items-center gap-1">
                              {onEditShot && (
                                <button
                                  onClick={() => onEditShot(shot)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 border border-border/30 text-foreground/70 text-[10px] font-semibold transition-all"
                                >
                                  <Pencil size={10} /> Edit
                                </button>
                              )}
                              {onIterateShot && (
                                <button
                                  onClick={() => onIterateShot(shot)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 border border-border/30 text-foreground/70 text-[10px] font-semibold transition-all"
                                >
                                  <RefreshCw size={10} /> Iterate
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </HScrollContainer>
    </div>
  )
}

// ─── AnimationsRenderer (independent `clips` table) ──────────

function AnimationsRenderer({ data, executionId, onEditClip, onIterateClip, tabStatus }: { data: Record<string, any>; executionId: string; onEditClip?: (clip: ClipOut) => void; onIterateClip?: (clip: ClipOut) => void; tabStatus?: string }) {
  const p = getPalette('animations')
  const Icon = PlayCircle

  type ClipGroup = { clipId: string; versions: ClipOut[] }
  const [groups, setGroups] = useState<ClipGroup[]>([])
  const [loadingAll, setLoadingAll] = useState(true)
  const [selectedClip, setSelectedClip] = useState<ClipOut | null>(null)

  useEffect(() => {
    let alive = true
    setLoadingAll(true)
    apiClient.getWorkflowClips(executionId, { latest_only: false })
      .then(all => {
        if (!alive) return
        const map = new Map<string, ClipOut[]>()
        all.forEach(c => {
          const arr = map.get(c.clipId) ?? []
          arr.push(c)
          map.set(c.clipId, arr)
        })
        const grps: ClipGroup[] = [...map.entries()].map(([clipId, vs]) => ({
          clipId,
          versions: [...vs].sort((a, b) => b.version - a.version),
        }))
        grps.sort((a, b) => (a.versions[0]?.sequenceNo ?? 0) - (b.versions[0]?.sequenceNo ?? 0))
        setGroups(grps)
      })
      .catch(() => {
        if (!alive) return
        const clips: ClipOut[] = data._clips ?? []
        const map = new Map<string, ClipOut[]>()
        clips.forEach(c => { map.set(c.clipId, [c]) })
        setGroups([...map.entries()].map(([clipId, versions]) => ({ clipId, versions })))
      })
      .finally(() => { if (alive) setLoadingAll(false) })
    return () => { alive = false }
  }, [executionId, data._clips])

  if (loadingAll && groups.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader icon={Icon} title="Animations" gradient={p.gradient} />
        <SkeletonCards count={6} />
      </div>
    )
  }
  if (groups.length === 0) {
    if (tabStatus === 'locked' || tabStatus === 'ready') {
      return <LockedStepPlaceholder stepKey="generate_animations" stepName="Animations" canGenerate={tabStatus === 'ready'} />
    }
    if (tabStatus === 'running') {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[320px] gap-5">
          <div className={cn('p-5 rounded-2xl border', getPalette('animations').bgSoft, getPalette('animations').borderSoft)}>
            <Loader2 className={cn('w-10 h-10 text-accent animate-spin')} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">Generating Animations…</p>
            <p className="text-sm text-muted-foreground mt-1.5">Your animations are being created. This may take a moment.</p>
          </div>
        </motion.div>
      )
    }
    return <EmptyState icon={Icon} label="No Animations yet" sub="Content will appear from the clips collection" />
  }


  return (
    <div className="space-y-4">
      <SectionHeader icon={Icon} title="Animations" gradient={p.gradient} />
      <HScrollContainer>
        {groups.map((group, colIdx) => {
          const latest = group.versions[0]
          const seqNo = latest?.sequenceNo ?? colIdx + 1

          return (
            <div
              key={group.clipId}
              className="flex-shrink-0 flex flex-col gap-2 self-start"
              style={{ width: 370 }}
            >
              {/* ── Clip heading ── */}
              <div className="px-3 py-2 rounded-lg bg-secondary/60 border border-border/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-black/30 flex items-center justify-center flex-shrink-0">
                    <PlayCircle size={13} className="text-violet-400" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Clip {seqNo}</p>
                  <span className="ml-auto text-[10px] font-bold text-foreground/60 bg-secondary rounded-md px-1.5 py-0.5">{group.versions.length} ver</span>
                </div>
              </div>

              {/* ── All versions — click to open detail modal ── */}
              {group.versions.map((clip) => {
                return (
                  <div
                    key={clip.id}
                    className="rounded-xl overflow-hidden border border-border/30 bg-card/80 shadow-sm cursor-pointer hover:border-violet-500/40 transition-colors"
                    onClick={() => setSelectedClip(clip)}
                  >
                    <div className="relative">
                      {/* Top gradient: version badge + buttons */}
                      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between px-2.5 pt-2.5 pb-8"
                        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/50 text-white/80">v{clip.version}</span>
                        </div>
                        {(onEditClip || onIterateClip) && (
                          <div className="flex items-center gap-1">
                            {onEditClip && (
                              <button
                                onClick={e => { e.stopPropagation(); onEditClip(clip) }}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 hover:bg-amber-500/70 backdrop-blur-sm border border-white/15 text-white text-[10px] font-semibold transition-all"
                              >
                                <Pencil size={10} /> Edit
                              </button>
                            )}
                            {onIterateClip && (
                              <button
                                onClick={e => { e.stopPropagation(); onIterateClip(clip) }}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 hover:bg-violet-500/70 backdrop-blur-sm border border-white/15 text-white text-[10px] font-semibold transition-all"
                              >
                                <RefreshCw size={10} /> Iterate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {clip.clipOutput?.awsUrl ? (
                        <OptimizedVideo
                          src={clip.clipOutput.awsUrl}
                          className="w-full block"
                          autoPlay={false}
                          muted
                          loop
                          controls={false}
                          preload="metadata"
                          objectFit="contain"
                          playOnHover
                        />
                      ) : (
                        <div className="flex items-center justify-center h-40 bg-muted/10">
                          <p className="text-[11px] text-muted-foreground/40">Click to view</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </HScrollContainer>

      {/* ── Clip detail modal ─────────────────────────────────── */}
      {selectedClip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedClip(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-card rounded-2xl overflow-hidden shadow-2xl border border-border/30"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-black/30 flex items-center justify-center flex-shrink-0">
                  <PlayCircle size={13} className="text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-foreground">Clip {selectedClip.sequenceNo}</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">v{selectedClip.version}</span>
              </div>
              <button
                onClick={() => setSelectedClip(null)}
                className="p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Video player */}
            <div className="bg-black">
              {selectedClip.clipOutput?.awsUrl ? (
                <OptimizedVideo
                  src={selectedClip.clipOutput.awsUrl}
                  className="w-full max-h-[62vh]"
                  controls
                  autoPlay={false}
                  muted
                  preload="auto"
                  objectFit="contain"
                />
              ) : (
                <div className="flex items-center justify-center h-56 bg-muted/10">
                  <p className="text-sm text-muted-foreground/50">No video available</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="px-4 py-3 flex items-center gap-2 justify-end border-t border-border/20">
              <button
                onClick={() => { onEditClip?.(selectedClip); setSelectedClip(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-amber-500/20 border border-border/30 hover:border-amber-500/40 text-sm font-medium transition-all"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={() => { onIterateClip?.(selectedClip); setSelectedClip(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-violet-500/20 border border-border/30 hover:border-violet-500/40 text-sm font-medium transition-all"
              >
                <RefreshCw size={13} /> Iterate
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Auto-resize textarea ─────────────────────────────────────

function AutoResizeTextarea({ value, onChange, className, minRows = 2, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value as string}
      onChange={onChange}
      rows={minRows}
      className={cn('resize-none overflow-hidden', className)}
      {...props}
    />
  )
}

// ─── AI Right Panel (task-based — no default tabs) ────────────

type PanelTask =
  | { mode: 'edit'; targetType: 'shot'; item: ShotOut; label: string }
  | { mode: 'iterate'; targetType: 'shot'; item: ShotOut; label: string }
  | { mode: 'edit'; targetType: 'clip'; item: ClipOut; label: string }
  | { mode: 'iterate'; targetType: 'clip'; item: ClipOut; label: string }
  | {
      mode: 'iterate'
      targetType: 'entity-image'
      item: {
        stepKey: string
        anchorStepKey?: string
        referenceStepKey?: string
        imageType: 'anchor' | 'reference'
        imageUrl: string
        imageLabel: string
        entityName: string
        sectionLabel: string
      }
      label: string
    }
  | { mode: 'edit'; targetType: 'card'; card: EditingCard; label: string }
  | null

/** s3://bucket/key → https://bucket.s3.amazonaws.com/key (pass-through for non-S3 URIs) */
function s3UriToHttp(url: string): string {
  if (!url || !url.startsWith('s3://')) return url
  const rest = url.slice(5)
  const slash = rest.indexOf('/')
  if (slash < 0) return url
  return `https://${rest.slice(0, slash)}.s3.amazonaws.com/${rest.slice(slash + 1)}`
}

/** https://bucket.s3[.region].amazonaws.com/key → s3://bucket/key (pass-through for others) */
function httpToS3Uri(url: string): string {
  const m = url.match(/^https?:\/\/([^.]+)\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com\/(.+)$/i)
  return m ? `s3://${m[1]}/${m[2]}` : url
}

function AIRightPanel({ executionId, orgId, projectId, episodeId, partId, isOpen, onToggle, panelTask, onCancelTask, onSaveEditCard, bibleData }: {
  executionId: string
  orgId?: string; projectId?: string; episodeId?: string; partId?: string
  isOpen: boolean; onToggle: () => void
  panelTask: PanelTask
  onCancelTask: () => void
  onSaveEditCard?: (card: EditingCard, data: Record<string, any>) => Promise<void>
  bibleData?: Record<string, any> | null
}) {
  // ── Shot/Clip edit draft state ──
  const [editDraft, setEditDraft] = useState<Record<string, string>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editSaveError, setEditSaveError] = useState<string | null>(null)

  // ── Iterate prompt state ──
  const [iteratePrompt, setIteratePrompt] = useState('')
  const [iterateSending, setIterateSending] = useState(false)

  // ── Card edit state ──
  const [panelEditFields, setPanelEditFields] = useState<PanelEditField[]>([])
  const [panelEditSaving, setPanelEditSaving] = useState(false)
  const [panelEditSaveError, setPanelEditSaveError] = useState<string | null>(null)

  // Editable ref state (seeded from panelTask, mutated by drag-drop + delete)
  const [charRefs, setCharRefs] = useState<Array<{awsUrl: string; displayName: string}>>([])
  const [locRefs, setLocRefs] = useState<Array<{awsUrl: string; displayName: string}>>([])
  const [clipInputImgs, setClipInputImgs] = useState<Array<{awsUrl: string; displayName: string}>>([])
  const [charDragOver, setCharDragOver] = useState(false)
  const [locDragOver, setLocDragOver] = useState(false)
  const [clipImgDragOver, setClipImgDragOver] = useState(false)

  const viewImage = React.useContext(ImageViewCtx)

  // Reset edit draft when panelTask changes
  useEffect(() => {
    setEditSaveError(null)
    setIteratePrompt('')
    setPanelEditSaveError(null)
    if (!panelTask) { setEditDraft({}); setPanelEditFields([]); setCharRefs([]); setLocRefs([]); setClipInputImgs([]); return }

    if (panelTask.targetType === 'shot' && panelTask.mode === 'edit') {
      const shot = panelTask.item
      setEditDraft({ startImagePrompt: shot.startImagePrompt ?? '' })
      setCharRefs((shot.characterReferences ?? []).map(r => ({ awsUrl: r.awsUrl ?? '', displayName: r.displayName ?? 'Image' })))
      setLocRefs((shot.locationReferences ?? []).map(r => ({ awsUrl: r.awsUrl ?? '', displayName: r.displayName ?? 'Image' })))
      setClipInputImgs([])
    } else if (panelTask.targetType === 'clip' && panelTask.mode === 'edit') {
      const clip = panelTask.item
      setEditDraft({ animationPrompt: clip.animationPrompt ?? '' })
      setClipInputImgs((clip.inputImages ?? []).map(img => ({ awsUrl: img.awsUrl ?? '', displayName: img.displayName ?? 'Image' })))
      setCharRefs([])
      setLocRefs([])
    } else if (panelTask.targetType === 'card') {
      setPanelEditFields(flattenDataForPanel(panelTask.card.cardData))
    }
  }, [panelTask])

  // ── Save handler for shot/clip edit (Retry) ──
  const handleEditSave = async () => {
    if (!panelTask || panelTask.mode !== 'edit') return
    if (panelTask.targetType !== 'shot' && panelTask.targetType !== 'clip') return
    setEditSaving(true)
    setEditSaveError(null)
    try {
      if (panelTask.targetType === 'shot') {
        const shot = panelTask.item
        // Update the shot data first
        await apiClient.updateShot(executionId, shot.shotId, {
          startImagePrompt: editDraft.startImagePrompt ?? '',
          characterReferences: charRefs.map(r => ({ characterId: '', referenceImage: r.awsUrl, displayName: r.displayName, awsUrl: r.awsUrl })),
          locationReferences:  locRefs.map(r => ({ locationId: '', referenceImage: r.awsUrl, displayName: r.displayName, awsUrl: r.awsUrl })),
        })
        // Then trigger a retry via the dedicated SQS endpoint
        await apiClient.retryShot(executionId, shot.id, {
          shot_number: shot.shotMetadata?.shotNumber ?? shot.sequenceNo,
          start_image_prompt: editDraft.startImagePrompt ?? '',
          character_references: charRefs.map(r => r.awsUrl),
          location_references: locRefs.map(r => r.awsUrl),
          previous_references: (shot.previousReferences ?? []).map((r: any) => r.awsUrl ?? r).filter(Boolean),
        })
      } else {
        const clip = panelTask.item
        await apiClient.updateClip(executionId, clip.clipId, {
          animationPrompt: editDraft.animationPrompt ?? '',
          inputImages: clipInputImgs.map(img => ({ displayName: img.displayName, awsUrl: img.awsUrl })),
        })
      }
      onCancelTask()
    } catch (err: any) {
      setEditSaveError(err?.message ?? 'Failed')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Save handler for card edit (Save) ──
  const handlePanelCardSave = async () => {
    if (!panelTask || panelTask.targetType !== 'card' || !onSaveEditCard) return
    setPanelEditSaving(true)
    setPanelEditSaveError(null)
    try {
      const reconstructed = reconstructFromPanelFields(panelEditFields, panelTask.card.cardData)
      await onSaveEditCard(panelTask.card, reconstructed)
      onCancelTask()
    } catch (err: any) {
      setPanelEditSaveError(err?.message ?? 'Save failed')
    } finally {
      setPanelEditSaving(false)
    }
  }

  // ── Iterate handler (sends prompt to backend) ──
  const handleIterate = async () => {
    if (!iteratePrompt.trim() || !panelTask || panelTask.mode !== 'iterate') return
    setIterateSending(true)
    try {
      if (panelTask.targetType === 'shot') {
        // Use dedicated shot iterate endpoint (SQS with iterate_payload)
        const shot = panelTask.item
        await apiClient.iterateShot(executionId, shot.id, iteratePrompt, {
          shot_number: shot.shotMetadata?.shotNumber ?? shot.sequenceNo,
          start_image: shot.startImage?.awsUrl,
        })
      } else if (panelTask.targetType === 'clip') {
        const stepKey = 'generate_animations'
        await apiClient.iterateStep(executionId, stepKey, iteratePrompt, {
          org_id: orgId, project_id: projectId, episode_id: episodeId, part_id: partId,
        })
      } else if (panelTask.targetType === 'entity-image') {
        const preferred = panelTask.item.imageType === 'anchor'
          ? panelTask.item.anchorStepKey
          : panelTask.item.referenceStepKey
        const stepKey = preferred || panelTask.item.stepKey
        await apiClient.iterateStep(executionId, stepKey, iteratePrompt, {
          org_id: orgId, project_id: projectId, episode_id: episodeId, part_id: partId,
        })
      } else {
        return
      }
      setIteratePrompt('')
      onCancelTask()
    } catch { /* silent */ }
    finally { setIterateSending(false) }
  }

  // ── Render ──
  return (
    <div className="w-[360px] flex-shrink-0 bg-[hsl(240_8%_6%)] border-l border-border/10 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 flex items-center gap-2 flex-shrink-0 h-11">
        <span className="text-[13px] font-semibold text-foreground truncate">
          {panelTask
            ? `${panelTask.mode === 'edit' ? 'Editing' : 'Iterating'} ${panelTask.label}`
            : 'AI Studio'
          }
        </span>
        <button onClick={onToggle}
          className="ml-auto w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all flex-shrink-0"
          title="Collapse AI panel">
          <PanelRightClose size={15} />
        </button>
      </div>

      {/* ── Idle state: no task ── */}
      {!panelTask && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="p-4 rounded-2xl bg-secondary/20 border border-border/20">
            <Sparkles size={28} className="text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground/70">No active task</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Click <strong>Edit</strong> or <strong>Iterate</strong> on a shot, clip, or card to start working here.
            </p>
          </div>
        </div>
      )}

      {/* ── Edit Shot ── */}
      {panelTask?.mode === 'edit' && panelTask.targetType === 'shot' && (() => {
        return (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">

              {/* ── Character References ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Character References</p>
                {charRefs.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {charRefs.map((ref, i) => (
                      <div key={ref.awsUrl + i} className="relative rounded-lg overflow-hidden aspect-square border border-border/20 bg-black/10 group/ref">
                        <img src={s3UriToHttp(ref.awsUrl)} alt={ref.displayName} loading="lazy" className="w-full h-full object-cover" />
                        <button onClick={() => viewImage(charRefs.map(r => s3UriToHttp(r.awsUrl)), i)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/ref:opacity-100 transition-opacity">
                          <Eye size={14} className="text-white" />
                        </button>
                        <button onClick={() => setCharRefs(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/80 flex items-center justify-center opacity-0 group-hover/ref:opacity-100 transition-opacity hover:bg-red-500 z-10">
                          <X size={9} className="text-white" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 text-[8px] text-white truncate">{ref.displayName}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  onDragOver={e => { e.preventDefault(); setCharDragOver(true) }}
                  onDragLeave={() => setCharDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setCharDragOver(false)
                    const url = e.dataTransfer.getData('text/plain')
                    if (url) setCharRefs(prev => [...prev, { awsUrl: httpToS3Uri(url), displayName: url.split('/').pop()?.split('?')[0] ?? 'Image' }])
                  }}
                  className={cn('rounded-lg border-2 border-dashed flex items-center justify-center py-3 gap-1.5 transition-all text-[11px] font-medium cursor-default',
                    charDragOver ? 'border-accent bg-accent/10 text-accent' : 'border-border/60 text-foreground/70 hover:border-accent/30')}
                >
                  <Plus size={11} />{charDragOver ? 'Drop to add' : 'Drag image here to add'}
                </div>
              </div>

              {/* ── Location References ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Location References</p>
                {locRefs.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {locRefs.map((ref, i) => (
                      <div key={ref.awsUrl + i} className="relative rounded-lg overflow-hidden aspect-square border border-border/20 bg-black/10 group/ref">
                        <img src={s3UriToHttp(ref.awsUrl)} alt={ref.displayName} loading="lazy" className="w-full h-full object-cover" />
                        <button onClick={() => viewImage(locRefs.map(r => s3UriToHttp(r.awsUrl)), i)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/ref:opacity-100 transition-opacity">
                          <Eye size={14} className="text-white" />
                        </button>
                        <button onClick={() => setLocRefs(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/80 flex items-center justify-center opacity-0 group-hover/ref:opacity-100 transition-opacity hover:bg-red-500 z-10">
                          <X size={9} className="text-white" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 text-[8px] text-white truncate">{ref.displayName}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  onDragOver={e => { e.preventDefault(); setLocDragOver(true) }}
                  onDragLeave={() => setLocDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setLocDragOver(false)
                    const url = e.dataTransfer.getData('text/plain')
                    if (url) setLocRefs(prev => [...prev, { awsUrl: httpToS3Uri(url), displayName: url.split('/').pop()?.split('?')[0] ?? 'Image' }])
                  }}
                  className={cn('rounded-lg border-2 border-dashed flex items-center justify-center py-3 gap-1.5 transition-all text-[11px] font-medium cursor-default',
                    locDragOver ? 'border-accent bg-accent/10 text-accent' : 'border-border/60 text-foreground/70 hover:border-accent/30')}
                >
                  <Plus size={11} />{locDragOver ? 'Drop to add' : 'Drag image here to add'}
                </div>
              </div>

              {/* ── Start Image Prompt ── */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Start Image Prompt</label>
                <AutoResizeTextarea
                  value={editDraft.startImagePrompt ?? ''}
                  onChange={e => setEditDraft(d => ({ ...d, startImagePrompt: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border/40 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 leading-relaxed"
                  minRows={3}
                  placeholder="Describe the start image..."
                />
              </div>

              {editSaveError && <p className="text-[11px] text-red-400">{editSaveError}</p>}
            </div>
            <div className="p-3 flex-shrink-0 space-y-2">
              <button onClick={handleEditSave} disabled={editSaving}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 transition-all text-[12px] font-semibold">
                {editSaving ? <><Loader2 size={13} className="animate-spin" /> Retrying…</> : <><RefreshCw size={13} /> Retry</>}
              </button>
              <button onClick={onCancelTask}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 text-foreground/70 hover:bg-secondary/60 hover:text-foreground transition-all text-[12px] font-medium">
                Cancel
              </button>
            </div>
          </>
        )
      })()}

      {/* ── Iterate Shot ── */}
      {panelTask?.mode === 'iterate' && panelTask.targetType === 'shot' && (() => {
        const shot = panelTask.item
        return (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
              {/* Shot image */}
              {shot.startImage?.awsUrl ? (
                <div className="rounded-xl overflow-hidden border border-border/20">
                  <img src={shot.startImage.awsUrl} alt="Shot" loading="lazy" className="w-full object-cover" />
                </div>
              ) : (
                <div className="rounded-xl border border-border/20 flex items-center justify-center h-40 bg-muted/10">
                  <p className="text-[11px] text-muted-foreground/40">No image yet</p>
                </div>
              )}
              {shot.oneLinerShotIntent && (
                <div className="rounded-lg bg-secondary/20 px-3 py-2 border border-border/20">
                  <p className="text-[11px] text-foreground/70 leading-snug">{shot.oneLinerShotIntent}</p>
                </div>
              )}
            </div>
            <div className="p-3 flex-shrink-0 space-y-2">
              <AutoResizeTextarea
                value={iteratePrompt}
                onChange={e => setIteratePrompt(e.target.value)}
                placeholder="Describe what to change in this shot…"
                minRows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/40 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-accent/50 leading-relaxed"
              />
              <button onClick={handleIterate} disabled={!iteratePrompt.trim() || iterateSending}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 transition-all text-[12px] font-semibold">
                {iterateSending ? <><Loader2 size={13} className="animate-spin" /> Retrying…</> : <><RefreshCw size={13} /> Retry</>}
              </button>
              <button onClick={onCancelTask}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 text-foreground/70 hover:bg-secondary/60 hover:text-foreground transition-all text-[12px] font-medium">
                Cancel
              </button>
            </div>
          </>
        )
      })()}

      {/* ── Edit Clip ── */}
      {panelTask?.mode === 'edit' && panelTask.targetType === 'clip' && (() => {
        return (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">

              {/* ── Input Images ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Input Images</p>
                {clipInputImgs.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {clipInputImgs.map((img, i) => (
                      <div key={img.awsUrl + i} className="relative rounded-lg overflow-hidden aspect-square border border-border/20 bg-black/10 group/ref">
                        <img src={s3UriToHttp(img.awsUrl)} alt={img.displayName} loading="lazy" className="w-full h-full object-cover" />
                        <button onClick={() => viewImage(clipInputImgs.map(im => s3UriToHttp(im.awsUrl)), i)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/ref:opacity-100 transition-opacity">
                          <Eye size={14} className="text-white" />
                        </button>
                        <button onClick={() => setClipInputImgs(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/80 flex items-center justify-center opacity-0 group-hover/ref:opacity-100 transition-opacity hover:bg-red-500 z-10">
                          <X size={9} className="text-white" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 text-[8px] text-white truncate">{img.displayName}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  onDragOver={e => { e.preventDefault(); setClipImgDragOver(true) }}
                  onDragLeave={() => setClipImgDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setClipImgDragOver(false)
                    const url = e.dataTransfer.getData('text/plain')
                    if (url) setClipInputImgs(prev => [...prev, { awsUrl: httpToS3Uri(url), displayName: url.split('/').pop()?.split('?')[0] ?? 'Image' }])
                  }}
                  className={cn('rounded-lg border-2 border-dashed flex items-center justify-center py-3 gap-1.5 transition-all text-[11px] font-medium cursor-default',
                    clipImgDragOver ? 'border-accent bg-accent/10 text-accent' : 'border-border/60 text-foreground/70 hover:border-accent/30')}
                >
                  <Plus size={11} />{clipImgDragOver ? 'Drop to add' : 'Drag image here to add'}
                </div>
              </div>

              {/* ── Animation Prompt ── */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Animation Prompt</label>
                <AutoResizeTextarea
                  value={editDraft.animationPrompt ?? ''}
                  onChange={e => setEditDraft(d => ({ ...d, animationPrompt: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border/40 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 leading-relaxed"
                  minRows={3}
                  placeholder="Describe the animation..."
                />
              </div>

              {editSaveError && <p className="text-[11px] text-red-400">{editSaveError}</p>}
            </div>
            <div className="p-3 flex-shrink-0 space-y-2">
              <button onClick={handleEditSave} disabled={editSaving}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 transition-all text-[12px] font-semibold">
                {editSaving ? <><Loader2 size={13} className="animate-spin" /> Retrying…</> : <><RefreshCw size={13} /> Retry</>}
              </button>
              <button onClick={onCancelTask}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 text-foreground/70 hover:bg-secondary/60 hover:text-foreground transition-all text-[12px] font-medium">
                Cancel
              </button>
            </div>
          </>
        )
      })()}

      {/* ── Iterate Clip ── */}
      {panelTask?.mode === 'iterate' && panelTask.targetType === 'clip' && (() => {
        const clip = panelTask.item
        return (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
              {clip.clipOutput?.awsUrl ? (
                <OptimizedVideo src={clip.clipOutput.awsUrl} className="w-full rounded-xl border border-border/20" controls preload="metadata" objectFit="contain" />
              ) : (
                <div className="rounded-xl border border-border/20 flex items-center justify-center h-40 bg-muted/10">
                  <p className="text-[11px] text-muted-foreground/40">No clip yet</p>
                </div>
              )}
            </div>
            <div className="p-3 flex-shrink-0 space-y-2">
              <AutoResizeTextarea
                value={iteratePrompt}
                onChange={e => setIteratePrompt(e.target.value)}
                placeholder="Describe what to change in this clip…"
                minRows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/40 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-accent/50 leading-relaxed"
              />
              <button onClick={handleIterate} disabled={!iteratePrompt.trim() || iterateSending}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 transition-all text-[12px] font-semibold">
                {iterateSending ? <><Loader2 size={13} className="animate-spin" /> Retrying…</> : <><RefreshCw size={13} /> Retry</>}
              </button>
              <button onClick={onCancelTask}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 text-foreground/70 hover:bg-secondary/60 hover:text-foreground transition-all text-[12px] font-medium">
                Cancel
              </button>
            </div>
          </>
        )
      })()}

      {/* ── Iterate Entity Image ── */}
      {panelTask?.mode === 'iterate' && panelTask.targetType === 'entity-image' && (() => {
        const item = panelTask.item
        return (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
              <div className="rounded-xl overflow-hidden border border-border/20 bg-black/10">
                <img src={item.imageUrl} alt={item.imageLabel} loading="lazy" className="w-full object-cover" />
              </div>
              <div className="rounded-lg bg-secondary/20 px-3 py-2 border border-border/20 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Entity</p>
                <p className="text-[12px] text-foreground/80">{item.entityName}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mt-2">Image Type</p>
                <p className="text-[12px] text-foreground/80">
                  {item.imageType === 'anchor' ? 'Anchor Image' : 'Reference Image'}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mt-2">Section</p>
                <p className="text-[12px] text-foreground/80">{item.sectionLabel}</p>
              </div>
            </div>
            <div className="p-3 flex-shrink-0 space-y-2">
              <AutoResizeTextarea
                value={iteratePrompt}
                onChange={e => setIteratePrompt(e.target.value)}
                placeholder={`Describe what to change in this ${item.imageType === 'anchor' ? 'anchor' : 'reference'} image…`}
                minRows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/40 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-accent/50 leading-relaxed"
              />
              <button onClick={handleIterate} disabled={!iteratePrompt.trim() || iterateSending}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 transition-all text-[12px] font-semibold">
                {iterateSending ? <><Loader2 size={13} className="animate-spin" /> Retrying…</> : <><RefreshCw size={13} /> Retry</>}
              </button>
              <button onClick={onCancelTask}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 text-foreground/70 hover:bg-secondary/60 hover:text-foreground transition-all text-[12px] font-medium">
                Cancel
              </button>
            </div>
          </>
        )
      })()}

      {/* ── Edit Card (beat, storyboard, etc.) ── */}
      {panelTask?.mode === 'edit' && panelTask.targetType === 'card' && (() => {
        const card = panelTask.card
        return (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
              {/* Context card */}
              <div className="rounded-xl border border-border/30 bg-secondary/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Editing</p>
                <p className="text-[14px] font-bold text-foreground leading-tight">{card.cardTitle}</p>
              </div>

              {/* Flattened KV fields */}
              {panelEditFields.map(field =>
                field.isGroupHeader ? (
                  <div key={field.id} className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border/20" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent/70 px-1 flex-shrink-0">{field.label}</span>
                    <div className="h-px flex-1 bg-border/20" />
                  </div>
                ) : (
                  <div key={field.id} className="space-y-1 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{field.label}</p>
                    <AutoResizeTextarea
                      value={field.value}
                      onChange={e => setPanelEditFields(prev => prev.map(f => f.id === field.id ? { ...f, value: e.target.value } : f))}
                      minRows={2}
                      className="w-full px-2.5 py-2 rounded-md bg-background/50 border border-border/40 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 leading-relaxed"
                    />
                  </div>
                )
              )}
              {panelEditSaveError && <p className="text-[11px] text-red-400">{panelEditSaveError}</p>}
            </div>
            <div className="p-3 flex-shrink-0 space-y-2">
              <button onClick={handlePanelCardSave} disabled={panelEditSaving}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 transition-all text-[12px] font-semibold">
                {panelEditSaving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save</>}
              </button>
              <button onClick={onCancelTask}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 text-foreground/70 hover:bg-secondary/60 hover:text-foreground transition-all text-[12px] font-medium">
                Cancel
              </button>
            </div>
          </>
        )
      })()}
    </div>
  )
}

// ─── Main Part Studio Page ────────────────────────────────────

export default function PartStudioPage() {
  const params = useParams()
  const projectId = params.id as string
  const episodeId = params.episodeId as string
  const partId = params.partId as string

  // Part data
  const [partTitle, setPartTitle] = useState<string>('Part')
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [partLoading, setPartLoading] = useState(true)
  const [awaitingExecution, setAwaitingExecution] = useState(false)
  const pollAttemptsRef = useRef(0)

  // Workflow data
  const [execution, setExecution] = useState<ExecutionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<string>('')
  const [tabData, setTabData] = useState<Record<string, Record<string, any> | null>>({})
  const [tabLoading, setTabLoading] = useState(false)

  // Step version history & selected version
  const [stepVersions, setStepVersions] = useState<Record<string, StepHistoryEntry[]>>({})
  const [selectedVersionId, setSelectedVersionId] = useState<Record<string, string>>({})

  // AI panel + image lightbox
  const [aiPanelOpen, setAiPanelOpen] = useState(true)
  const [viewingImage, setViewingImage] = useState<{ urls: string[]; startIndex: number; label?: string } | null>(null)

  // Task-based AI panel state (replaces old editingItem / editingCard)
  const [panelTask, setPanelTask] = useState<PanelTask>(null)

  const handleEditCard = useCallback((card: EditingCard) => {
    setPanelTask({ mode: 'edit', targetType: 'card', card, label: card.cardTitle })
    setAiPanelOpen(true)
  }, [])

  // Generate / Approve flow
  const [approvingStep, setApprovingStep] = useState<string | null>(null)

  const activeTabRef = useRef<string>('')
  const tabBarRef = useRef<HTMLDivElement>(null)
  const [tabCanScrollLeft, setTabCanScrollLeft] = useState(false)
  const [tabCanScrollRight, setTabCanScrollRight] = useState(false)
  const handleTabChange = useCallback((tab: string) => { setActiveTab(tab); activeTabRef.current = tab }, [])

  // ── Edit / Iterate shot & clip in right panel ───────────────────────
  const handleEditShot = useCallback((shot: ShotOut) => {
    const num = shot.shotMetadata?.shotNumber ?? shot.sequenceNo
    setPanelTask({ mode: 'edit', targetType: 'shot', item: shot, label: `Shot ${num}` })
    setAiPanelOpen(true)
  }, [])

  const handleIterateShot = useCallback((shot: ShotOut) => {
    const num = shot.shotMetadata?.shotNumber ?? shot.sequenceNo
    setPanelTask({ mode: 'iterate', targetType: 'shot', item: shot, label: `Shot ${num}` })
    setAiPanelOpen(true)
  }, [])

  const handleEditClip = useCallback((clip: ClipOut) => {
    setPanelTask({ mode: 'edit', targetType: 'clip', item: clip, label: `Clip ${clip.sequenceNo}` })
    setAiPanelOpen(true)
  }, [])

  const handleIterateClip = useCallback((clip: ClipOut) => {
    setPanelTask({ mode: 'iterate', targetType: 'clip', item: clip, label: `Clip ${clip.sequenceNo}` })
    setAiPanelOpen(true)
  }, [])

  // ── Image delete / upload ──────────────────────────────────
  const handleImageDelete = useCallback(async (stepKey: string, urlToRemove: string) => {
    if (!executionId) return
    const currentData = tabData[activeTab]
    if (!currentData) return
    // Collect current urls from this step's data
    const existingUrls: string[] = currentData._s3Uris ?? currentData._anchorS3 ?? currentData._viewPackS3 ?? []
    const newUrls = existingUrls.filter((u: string) => u !== urlToRemove)
    await apiClient.patchStepImages(executionId, stepKey, newUrls)
    // Refresh tab by clearing cache
    setTabData(prev => {
      const copy = { ...prev }
      delete copy[activeTab]
      return copy
    })
  }, [executionId, activeTab, tabData])

  const handleImageUpload = useCallback(async (stepKey: string, files: FileList, existingUrlsOverride?: string[]) => {
    if (!executionId) return
    const currentData = tabData[activeTab]
    // When coming from a targeted entity upload, use the entity's own images as base;
    // otherwise fall back to the tab-level flat lists
    const existingUrls: string[] = existingUrlsOverride ?? currentData?._s3Uris ?? currentData?._anchorS3 ?? currentData?._viewPackS3 ?? []
    const newUrls = [...existingUrls]
    
    // Upload files to S3
    for (const file of Array.from(files)) {
      const { upload_url, public_url } = await apiClient.presignUpload(file.name, file.type)
      await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      newUrls.push(public_url)
    }
    
    // Try to patch existing step version; if it fails (no version exists), create one via editStep
    try {
      await apiClient.patchStepImages(executionId, stepKey, newUrls)
    } catch (err: any) {
      // If "Step version not found", create a new one with just the images
      if (err?.message?.includes('Step version not found') || err?.detail?.includes('not found')) {
        await apiClient.editStep(executionId, stepKey, { _s3Uris: newUrls }, {
          org_id: '', project_id: projectId, episode_id: episodeId, part_id: partId,
        })
      } else {
        throw err
      }
    }
    
    setTabData(prev => {
      const copy = { ...prev }
      delete copy[activeTab]
      return copy
    })
  }, [executionId, activeTab, tabData, projectId, episodeId, partId])

  const checkTabScroll = useCallback(() => {
    const el = tabBarRef.current
    if (!el) return
    setTabCanScrollLeft(el.scrollLeft > 4)
    setTabCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])
  const scrollTabBar = useCallback((dir: 'left' | 'right') => {
    const el = tabBarRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'right' ? 180 : -180, behavior: 'smooth' })
  }, [])

  // ── 1. Fetch part title, then start polling for execution ──
  useEffect(() => {
    let alive = true
    apiClient.getPart(projectId, episodeId, partId)
      .then((part: PartOut) => {
        if (!alive) return
        setPartTitle(part.title)
        setPartLoading(false)
        setLoading(false)
        pollAttemptsRef.current = 0
        setAwaitingExecution(true)
      })
      .catch(() => { if (alive) { setError('Part not found'); setPartLoading(false); setLoading(false) } })
    return () => { alive = false }
  }, [projectId, episodeId, partId])

  // ── 1b. Poll GET /workflows/by-part/{partId} until execution appears ──
  useEffect(() => {
    if (!awaitingExecution) return
    let alive = true
    const tryFetch = async () => {
      try {
        const exec = await apiClient.getWorkflowByPart(partId)
        if (!alive) return
        setExecutionId(exec.execution_id)
        setExecution(exec)
        setAwaitingExecution(false)
        setLoading(false)
      } catch {
        if (!alive) return
        pollAttemptsRef.current += 1
        if (pollAttemptsRef.current >= 40) {
          setAwaitingExecution(false)
          setLoading(false)
        }
      }
    }
    tryFetch()
    const interval = setInterval(tryFetch, 3000)
    return () => { alive = false; clearInterval(interval) }
  }, [awaitingExecution, partId])

  // ── 2. Fetch execution status ──────────────────────────────
  const fetchBase = useCallback(async () => {
    if (!executionId) return
    try {
      const exec = await apiClient.getWorkflowStatus(executionId)
      setExecution(exec)
      setError(null)
    } catch { setError('Failed to load production data') }
    finally { setLoading(false) }
  }, [executionId])

  useEffect(() => { if (executionId) { setLoading(true); fetchBase() } }, [executionId, fetchBase])

  // ── Check tab scroll after steps load ──────────────────────
  useEffect(() => {
    // Small delay to let layout paint before measuring
    const t = setTimeout(checkTabScroll, 80)
    return () => clearTimeout(t)
  }, [execution?.steps?.length, checkTabScroll])

  // ── 4. Build template tabs with status from execution steps ─
  type TabStatus = 'approved' | 'completed' | 'running' | 'ready' | 'locked'
  const templateTabs = useMemo(() => {
    if (awaitingExecution && !execution) {
      // Pipeline is starting — show all template tabs as placeholder; first tab = running
      return STEP_DISPLAY_TEMPLATE.map((template, idx) => ({
        ...template,
        status: (idx === 0 ? 'running' : 'locked') as TabStatus,
        versionNo: 0,
      }))
    }
    if (!execution) return [] as (TabTemplate & { status: TabStatus; versionNo: number })[]
    const stepMap = new Map(execution.steps.map(s => [s.step_key, s]))
    // approvedKeys — only steps explicitly approved by the user
    const approvedKeys = new Set(execution.steps.filter(s => !!s.is_approved).map(s => s.step_key))

    // All execution step keys in pipeline order (includes hidden steps)
    const allExecStepKeys = execution.steps.map(s => s.step_key)

    return STEP_DISPLAY_TEMPLATE.map((template) => {
      const constituentSteps = template.stepKeys.map(sk => stepMap.get(sk)).filter(Boolean)
      if (constituentSteps.length === 0) return null
      // allApproved: ONLY true when the user has explicitly approved all constituent steps
      const allApproved = constituentSteps.every(s => approvedKeys.has(s!.step_key))
      // anySucceeded: true when any constituent step finished successfully.
      // NOTE: in test_v3, entity tabs can be backed by independent collections
      // (characters/locations) even when stepVersion.has_data is false/missing.
      const anySucceeded = constituentSteps.some(s => s!.status === 'succeeded')
      const anyRunning = constituentSteps.some(s => s!.status === 'running')
      const allNotStarted = constituentSteps.every(s => s!.status === 'not_started')

      let status: TabStatus = 'locked'
      if (allApproved && anySucceeded) {
        status = 'approved'
      } else if (anySucceeded) {
        // succeeded but not yet approved by user — show data + approval CTA
        status = 'completed'
      } else if (anyRunning) {
        status = 'running'
      } else if (allNotStarted) {
        // A tab is ready only when ALL prior tabs are fully APPROVED
        // (not just succeeded, but explicitly approved by the user)
        const tabIndex = STEP_DISPLAY_TEMPLATE.findIndex(t => t.tabKey === template.tabKey)
        if (tabIndex <= 0) {
          // First tab is always ready
          status = 'ready'
        } else {
          // Check that ALL prior tabs in STEP_DISPLAY_TEMPLATE are approved
          const allPriorTabsApproved = STEP_DISPLAY_TEMPLATE.slice(0, tabIndex).every(priorTab => {
            // A prior tab is approved if ALL its constituent steps are in approvedKeys
            return priorTab.stepKeys.every(sk => approvedKeys.has(sk))
          })
          status = allPriorTabsApproved ? 'ready' : 'locked'
        }
      }
      const primary = stepMap.get(template.stepKeys[0])
      return { ...template, status, versionNo: primary?.version_no ?? 0 }
    }).filter(Boolean) as (TabTemplate & { status: TabStatus; versionNo: number })[]
  }, [execution, awaitingExecution])

  // ── 3. Load step data + history when tab changes ──────────
  useEffect(() => {
    if (!activeTab || !executionId || tabData[activeTab] !== undefined) return

    // Don't try to load data for steps that haven't been generated yet
    const tabStatus = templateTabs.find(t => t.tabKey === activeTab)?.status
    const template = STEP_DISPLAY_TEMPLATE.find(t => t.tabKey === activeTab)
    if (!template) return

    // Collection-backed tabs can still have data in DB even when workflow status
    // is locked/ready/running (common in test_v3); allow loading for those.
    const isCollectionBacked =
      template.layout === 'entity-page' ||
      template.layout === 'shots' ||
      template.layout === 'animations'

    if (!isCollectionBacked && (tabStatus === 'ready' || tabStatus === 'locked' || tabStatus === 'running')) return

    setTabLoading(true)

    if (template.layout === 'entity-page' && template.stepKeys.length > 1) {
      const toLabeled = (imgs: Array<{ s3_uri?: string; display_name?: string; file_name?: string }>): LabeledImage[] => {
        return (imgs ?? [])
          .filter(i => !!i?.s3_uri)
          .map(i => ({
            url: i.s3_uri as string,
            label: i.display_name || i.file_name || 'Image',
          }))
      }

      const loadFromCollections = async () => {
        const isCharactersTab = activeTab === 'characters'
        const entityKey = template.entityKey || (isCharactersTab ? 'Characters' : 'Key_Locations')

        const rows = isCharactersTab
          ? await apiClient.getWorkflowCharacters(executionId, { part_id: partId, latest_only: true })
          : await apiClient.getWorkflowLocations(executionId, { part_id: partId, latest_only: true })

        const entities: Record<string, any>[] = []
        const anchorRefs: Record<string, string[]> = {}
        const viewPackRefs: Record<string, string[]> = {}
        const richAnchorAssets: RichEntityAssets[] = []
        const richViewPackAssets: RichEntityAssets[] = []

        ;(rows as Array<CharacterOut | LocationOut>).forEach((row) => {
          const desc = isCharactersTab
            ? ((row as CharacterOut).character_description ?? {})
            : ((row as LocationOut).location_description ?? {})

          const displayName = String(
            desc.display_name ||
            desc.character_name ||
            desc.location_name ||
            desc.name ||
            desc.name_identifier ||
            desc.name_id ||
            'Entity'
          )

          entities.push(desc)

          const anchors = toLabeled((row as any).anchor_images ?? [])
          if (anchors.length > 0) {
            anchorRefs[displayName] = anchors.map(i => i.url)
            richAnchorAssets.push({ entityName: displayName, images: anchors })
          }

          const views = toLabeled((row as any).view_pack_images ?? [])
          const collageRaw = (row as any).collage_image
          const collage: LabeledImage[] = collageRaw?.s3_uri
            ? [{
                url: collageRaw.s3_uri,
                label: collageRaw.display_name || collageRaw.file_name || 'Collage',
              }]
            : []

          const mergedViews = [...views, ...collage]
          if (mergedViews.length > 0) {
            viewPackRefs[displayName] = mergedViews.map(i => i.url)
            richViewPackAssets.push({ entityName: displayName, images: mergedViews })
          }
        })

        const combined: Record<string, any> = {
          [entityKey]: entities,
          _layout: template.layout,
          _entityKey: entityKey,
          _anchorRefs: anchorRefs,
          _viewPackRefs: viewPackRefs,
          _richAnchorAssets: richAnchorAssets,
          _richViewPackAssets: richViewPackAssets,
          _anchorS3: Object.values(anchorRefs).flat(),
          _viewPackS3: Object.values(viewPackRefs).flat(),
        }

        const hasReal = entities.length > 0 || combined._anchorS3.length > 0 || combined._viewPackS3.length > 0
        setTabData(prev => ({
          ...prev,
          [activeTab]: hasReal ? combined : { ...combined, _empty: true },
        }))
        setStepVersions(prev => ({ ...prev, [activeTab]: [] }))
      }

      loadFromCollections()
        .catch(() => {
          const fallbackEntityKey = template.entityKey || (activeTab === 'characters' ? 'Characters' : 'Key_Locations')
          setTabData(prev => ({
            ...prev,
            [activeTab]: {
              _layout: template.layout,
              _entityKey: fallbackEntityKey,
              [fallbackEntityKey]: [],
              _anchorRefs: {},
              _viewPackRefs: {},
              _richAnchorAssets: [],
              _richViewPackAssets: [],
              _anchorS3: [],
              _viewPackS3: [],
              _empty: true,
            },
          }))
        })
        .finally(() => setTabLoading(false))
    } else if (template.layout === 'shots' && template.stepKeys.length > 1) {
      // ── Shots tab: read from independent shots collection ──
      apiClient.getWorkflowShots(executionId, { part_id: partId, latest_only: true })
        .then(rows => {
          const combined: Record<string, any> = {
            _layout: template.layout,
            _shots: rows,
            _empty: rows.length === 0,
          }
          setTabData(prev => ({ ...prev, [activeTab]: combined }))
          setStepVersions(prev => ({ ...prev, [activeTab]: [] }))
        })
        .catch(() => setTabData(prev => ({
          ...prev,
          [activeTab]: { _layout: template.layout, _shots: [], _empty: true },
        })))
        .finally(() => setTabLoading(false))
    } else if (template.layout === 'animations') {
      // ── Animations tab: read from independent clips collection ──
      apiClient.getWorkflowClips(executionId, { part_id: partId, latest_only: true })
        .then(rows => {
          const combined: Record<string, any> = {
            _layout: 'animations',
            _clips: rows,
            _empty: rows.length === 0,
          }
          setTabData(prev => ({ ...prev, [activeTab]: combined }))
          setStepVersions(prev => ({ ...prev, [activeTab]: [] }))
        })
        .catch(() => setTabData(prev => ({
          ...prev,
          [activeTab]: { _layout: 'animations', _clips: [], _empty: true },
        })))
        .finally(() => setTabLoading(false))
    } else {
      // ── Single-step tab ──
      const stepKey = template.stepKeys[0]
      apiClient.getStepData(executionId, stepKey)
        .then(stepData => {
          const data = extractStepData(stepData)
          setTabData(prev => ({
            ...prev,
            [activeTab]: Object.keys(data).length > 0 ? data : { _empty: true },
          }))
          if (stepData.step_version_id) {
            setSelectedVersionId(prev => ({ ...prev, [activeTab]: stepData.step_version_id }))
          }
        })
        .catch(() => setTabData(prev => ({ ...prev, [activeTab]: { _empty: true } })))
        .finally(() => setTabLoading(false))

      // Load version history
      apiClient.getStepHistory(executionId, stepKey)
        .then(history => setStepVersions(prev => ({ ...prev, [activeTab]: history })))
        .catch(() => setStepVersions(prev => ({ ...prev, [activeTab]: [] })))
    }
  }, [activeTab, executionId, tabData, templateTabs, partId])

  // ── 3b. Load specific version when user selects one ────────
  const handleVersionSelect = useCallback(async (versionId: string) => {
    if (!executionId || !activeTab) return
    setSelectedVersionId(prev => ({ ...prev, [activeTab]: versionId }))
    setTabLoading(true)
    try {
      const stepData = await apiClient.getStepVersionById(versionId)
      const data = extractStepData(stepData)
      const template = STEP_DISPLAY_TEMPLATE.find(t => t.tabKey === activeTab)
      if (template?.layout === 'entity-page') {
        // For merged tabs, update description data but keep image data intact
        const existing = tabData[activeTab] ?? {}
        const combined = { ...existing, ...data }
        setTabData(prev => ({ ...prev, [activeTab]: Object.keys(data).length > 0 ? combined : null }))
      } else if (template?.layout === 'shots') {
        // For shots tab, update shot image refs + flat URLs but keep storyboard intact
        const existing = tabData[activeTab] ?? {}
        const combined = {
          ...existing,
          _shotImageRefs: data._shotRefs ?? [],
          _shotS3: data._s3Uris ?? [],
          _artifactRefs: data._artifactRefs ?? {},
        }
        setTabData(prev => ({ ...prev, [activeTab]: combined }))
      } else if (template?.layout === 'animations') {
        // For animations tab, replace animation refs with selected version data
        data._layout = 'animations'
        setTabData(prev => ({ ...prev, [activeTab]: Object.keys(data).length > 0 ? data : null }))
      } else {
        setTabData(prev => ({ ...prev, [activeTab]: Object.keys(data).length > 0 ? data : null }))
      }
    } catch {
      // revert
    } finally { setTabLoading(false) }
  }, [executionId, activeTab, tabData])

  // ── 3c. Clear tab cache when a step transitions from running → succeeded ──
  const prevStepStatuses = useRef<Map<string, string>>(new Map())
  useEffect(() => {
    if (!execution) return
    const newMap = new Map(execution.steps.map(s => [s.step_key, s.status]))
    const prev = prevStepStatuses.current

    for (const [key, status] of newMap) {
      const oldStatus = prev.get(key)
      if (oldStatus === 'running' && status === 'succeeded') {
        // Clear cached tab data so fresh data loads when the user views the tab
        const affectedTab = STEP_DISPLAY_TEMPLATE.find(t => t.stepKeys.includes(key))
        if (affectedTab) {
          setTabData(prev => { const next = { ...prev }; delete next[affectedTab.tabKey]; return next })
          setStepVersions(prev => { const next = { ...prev }; delete next[affectedTab.tabKey]; return next })
        }
      }
    }
    prevStepStatuses.current = newMap
  }, [execution])

  const completedTabs = useMemo(() => templateTabs.filter(t => t.status === 'completed' || t.status === 'approved'), [templateTabs])

  useEffect(() => {
    if (!activeTab && templateTabs.length > 0) {
      // Auto-select: first completed/approved tab, then first ready tab, then first running tab
      const target = completedTabs[0] ?? templateTabs.find(t => t.status === 'ready') ?? templateTabs.find(t => t.status === 'running') ?? templateTabs[0]
      if (target) handleTabChange(target.tabKey)
    }
  }, [completedTabs, templateTabs, activeTab, handleTabChange])

  // ── 5. Active tab info ────────────────────────────────────
  const activeTemplate = useMemo(() => templateTabs.find(t => t.tabKey === activeTab), [templateTabs, activeTab])
  const approvedStepKeySet = useMemo(
    () => new Set(execution?.steps.filter(s => !!s.is_approved).map(s => s.step_key) ?? []),
    [execution],
  )
  const primaryStepKey = activeTemplate?.stepKeys[0] ?? activeTab

  // ── 5a. Approve step handler — approves ONE specific constituent step ──
  // The backend handles batching hidden (non-UI) steps in the SQS chain.
  const handleApprove = useCallback(async (stepKey: string) => {
    if (!executionId || !activeTab) return
    setApprovingStep(stepKey)
    try {
      await apiClient.approveStep(executionId, stepKey, {
        project_id: projectId,
        episode_id: episodeId,
        part_id: partId,
      })
      // Refresh execution to get updated statuses
      const exec = await apiClient.getWorkflowStatus(executionId)
      setExecution(exec)
      // Clear cached tab data so it reloads with any new sub-step data
      setTabData(prev => { const next = { ...prev }; delete next[activeTab]; return next })
      // Auto-advance to next tab ONLY when approving the last constituent step of the tab
      const template = STEP_DISPLAY_TEMPLATE.find(t => t.tabKey === activeTab)
      const lastKey = template?.stepKeys[template.stepKeys.length - 1]
      if (stepKey === lastKey) {
        const currentIdx = templateTabs.findIndex(t => t.tabKey === activeTab)
        if (currentIdx >= 0 && currentIdx < templateTabs.length - 1) {
          handleTabChange(templateTabs[currentIdx + 1].tabKey)
        }
      }
    } catch (err) {
      console.error('Approve step failed:', err)
    } finally {
      setApprovingStep(null)
    }
  }, [executionId, projectId, episodeId, partId, activeTab, templateTabs, handleTabChange])

  // ── 5b. Tab approval state — derived directly from execution.steps ─────────
  //
  // Determines WHICH specific constituent step needs the next approve CTA,
  // the label to show, and the status of the step that follows it.
  //
  // For single-step tabs:  finds the step after the tab's only step.
  // For multi-step tabs (Characters, Locations), walks from the last constituent backwards:
  //   • step 'succeeded' + next 'not_started' → show Approve CTA
  //   • step approved(true) + next 'running'  → show Processing banner
  //   • step 'succeeded' + next 'running'     → show Processing banner
  const tabApprovalState = useMemo(() => {
    if (!execution || !activeTemplate) return null
    const stepMap = new Map(execution.steps.map(s => [s.step_key, s]))
    const keys = activeTemplate.stepKeys

    for (let i = keys.length - 1; i >= 0; i--) {
      const sk = keys[i]
      const step = stepMap.get(sk)
      if (!step) continue
      const isSucceeded = step.status === 'succeeded'
      const isApproved  = !!step.is_approved
      if (!isSucceeded && !isApproved) continue

      const isLast = i + 1 >= keys.length
      if (!isLast) {
        // Next step is another constituent in this tab
        const nextKey  = keys[i + 1]
        const nextStep = stepMap.get(nextKey)
        if (!nextStep) continue

        // Next sub-step is already running — show Processing banner
        // (covers both: approved→running AND succeeded→already-running edge cases)
        if (nextStep.status === 'running') {
          return {
            approveKey: sk,
            nextStatus: 'running',
            isLastConstituent: false,
            currentLabel: activeTemplate.subStepLabels?.[i] ?? stepDisplayName(sk),
            nextLabel: activeTemplate.subStepLabels?.[i + 1] ?? stepDisplayName(nextKey),
          }
        }
        // Next sub-step not started yet — show Approve CTA (only when current is succeeded)
        if (isSucceeded && nextStep.status === 'not_started') {
          return {
            approveKey: sk,
            nextStatus: 'not_started',
            isLastConstituent: false,
            currentLabel: activeTemplate.subStepLabels?.[i] ?? stepDisplayName(sk),
            nextLabel: activeTemplate.subStepLabels?.[i + 1] ?? stepDisplayName(nextKey),
          }
        }
      } else {
        // Last constituent — look at the execution step immediately after this tab.
        // Only relevant when current is 'succeeded' (not yet approved by user);
        // once approved the tab-level 'approved' badge or next tab's state covers it.
        if (!isSucceeded) continue
        const execIdx = execution.steps.findIndex(s => s.step_key === sk)
        if (execIdx >= 0 && execIdx + 1 < execution.steps.length) {
          const afterStep = execution.steps[execIdx + 1]
          // Resolve the label of the tab that owns the next execution step
          const nextTabEntry = STEP_DISPLAY_TEMPLATE.find(t => t.stepKeys.includes(afterStep.step_key))
          const nextTabLabel = nextTabEntry?.label ?? stepDisplayName(afterStep.step_key)
          return {
            approveKey: sk,
            nextStatus: afterStep.status as string,
            isLastConstituent: true,
            currentLabel: activeTemplate.subStepLabels?.[i] ?? activeTemplate.label,
            nextLabel: nextTabLabel,
          }
        }
      }
    }
    return null
  }, [execution, activeTemplate])

  // ── 5c. Polling for running steps ────────────────────────
  // Poll when ANY tab is 'running' OR when any individual execution step is 'running'.
  // The second clause catches sub-steps running inside a 'completed' multi-step tab
  // (e.g. view_pack running while Locations tab still shows 'completed' because
  //  the description/anchor steps already have data).
  const hasRunningSteps = useMemo(
    () =>
      templateTabs.some(t => t.status === 'running') ||
      (execution?.steps.some(s => s.status === 'running') ?? false),
    [templateTabs, execution],
  )

  useEffect(() => {
    if (!hasRunningSteps || !executionId) return
    const interval = setInterval(async () => {
      try {
        const exec = await apiClient.getWorkflowStatus(executionId)
        setExecution(exec)
      } catch { /* silent */ }
    }, 4000)
    return () => clearInterval(interval)
  }, [hasRunningSteps, executionId])

  // ── 6. Inline card save handler ─────────────────────────
  const handleInlineSave = useCallback(async (card: EditingCard, editedData: Record<string, any>) => {
    if (!executionId || !activeTab) return
    const template = STEP_DISPLAY_TEMPLATE.find(t => t.tabKey === activeTab)
    const stepKeyForApi = template?.stepKeys[0] ?? activeTab
    const fullData = JSON.parse(JSON.stringify(tabData[activeTab] ?? {}))
    for (const k of Object.keys(fullData)) { if (k.startsWith('_')) delete fullData[k] }
    if (card.mergeType === 'dict-entry' && card.parentKey && card.dictKey) {
      if (!fullData[card.parentKey]) fullData[card.parentKey] = {}
      fullData[card.parentKey][card.dictKey] = editedData
    } else if (card.mergeType === 'array-item' && card.parentKey != null && card.arrayIndex != null) {
      if (!Array.isArray(fullData[card.parentKey])) fullData[card.parentKey] = []
      fullData[card.parentKey][card.arrayIndex] = editedData
    } else {
      Object.assign(fullData, editedData)
    }
    await apiClient.editStep(executionId, stepKeyForApi, fullData, {
      org_id: '', project_id: projectId, episode_id: episodeId, part_id: partId,
    })
    setTabData(prev => { const copy = { ...prev }; delete copy[activeTab]; return copy })
    const history = await apiClient.getStepHistory(executionId, stepKeyForApi)
    setStepVersions(prev => ({ ...prev, [activeTab]: history }))
  }, [executionId, activeTab, tabData, projectId, episodeId, partId])


  // ── Loading / Error states ────────────────────────────────
  if (partLoading) {
    return <div className="flex items-center justify-center h-full min-h-0"><Loader2 size={24} className="animate-spin text-accent" /></div>
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center h-full min-h-0 gap-4"><AlertCircle size={32} className="text-red-400" /><p className="text-sm text-muted-foreground">{error}</p><Button variant="outline" size="sm" onClick={fetchBase}><RefreshCw size={13} className="mr-2" /> Retry</Button></div>
  }

  // ── Polling screen — waiting for execution to be created ────
  if (awaitingExecution && !execution) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-0 gap-4">
        <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10"><Loader2 size={32} className="animate-spin text-accent/60" /></div>
        <p className="text-base font-semibold text-foreground">{partTitle}</p>
        <p className="text-sm text-muted-foreground">Initializing workflow…</p>
        <p className="text-xs text-muted-foreground/60">Connecting to the pipeline service. This should only take a moment.</p>
      </div>
    )
  }

  if (!executionId && !awaitingExecution) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-0 gap-4">
        <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10"><Sparkles size={32} className="text-accent/40" /></div>
        <p className="text-base font-semibold text-foreground">{partTitle}</p>
        <p className="text-sm text-muted-foreground">No production pipeline is running for this part.</p>
        <p className="text-xs text-muted-foreground/60">Create a new part with a script to start the pipeline.</p>
      </div>
    )
  }

  // ── Main studio UI ────────────────────────────────────────
  return (
    <TooltipProvider>
      <ImageViewCtx.Provider value={(urls, index, label) => setViewingImage({ urls, startIndex: index, label })}>
      <ImageManageCtx.Provider value={{ onDelete: handleImageDelete, onUpload: handleImageUpload }}>
      <AnimatePresence>
        {viewingImage && (
          <ImageLightbox urls={viewingImage.urls} startIndex={viewingImage.startIndex} label={viewingImage.label} onClose={() => setViewingImage(null)} />
        )}
      </AnimatePresence>
      <div className="flex h-full min-h-0 bg-background overflow-hidden">

      {/* Left column: tab bar + scrollable content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* Tab bar — compact single row */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border/15 bg-background">
        <button onClick={() => { setTabData({}); setStepVersions({}); fetchBase() }} title="Refresh" className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-muted-foreground hover:bg-secondary/60 transition-all"><RefreshCw size={12} /></button>
        <div className="flex-1 min-w-0 flex items-center gap-1 relative">
          {tabCanScrollLeft && (
            <button onClick={() => scrollTabBar('left')} className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg border-2 border-border/40 bg-card hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all shadow-md hover:shadow-lg hover:scale-110">
              <ChevronLeft size={16} />
            </button>
          )}
          <div
            ref={tabBarRef}
            className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={checkTabScroll}
          >
          <div className="inline-flex h-9 items-center rounded-xl bg-background border border-border/60 p-1 shadow-sm gap-0.5 min-w-max">
            {templateTabs.map(tab => {
              const p = getPalette(tab.tabKey); const Icon = tab.icon
              const isActive = activeTab === tab.tabKey
              const isRunning = tab.status === 'running'
              const isLocked = tab.status === 'locked'
              const isReady = tab.status === 'ready'
              const isApproved = tab.status === 'approved'
              const isCompleted = tab.status === 'completed'
              const canClick = true
              return (
                <Tooltip key={tab.tabKey}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleTabChange(tab.tabKey)}
                      disabled={false}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-150',
                        isActive ? 'bg-accent text-accent-foreground shadow-sm'
                          : (isLocked || isReady) ? 'text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-secondary/30 opacity-50'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                      )}>
                      {isRunning ? <Loader2 size={12} className="animate-spin opacity-70 flex-shrink-0" />
                        : <Icon size={12} className={cn('flex-shrink-0', isActive ? 'text-accent-foreground' : p.accent)} />}
                      <span className="">{tab.label}</span>
                      {tab.versionNo > 0 && <span className="text-[9px] opacity-60">v{tab.versionNo}</span>}
                      {isRunning && <span className="text-[9px] opacity-60 animate-pulse ml-0.5">&#8226;</span>}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {tab.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>          </div>
          {tabCanScrollRight && (
            <button onClick={() => scrollTabBar('right')} className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg border-2 border-border/40 bg-card hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all shadow-md hover:shadow-lg hover:scale-110">
              <ChevronRight size={16} />
            </button>
          )}        </div>
      </div>

      {/* Content + AI panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Scrollable main content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
          {tabLoading || (activeTemplate?.status === 'running' && !tabData[activeTab ?? '']) ? (
            <div className="flex flex-col items-center justify-center min-h-[320px] gap-5">
              <div className="p-5 rounded-2xl bg-accent/10 border border-accent/20">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">{activeTemplate?.label ?? 'Loading'}</p>
                <p className="text-sm text-muted-foreground mt-1.5">Loading step data…</p>
              </div>
            </div>
          ) : !activeTab ? (
            <div className="flex flex-col items-center justify-center gap-4 text-center min-h-[300px]">
              <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10"><Sparkles size={32} className="text-accent/40" /></div>
              <p className="text-sm font-medium text-muted-foreground">
                {completedTabs.length === 0 ? 'Select a step tab above to start generating' : 'Select a step to view its output'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={activeTab + (selectedVersionId[activeTab] ?? '')} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                {tabData[activeTab] ? (
                  <>
                    {/* ── Approval banner ─────────────────────────────────────────────────
                        Uses tabApprovalState to handle both single-step and multi-step tabs.
                        Multi-step tabs (Characters, Locations) show granular sub-step CTAs:
                          e.g. "Approve & Generate Anchor Images" after run_key_location succeeds.
                    */}
                    {activeTemplate?.status === 'completed' && tabApprovalState?.nextStatus === 'not_started' && (
                      // Current sub-step succeeded, next not yet queued — show Approve CTA
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-accent/30 bg-accent/5"
                      >
                        <Sparkles size={16} className="text-accent flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{tabApprovalState.currentLabel} complete</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tabApprovalState.isLastConstituent
                              ? 'Review the output, then approve to start the next step.'
                              : `Review the output, then approve to generate ${tabApprovalState.nextLabel}.`
                            }
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(tabApprovalState.approveKey)}
                          disabled={!!approvingStep}
                          className="flex-shrink-0 gap-1.5"
                        >
                          {approvingStep === tabApprovalState.approveKey
                            ? <Loader2 size={12} className="animate-spin" />
                            : <CheckCircle2 size={12} />}
                          {approvingStep === tabApprovalState.approveKey
                            ? 'Approving…'
                            : tabApprovalState.isLastConstituent
                              ? 'Approve & Continue'
                              : `Approve & Generate ${tabApprovalState.nextLabel}`
                          }
                        </Button>
                      </motion.div>
                    )}

                    {/* In-progress banner: next sub-step is running (within this tab) */}
                    {tabApprovalState?.nextStatus === 'running' && !tabApprovalState.isLastConstituent && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-accent/20 bg-accent/5"
                      >
                        <Loader2 size={16} className="text-accent animate-spin flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {`Generating ${tabApprovalState.nextLabel ?? 'next step'}…`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">This may take a moment.</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                          <Loader2 size={11} className="text-accent animate-spin" />
                          <span className="text-[11px] text-accent font-medium">Running</span>
                        </div>
                      </motion.div>
                    )}
                    {/* Tab-level running banner: current tab itself is being generated (no constituent succeeded yet) */}
                    {activeTemplate?.status === 'running' && !tabApprovalState && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-accent/20 bg-accent/5"
                      >
                        <Loader2 size={16} className="text-accent animate-spin flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">Generating {activeTemplate.label}…</p>
                          <p className="text-xs text-muted-foreground mt-0.5">This may take a moment.</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                          <Loader2 size={11} className="text-accent animate-spin" />
                          <span className="text-[11px] text-accent font-medium">Running</span>
                        </div>
                      </motion.div>
                    )}
                    {/* approved status — no banner shown */}

                    {tabData[activeTab]?._layout === 'entity-page' ? (
                      <EntityPageRenderer
                        data={tabData[activeTab]!}
                        tabKey={activeTab}
                        approvedStepKeys={approvedStepKeySet}
                        onRequestEditCard={activeTemplate?.status === 'approved' ? undefined : handleEditCard}
                        onIterateImage={(payload) => {
                          setPanelTask({
                            mode: 'iterate',
                            targetType: 'entity-image',
                            item: {
                              stepKey: payload.stepKey,
                              anchorStepKey: payload.anchorStepKey,
                              referenceStepKey: payload.referenceStepKey,
                              imageType: payload.imageType,
                              imageUrl: payload.image.url,
                              imageLabel: payload.image.label,
                              entityName: payload.entityName,
                              sectionLabel: payload.sectionLabel,
                            },
                            label: `${payload.entityName} • ${payload.image.label}`,
                          })
                          setAiPanelOpen(true)
                        }}
                      />
                    ) : tabData[activeTab]?._layout === 'shots' ? (
                      <ShotsRenderer
                        data={tabData[activeTab]!}
                        executionId={executionId ?? ''}
                        onEditShot={handleEditShot}
                        onIterateShot={handleIterateShot}
                        onApproveShots={tabApprovalState?.nextStatus === 'not_started' ? () => handleApprove(tabApprovalState!.approveKey) : undefined}
                        approvingShots={approvingStep === tabApprovalState?.approveKey}
                        tabStatus={activeTemplate?.status}
                      />
                    ) : tabData[activeTab]?._layout === 'animations' ? (
                      <AnimationsRenderer
                        data={tabData[activeTab]!}
                        executionId={executionId ?? ''}
                        onEditClip={handleEditClip}
                        onIterateClip={handleIterateClip}
                        tabStatus={activeTemplate?.status}
                      />
                    ) : (
                      <UniversalRenderer
                        stepKey={activeTab}
                        data={tabData[activeTab] ?? {}}
                        approvedStepKeys={approvedStepKeySet}
                        onRequestEditCard={activeTemplate?.status === 'approved' ? undefined : handleEditCard}
                      />
                    )}
                  </>
                ) : (activeTemplate?.status === 'locked' || activeTemplate?.status === 'ready') ? (
                  <LockedStepPlaceholder
                    stepKey={activeTab}
                    stepName={activeTemplate?.label ?? stepDisplayName(activeTab)}
                    canGenerate={activeTemplate?.status === 'ready'}
                  />
                ) : activeTemplate?.status === 'running' ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[320px] gap-5">
                    <div className="p-5 rounded-2xl bg-accent/10 border border-accent/20">
                      <Loader2 className="w-10 h-10 text-accent animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-semibold text-foreground">{activeTemplate?.label ?? stepDisplayName(activeTab)}</p>
                      <p className="text-sm text-muted-foreground mt-1.5">{execution && !awaitingExecution ? 'Processing…' : 'Starting…'} this may take a moment.</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                      <Loader2 size={11} className="text-accent animate-spin" />
                      <span className="text-[11px] text-accent font-medium">{execution && !awaitingExecution ? 'Running' : 'Initializing'}</span>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 size={24} className="animate-spin text-accent/60" />
                    <p className="text-sm text-muted-foreground">Loading step data…</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
      </div>{/* end left column */}

      {/* AI right panel — always mounted, slides with CSS translate to avoid glitch */}
      <div
        className="relative flex-shrink-0 transition-[width] duration-300 ease-in-out overflow-visible"
        style={{ width: aiPanelOpen ? 360 : 0 }}
      >
        {/* Pull-tab — visible only when panel is closed */}
        <button
          onClick={() => setAiPanelOpen(true)}
          aria-label="Open AI Studio"
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -left-8 z-20 flex items-center gap-1.5 transition-all duration-300',
            'bg-[hsl(240_8%_9%)] border border-border/30 border-r-0 rounded-l-xl',
            'px-2 py-3 shadow-lg',
            aiPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        >
          <span className="[writing-mode:vertical-rl] rotate-180 text-[15px] font-bold tracking-widest text-accent/80 uppercase select-none">AI Studio</span>
          <Sparkles size={11} className="text-accent/70 flex-shrink-0" />
        </button>

        <div
          className="h-full transition-transform duration-300 ease-in-out"
          style={{ transform: aiPanelOpen ? 'translateX(0)' : 'translateX(100%)', width: 360 }}
        >
          <AIRightPanel
            executionId={executionId ?? ''}
            orgId={''}
            projectId={projectId}
            episodeId={episodeId}
            partId={partId}
            isOpen={aiPanelOpen}
            onToggle={() => setAiPanelOpen(o => !o)}
            panelTask={panelTask}
            onCancelTask={() => setPanelTask(null)}
            onSaveEditCard={handleInlineSave}
            bibleData={tabData['show_bible'] ?? null}
          />
        </div>
      </div>
    </div>
    </ImageManageCtx.Provider>
    </ImageViewCtx.Provider>
    </TooltipProvider>
  )
}
