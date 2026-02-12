'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Plus, Wand2, RefreshCw, LucideComponent as ImageIconComponent, Film } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AssetItem {
  id: string
  src: string
  title: string
  type: 'image' | 'clip'
  thumbnail?: string
}

interface RightPanelProps {
  selectedItem?: any
  allImages?: AssetItem[]
  allClips?: AssetItem[]
  onPromptSubmit?: (prompt: string) => void
  onRegenerate?: (tab: 'images' | 'clips' | 'beats' | 'shots' | 'storyboard') => void
  onIterate?: () => void
  onImageSelect?: (image: AssetItem) => void
  onClipUpdate?: (startImage: AssetItem, endImage: AssetItem) => void
  generatedResult?: any
  onCloseResult?: () => void
  // New props for beats, shots, storyboard generation
  onRegenerateBeats?: (prompt: string) => void
  onRegenerateShots?: (prompt: string) => void
  onRegenerateStoryboard?: (prompt: string) => void
  // New props for image/clip generation with modal
  onGenerateImage?: (prompt: string) => void
  onGenerateClip?: (prompt: string) => void
}

// Recents data - can be fetched from server/context
const recentItems = [
  { id: '1', title: 'Grand Entrance Scene', timestamp: '2 hours ago' },
  { id: '2', title: 'Palace Gates Close-up', timestamp: '4 hours ago' },
  { id: '3', title: 'Anticipation Build', timestamp: 'Yesterday' },
]

export function RightPanel({
  selectedItem,
  allImages = [],
  allClips = [],
  onPromptSubmit,
  onRegenerate,
  onIterate,
  onImageSelect,
  onClipUpdate,
  generatedResult,
  onCloseResult,
  onRegenerateBeats,
  onRegenerateShots,
  onRegenerateStoryboard,
  onGenerateImage,
  onGenerateClip,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'images' | 'clips' | 'beats' | 'shots' | 'storyboard'>('images')
  const [prompt, setPrompt] = useState('')
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedStartImage, setSelectedStartImage] = useState<AssetItem | null>(null)
  const [selectedEndImage, setSelectedEndImage] = useState<AssetItem | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [selectedImages, setSelectedImages] = useState<AssetItem[]>([])
  const [selectedImage, setSelectedImage] = useState<AssetItem | null>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }

  const handleDragLeave = () => {
    setIsDraggingOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    const draggedData = e.dataTransfer.getData('application/json')
    if (draggedData) {
      const image = JSON.parse(draggedData) as AssetItem
      console.log('[v0] Dropped image:', image)
      if (activeTab === 'images') {
        setSelectedImage(image) // Replace with the new dropped image
      } else if (activeTab === 'clips' && !selectedStartImage) {
        setSelectedStartImage(image)
      } else if (activeTab === 'clips' && selectedStartImage) {
        setSelectedEndImage(image)
      }
    }
  }

  const handlePromptSubmit = () => {
    if (prompt.trim()) {
      if (activeTab === 'beats' && onRegenerateBeats) {
        onRegenerateBeats(prompt)
      } else if (activeTab === 'shots' && onRegenerateShots) {
        onRegenerateShots(prompt)
      } else if (activeTab === 'storyboard' && onRegenerateStoryboard) {
        onRegenerateStoryboard(prompt)
      } else if (activeTab === 'images' && onGenerateImage) {
        onGenerateImage(prompt)
      } else if (activeTab === 'clips' && onGenerateClip) {
        onGenerateClip(prompt)
      } else {
        onPromptSubmit?.(prompt)
      }
      setPrompt('')
    }
  }

  const handleRegenerate = () => {
    if (activeTab === 'beats' && onRegenerateBeats) {
      onRegenerateBeats(prompt || 'Regenerate beats')
    } else if (activeTab === 'shots' && onRegenerateShots) {
      onRegenerateShots(prompt || 'Regenerate shots')
    } else if (activeTab === 'storyboard' && onRegenerateStoryboard) {
      onRegenerateStoryboard(prompt || 'Regenerate storyboard')
    } else if (activeTab === 'images' && onGenerateImage) {
      onGenerateImage(prompt || 'Generate image')
    } else if (activeTab === 'clips' && onGenerateClip) {
      onGenerateClip(prompt || 'Generate clip')
    } else {
      onRegenerate?.(activeTab)
    }
    setPrompt('')
  }

  return (
    <div className="w-96 border-l border-border/50 bg-card flex flex-col h-full">
      {/* Header with gradient */}
      <div className="relative px-4 py-3 border-b border-border/50 flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[hsl(var(--studio-purple))] via-[hsl(var(--studio-cyan))] to-[hsl(var(--studio-pink))] opacity-50" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
            <Wand2 className="w-3.5 h-3.5 text-accent" />
          </div>
          <h3 className="text-sm font-bold text-foreground">AI Studio</h3>
        </div>
      </div>

      {/* Tabs for all generation types */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-5 bg-secondary/30 border-b border-border/30 rounded-none h-10">
          <TabsTrigger value="beats" className="text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-accent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent font-semibold">Beats</TabsTrigger>
          <TabsTrigger value="shots" className="text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-accent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent font-semibold">Shots</TabsTrigger>
          <TabsTrigger value="storyboard" className="text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-accent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent font-semibold">Board</TabsTrigger>
          <TabsTrigger value="images" className="text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-accent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent font-semibold">Images</TabsTrigger>
          <TabsTrigger value="clips" className="text-[10px] rounded-none data-[state=active]:bg-accent/10 data-[state=active]:text-accent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent font-semibold">Clips</TabsTrigger>
        </TabsList>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-4 pb-4">
            {/* Beats Tab */}
            <TabsContent value="beats" className="mt-0 space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Quick Prompts
                </p>
                <div className="space-y-1.5">
                  {['Increase emotional tension', 'Add dialogue moment', 'Faster pacing', 'Add character reveal'].map((example) => (
                    <button
                      key={example}
                      onClick={() => setPrompt(example)}
                      className="w-full text-left px-3 py-2.5 text-xs rounded-lg border border-border/50 hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all duration-200"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Shots Tab */}
            <TabsContent value="shots" className="mt-0 space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Quick Prompts
                </p>
                <div className="space-y-1.5">
                  {['Wider camera angles', 'Add atmospheric fog', 'More movement', 'Warmer color grading'].map((example) => (
                    <button
                      key={example}
                      onClick={() => setPrompt(example)}
                      className="w-full text-left px-3 py-2.5 text-xs rounded-lg border border-border/50 hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all duration-200"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Storyboard Tab */}
            <TabsContent value="storyboard" className="mt-0 space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Quick Prompts
                </p>
                <div className="space-y-1.5">
                  {['More dynamic angles', 'Closer framing', 'Add transitions', 'Include character POV'].map((example) => (
                    <button
                      key={example}
                      onClick={() => setPrompt(example)}
                      className="w-full text-left px-3 py-2.5 text-xs rounded-lg border border-border/50 hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all duration-200"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="mt-0 space-y-4">
              {/* Select Images Button */}
              <Button
                onClick={() => setShowImageModal(true)}
                variant="outline"
                className="w-full h-9"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Select Images
              </Button>

              {/* Drag and Drop Area */}
              <div
                ref={dragRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 transition-all duration-300 cursor-pointer',
                  isDraggingOver
                    ? 'border-accent bg-accent/10 scale-[1.02] shadow-lg shadow-accent/10'
                    : 'border-border/50 hover:border-accent/30 hover:bg-accent/5'
                )}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-accent/70" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">Drag & drop images</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">from the Images tab</p>
                </div>
              </div>

              {/* Selected Images */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Attached Image
                </p>
                {!selectedImage ? (
                  <Card className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">No image attached</p>
                    <p className="text-xs text-muted-foreground mt-1">Drag & drop an image above</p>
                  </Card>
                ) : (
                  <div className="relative group">
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img
                        src={selectedImage.src || '/placeholder.svg'}
                        alt={selectedImage.title}
                        className="w-full aspect-video object-cover"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground truncate flex-1">
                        {selectedImage.title}
                      </p>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Clips Tab */}
            <TabsContent value="clips" className="mt-0 space-y-4">
              {/* Start Image Selection */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                  Start Image
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDraggingOver(false)
                    const draggedData = e.dataTransfer.getData('application/json')
                    if (draggedData) {
                      const image = JSON.parse(draggedData) as AssetItem
                      setSelectedStartImage(image)
                    }
                  }}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer',
                    isDraggingOver
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50 hover:bg-accent/5'
                  )}
                >
                  {!selectedStartImage ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <Upload className="w-6 h-6 text-muted-foreground/50 mb-1" />
                      <p className="text-xs font-medium text-foreground">Drag image here</p>
                      <p className="text-xs text-muted-foreground">or</p>
                      <Button
                        onClick={() => setShowImageModal(true)}
                        variant="ghost"
                        size="sm"
                        className="h-7 mt-1 text-accent hover:text-accent hover:bg-accent/10"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Select
                      </Button>
                    </div>
                  ) : (
                    <div className="relative group">
                      <img
                        src={selectedStartImage.src || '/placeholder.svg'}
                        alt={selectedStartImage.title}
                        className="w-full aspect-video object-cover rounded"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded flex items-center justify-center">
                        <button
                          onClick={() => setSelectedStartImage(null)}
                          className="opacity-0 group-hover:opacity-100 bg-destructive text-white px-3 py-1 rounded text-xs font-medium hover:bg-destructive/90 transition-all"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="text-xs text-foreground mt-1 truncate">{selectedStartImage.title}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* End Image Selection */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
                  End Image
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDraggingOver(false)
                    const draggedData = e.dataTransfer.getData('application/json')
                    if (draggedData) {
                      const image = JSON.parse(draggedData) as AssetItem
                      setSelectedEndImage(image)
                    }
                  }}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer',
                    isDraggingOver
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50 hover:bg-accent/5'
                  )}
                >
                  {!selectedEndImage ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <Upload className="w-6 h-6 text-muted-foreground/50 mb-1" />
                      <p className="text-xs font-medium text-foreground">Drag image here</p>
                      <p className="text-xs text-muted-foreground">or</p>
                      <Button
                        onClick={() => setShowImageModal(true)}
                        variant="ghost"
                        size="sm"
                        className="h-7 mt-1 text-accent hover:text-accent hover:bg-accent/10"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Select
                      </Button>
                    </div>
                  ) : (
                    <div className="relative group">
                      <img
                        src={selectedEndImage.src || '/placeholder.svg'}
                        alt={selectedEndImage.title}
                        className="w-full aspect-video object-cover rounded"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded flex items-center justify-center">
                        <button
                          onClick={() => setSelectedEndImage(null)}
                          className="opacity-0 group-hover:opacity-100 bg-destructive text-white px-3 py-1 rounded text-xs font-medium hover:bg-destructive/90 transition-all"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="text-xs text-foreground mt-1 truncate">{selectedEndImage.title}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Clip Settings - Removed duration input */}
            </TabsContent>
          </div>
        </ScrollArea>

        {/* Sticky Prompt & Action Buttons at Bottom */}
        <div className="border-t border-border/50 bg-card px-4 py-3 space-y-3 flex-shrink-0">
          {/* Prompt Label */}
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
            {activeTab === 'beats' ? 'Beat Generation Prompt'
              : activeTab === 'shots' ? 'Shot Generation Prompt'
                : activeTab === 'storyboard' ? 'Storyboard Prompt'
                  : activeTab === 'clips' ? 'Animation Prompt'
                    : 'Image Prompt'}
          </label>

          {/* Prompt Textarea */}
          <Textarea
            placeholder={
              activeTab === 'beats' ? 'Describe the beats you want to generate or modify...'
                : activeTab === 'shots' ? 'Describe the shots you want to generate...'
                  : activeTab === 'storyboard' ? 'Describe the storyboard panels you want...'
                    : 'Describe the changes you want...'
            }
            className="min-h-20 resize-none bg-background/50 text-xs rounded-xl border-border/50 focus:border-accent/50 focus:ring-accent/20 transition-all"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleRegenerate}
              size="sm"
              className="h-9 bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Generate
            </Button>
            <Button
              onClick={onIterate}
              size="sm"
              variant="outline"
              className="h-9 text-xs font-semibold rounded-lg border-border/50 hover:border-accent/30 hover:bg-accent/5 transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Iterate
            </Button>
          </div>
        </div>
      </Tabs>

      {/* Image Selection Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Image</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="grid grid-cols-3 gap-4 p-4">
              {allImages.map((img) => (
                <button
                  key={img.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy'
                    e.dataTransfer.setData('application/json', JSON.stringify(img))
                  }}
                  onClick={() => {
                    if (activeTab === 'clips') {
                      if (!selectedStartImage) {
                        setSelectedStartImage(img)
                      } else {
                        setSelectedEndImage(img)
                      }
                    } else if (activeTab === 'images') {
                      setSelectedImage(img)
                    }
                    setShowImageModal(false)
                  }}
                  className="group relative aspect-video rounded-lg overflow-hidden border border-border hover:border-accent transition-all cursor-grab active:cursor-grabbing"
                >
                  <img
                    src={img.src || '/placeholder.svg'}
                    alt={img.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white/0 group-hover:text-white transition-colors" />
                  </div>
                  <p className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-white text-xs truncate">
                    {img.title}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
