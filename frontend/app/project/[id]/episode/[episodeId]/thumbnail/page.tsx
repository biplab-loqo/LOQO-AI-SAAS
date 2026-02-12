'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  RotateCw,
  Download,
  Check,
  Type,
  Layers,
  Palette,
  ImagePlus,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const stylePresets = [
  { id: 'cinematic', label: 'Cinematic', description: 'Film-grade color and composition' },
  { id: 'noir', label: 'Noir', description: 'High contrast, deep shadows' },
  { id: 'neon', label: 'Neon Noir', description: 'Cyberpunk tones, neon reflections' },
  { id: 'golden', label: 'Golden Hour', description: 'Warm amber, sunset tones' },
  { id: 'cold', label: 'Cold Blue', description: 'Desaturated, teal and steel' },
  { id: 'vintage', label: 'Vintage Film', description: '70s grain, muted warmth' },
]

const aspectRatios = [
  { id: '16:9', label: '16:9', width: 1920, height: 1080 },
  { id: '2.39:1', label: '2.39:1', width: 1920, height: 803 },
  { id: '4:3', label: '4:3', width: 1440, height: 1080 },
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
]

interface HistoryEntry {
  thumbnail: string
  prompt: string
  style: string
  timestamp: Date
}

export default function ThumbnailPage() {
  const params = useParams()
  const projectId = params.id as string
  const episodeId = params.episodeId as string
  const epNumber = Number.parseInt(episodeId.replace(/^0+/, ''), 10) || 1

  const episodeTitle = epNumber === 1 ? 'Pilot' : epNumber === 2 ? 'Unraveling' : 'Convergence'

  const [currentThumbnail, setCurrentThumbnail] = useState<string | null>(`/images/ep-0${epNumber}-thumb.jpg`)
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('cinematic')
  const [selectedRatio, setSelectedRatio] = useState('16:9')
  const [generating, setGenerating] = useState(false)
  const [justGenerated, setJustGenerated] = useState(false)
  const [overlayText, setOverlayText] = useState(`Episode ${epNumber}: ${episodeTitle}`)
  const [showTextOverlay, setShowTextOverlay] = useState(false)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [history, setHistory] = useState<HistoryEntry[]>([
    { thumbnail: `/images/ep-0${epNumber}-thumb.jpg`, prompt: 'Initial generation', style: 'cinematic', timestamp: new Date(Date.now() - 3600000) },
  ])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [zoom, setZoom] = useState(100)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleGenerate = () => {
    if (generating) return
    setGenerating(true)
    setTimeout(() => {
      const newThumb = `/images/ep-0${epNumber}-thumb.jpg`
      setCurrentThumbnail(newThumb)
      const entry: HistoryEntry = {
        thumbnail: newThumb,
        prompt: prompt || 'Auto-generated from episode context',
        style: selectedStyle,
        timestamp: new Date(),
      }
      const newHistory = [...history.slice(0, historyIndex + 1), entry]
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      setGenerating(false)
      setJustGenerated(true)
      setTimeout(() => setJustGenerated(false), 2000)
    }, 2800)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setCurrentThumbnail(history[newIndex].thumbnail)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setCurrentThumbnail(history[newIndex].thumbnail)
    }
  }

  const currentRatio = aspectRatios.find(r => r.id === selectedRatio) || aspectRatios[0]

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border bg-card px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-3">
            Episode {epNumber} Thumbnail
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            aria-label="Undo"
          >
            <Undo2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            aria-label="Redo"
          >
            <Redo2 size={14} />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </Button>
          <span className="text-xs text-muted-foreground font-mono w-10 text-center">{zoom}%</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setZoom(100)}
            aria-label="Fit to view"
          >
            <Maximize2 size={14} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent" aria-label="Download thumbnail">
            <Download size={12} className="mr-1.5" />
            Export
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={!currentThumbnail}
          >
            <Check size={12} className="mr-1.5" />
            Save as Cover
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 bg-background flex items-center justify-center p-8 overflow-auto">
          <div
            className="relative bg-secondary rounded-lg border border-border overflow-hidden shadow-lg transition-transform"
            style={{
              width: `${(currentRatio.width / currentRatio.height) * 360 * (zoom / 100)}px`,
              height: `${360 * (zoom / 100)}px`,
              maxWidth: '100%',
              maxHeight: '100%',
              filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
            }}
          >
            {currentThumbnail ? (
              <>
                <Image
                  src={currentThumbnail || "/placeholder.svg"}
                  alt={`Episode ${epNumber} - ${episodeTitle} thumbnail`}
                  fill
                  className="object-cover"
                  priority
                />
                {/* Text overlay */}
                {showTextOverlay && overlayText && (
                  <div className="absolute inset-0 flex items-end">
                    <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                      <p className="text-white text-lg font-bold drop-shadow-lg">{overlayText}</p>
                    </div>
                  </div>
                )}
                {/* Generation feedback */}
                {generating && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    <span className="text-sm text-foreground font-medium">Generating thumbnail...</span>
                    <span className="text-xs text-muted-foreground">Using style: {stylePresets.find(s => s.id === selectedStyle)?.label}</span>
                  </div>
                )}
                {justGenerated && (
                  <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/15 pointer-events-none animate-pulse">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/90 backdrop-blur border border-emerald-500/30">
                      <Check size={16} className="text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Thumbnail Generated</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <ImagePlus size={32} />
                <span className="text-sm font-medium">No thumbnail yet</span>
                <span className="text-xs">Use the prompt panel to generate one</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Controls */}
        <div className="w-80 border-l border-border bg-card flex flex-col overflow-y-auto flex-shrink-0">
          {/* Prompt Section */}
          <div className="p-4 border-b border-border">
            <label htmlFor="thumb-prompt" className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">
              Prompt
            </label>
            <textarea
              ref={textareaRef}
              id="thumb-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe the thumbnail for "${episodeTitle}"... or leave empty for auto-generation from episode context`}
              className="w-full h-24 px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Button
              className="w-full mt-3 bg-accent hover:bg-accent/90 text-accent-foreground"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <RotateCw size={14} className="mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} className="mr-2" />
                  Generate Thumbnail
                </>
              )}
            </Button>
          </div>

          {/* Style Presets */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={12} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Style</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {stylePresets.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={cn(
                    'px-3 py-2 rounded-md border text-left transition-colors',
                    selectedStyle === style.id
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-secondary hover:border-muted-foreground/30'
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium block',
                    selectedStyle === style.id ? 'text-accent' : 'text-foreground'
                  )}>{style.label}</span>
                  <span className="text-[10px] text-muted-foreground">{style.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={12} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Aspect Ratio</span>
            </div>
            <div className="flex gap-2">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() => setSelectedRatio(ratio.id)}
                  className={cn(
                    'flex-1 px-2 py-1.5 rounded-md border text-center text-xs font-medium transition-colors',
                    selectedRatio === ratio.id
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-secondary text-muted-foreground hover:border-muted-foreground/30'
                  )}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Overlay */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Type size={12} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Text Overlay</span>
              </div>
              <button
                onClick={() => setShowTextOverlay(!showTextOverlay)}
                className={cn(
                  'w-8 h-4 rounded-full transition-colors relative',
                  showTextOverlay ? 'bg-accent' : 'bg-secondary'
                )}
                aria-label={showTextOverlay ? 'Hide text overlay' : 'Show text overlay'}
              >
                <span className={cn(
                  'absolute top-0.5 w-3 h-3 rounded-full bg-foreground transition-transform',
                  showTextOverlay ? 'translate-x-4' : 'translate-x-0.5'
                )} />
              </button>
            </div>
            {showTextOverlay && (
              <input
                type="text"
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Overlay text..."
              />
            )}
          </div>

          {/* Adjustments */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal size={12} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Adjustments</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Brightness', value: brightness, set: setBrightness },
                { label: 'Contrast', value: contrast, set: setContrast },
                { label: 'Saturation', value: saturation, set: setSaturation },
              ].map((adj) => (
                <div key={adj.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{adj.label}</span>
                    <span className="text-xs text-foreground font-mono">{adj.value}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={adj.value}
                    onChange={(e) => adj.set(Number(e.target.value))}
                    className="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer accent-accent"
                    aria-label={adj.label}
                  />
                </div>
              ))}
              <button
                onClick={() => { setBrightness(100); setContrast(100); setSaturation(100) }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset adjustments
              </button>
            </div>
          </div>

          {/* History */}
          <div className="p-4 flex-1">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 block">
              History ({history.length})
            </span>
            <div className="space-y-2">
              {[...history].reverse().map((entry, i) => {
                const actualIndex = history.length - 1 - i
                const isCurrent = actualIndex === historyIndex
                return (
                  <button
                    key={`${entry.timestamp.getTime()}-${actualIndex}`}
                    onClick={() => {
                      setHistoryIndex(actualIndex)
                      setCurrentThumbnail(entry.thumbnail)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors',
                      isCurrent ? 'bg-accent/10 border border-accent/20' : 'hover:bg-secondary border border-transparent'
                    )}
                  >
                    <div className="w-12 h-8 rounded bg-secondary border border-border overflow-hidden flex-shrink-0 relative">
                      <Image src={entry.thumbnail || "/placeholder.svg"} alt="History entry" fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{entry.prompt}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.style} -- {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    {isCurrent && <Check size={12} className="text-accent flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border space-y-2">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs bg-transparent">
              <Copy size={12} className="mr-2" />
              Duplicate as Starting Point
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => {
                setCurrentThumbnail(null)
                setHistory([])
                setHistoryIndex(-1)
              }}
            >
              <Trash2 size={12} className="mr-2" />
              Remove Thumbnail
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
