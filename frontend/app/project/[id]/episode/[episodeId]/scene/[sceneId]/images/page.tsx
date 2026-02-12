'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ImageIcon, Download, Trash2, ZoomIn, Columns, Grid, Camera, User2, MapPin, Puzzle, ChevronDown, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api-client'
import { StudioSectionLoader } from '@/components/studio-loading'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface ImageItem {
  id: string
  partId: string
  shotId: string | null
  imageUrl: string
  category: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

interface ShotInfo {
  id: string
  shotName: string
  shotNumber: number
}

const CATEGORIES = [
  { key: 'shot', label: 'Shot Images', icon: Camera, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20', gradient: 'from-accent/10 to-accent/5' },
  { key: 'character', label: 'Character Images', icon: User2, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', gradient: 'from-pink-500/10 to-pink-500/5' },
  { key: 'location', label: 'Location Images', icon: MapPin, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', gradient: 'from-emerald-500/10 to-emerald-500/5' },
  { key: 'props', label: 'Props Images', icon: Puzzle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', gradient: 'from-amber-500/10 to-amber-500/5' },
]

export default function ImagesPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const episodeId = params.episodeId as string
  const sceneId = params.sceneId as string
  const basePath = `/project/${projectId}/episode/${episodeId}/scene/${sceneId}`

  const [images, setImages] = useState<ImageItem[]>([])
  const [shots, setShots] = useState<ShotInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'columns' | 'grid'>('columns')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ shot: true, character: true, location: true, props: true })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [imageData, shotData] = await Promise.all([
          apiClient.getPartImages(sceneId),
          apiClient.getShots(sceneId),
        ])
        setImages(imageData.map((img: any) => ({ ...img, category: img.category || 'shot', shotId: img.shotId || null })))
        setShots(shotData.map((s: any) => ({ id: s.id, shotName: s.shotName, shotNumber: s.shotNumber })))
      } catch (err) {
        console.error('Failed to fetch images:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [projectId, episodeId, sceneId])

  const shotNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    shots.forEach(s => { map[s.id] = s.shotName })
    return map
  }, [shots])

  // Group images by category
  const imagesByCategory = useMemo(() => {
    const groups: Record<string, ImageItem[]> = { shot: [], character: [], location: [], props: [] }
    images.forEach(img => {
      const cat = img.category || 'shot'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(img)
    })
    return groups
  }, [images])

  // Group shot images by shotId
  const groupByShotId = (imgs: ImageItem[]) => {
    const groups: Record<string, ImageItem[]> = {}
    imgs.forEach(img => {
      const key = img.shotId || 'unsorted'
      if (!groups[key]) groups[key] = []
      groups[key].push(img)
    })
    return Object.entries(groups).sort((a, b) => {
      const sA = shots.find(s => s.id === a[0])
      const sB = shots.find(s => s.id === b[0])
      return (sA?.shotNumber || 0) - (sB?.shotNumber || 0)
    })
  }

  const handleDelete = async (imageId: string) => {
    try {
      await apiClient.deleteImage(imageId)
      setImages(prev => prev.filter(img => img.id !== imageId))
    } catch (err) {
      console.error('Failed to delete image:', err)
    }
  }

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Drag handler for images to AI panel
  const onDragStart = (e: React.DragEvent, img: ImageItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: img.id, src: img.imageUrl, title: img.shotId ? (shotNameMap[img.shotId] || 'Image') : 'Image', type: 'image'
    }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  if (loading) {
    return <div className="flex-1 p-6"><StudioSectionLoader message="Loading images..." /></div>
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative px-6 py-4 border-b border-border/50 flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-pink-500 via-accent/60 to-transparent" />
        <div className="flex items-center gap-3">
          <Link href={basePath}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-accent/10 hover:text-accent">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center">
              <ImageIcon size={16} className="text-pink-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Images</h1>
              <p className="text-[10px] text-muted-foreground">{images.length} images total — drag to AI panel</p>
            </div>
          </div>
          {/* Category badges */}
          <div className="flex items-center gap-2 ml-4">
            {CATEGORIES.map(cat => {
              const count = imagesByCategory[cat.key]?.length || 0
              if (count === 0) return null
              return (
                <Badge key={cat.key} variant="outline" className={cn("text-[10px]", cat.border, cat.color, cat.bg)}>
                  <cat.icon className="w-2.5 h-2.5 mr-1" />{count}
                </Badge>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
            <button onClick={() => setViewMode('columns')} className={cn('p-1.5 transition-colors', viewMode === 'columns' ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground')}>
              <Columns size={14} />
            </button>
            <button onClick={() => setViewMode('grid')} className={cn('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground')}>
              <Grid size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-5">
        {images.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-4"><ImageIcon size={28} className="text-pink-400" /></div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No images yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Images will appear here once generated for the shots in this part</p>
          </motion.div>
        ) : (
          CATEGORIES.map((cat, ci) => {
            const catImages = imagesByCategory[cat.key] || []
            if (catImages.length === 0) return null
            const expanded = expandedCategories[cat.key]
            const CatIcon = cat.icon

            return (
              <motion.div key={cat.key} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.08 }}
                className={cn("rounded-2xl border overflow-hidden", cat.border, expanded ? "shadow-sm" : "")}>
                {/* Category header */}
                <button onClick={() => toggleCategory(cat.key)}
                  className={cn("w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-card/80", `bg-gradient-to-r ${cat.gradient} to-transparent`)}>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", cat.bg)}>
                      <CatIcon className={cn("w-4 h-4", cat.color)} />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-foreground">{cat.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{catImages.length} image{catImages.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                </button>

                {/* Category content */}
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
                      <div className="p-5 border-t border-border/20">
                        {cat.key === 'shot' && viewMode === 'columns' ? (
                          /* Shot images grouped by shot in columns */
                          <div className="flex gap-5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                            {groupByShotId(catImages).map(([shotId, imgs], colIdx) => (
                              <div key={shotId} className="flex-shrink-0 w-[280px]">
                                <div className="mb-3 px-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-500" />
                                    <h3 className="text-sm font-bold text-foreground truncate">{shotNameMap[shotId] || `Shot ${shotId.slice(-4)}`}</h3>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground pl-4">{imgs.length} image{imgs.length !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="space-y-3">
                                  {imgs.map((img, imgIdx) => (
                                    <DraggableImageCard key={img.id} img={img} imgIdx={imgIdx} colIdx={colIdx}
                                      shotName={shotNameMap[img.shotId || ''] || 'Shot'}
                                      onDragStart={onDragStart}
                                      onPreview={() => setPreviewImage(img.imageUrl)}
                                      onDelete={() => handleDelete(img.id)} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : viewMode === 'columns' ? (
                          /* Non-shot images in a simple grid */
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {catImages.map((img, i) => (
                              <DraggableImageCard key={img.id} img={img} imgIdx={i} colIdx={0}
                                shotName={cat.label}
                                onDragStart={onDragStart}
                                onPreview={() => setPreviewImage(img.imageUrl)}
                                onDelete={() => handleDelete(img.id)} />
                            ))}
                          </div>
                        ) : (
                          /* Grid view */
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {catImages.map((img, i) => (
                              <div key={img.id} draggable onDragStart={(e) => onDragStart(e, img)} className="cursor-grab active:cursor-grabbing">
                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                                className="group relative rounded-xl overflow-hidden border border-border/30 bg-card/50 hover:border-accent/30 transition-all duration-300 shadow-sm hover:shadow-lg aspect-square">
                                <img src={img.imageUrl} alt={`Image ${i + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewImage(img.imageUrl)} loading="lazy" />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="p-1 rounded-md bg-black/40 backdrop-blur-sm"><GripVertical size={12} className="text-white" /></div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3">
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[10px] text-white/80 font-medium">Drag to panel</span>
                                    <div className="flex items-center gap-1.5">
                                      <button onClick={() => setPreviewImage(img.imageUrl)} className="p-1 rounded-md bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"><ZoomIn size={12} /></button>
                                      <button onClick={() => handleDelete(img.id)} className="p-1 rounded-md bg-red-500/20 backdrop-blur-sm hover:bg-red-500/40 text-white"><Trash2 size={12} /></button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                              </div>
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
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setPreviewImage(null)}>
            <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.2 }}
              src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DraggableImageCard({ img, imgIdx, colIdx, shotName, onDragStart, onPreview, onDelete }: {
  img: ImageItem; imgIdx: number; colIdx: number; shotName: string
  onDragStart: (e: React.DragEvent, img: ImageItem) => void
  onPreview: () => void; onDelete: () => void
}) {
  return (
    <div draggable onDragStart={(e) => onDragStart(e, img)} className="cursor-grab active:cursor-grabbing">
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: colIdx * 0.08 + imgIdx * 0.04 }}
      className="group relative rounded-xl overflow-hidden border border-border/30 bg-card/50 hover:border-accent/30 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-accent/5">
      <img src={img.imageUrl} alt={`${shotName} - Image ${imgIdx + 1}`} className="w-full h-auto object-cover cursor-pointer" onClick={onPreview} loading="lazy" />
      {/* Drag hint */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1 rounded-md bg-black/40 backdrop-blur-sm"><GripVertical size={12} className="text-white" /></div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3">
        <div className="flex items-center gap-2 w-full">
          <button onClick={onPreview} className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-colors"><ZoomIn size={14} /></button>
          <a href={img.imageUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-colors"><Download size={14} /></a>
          <button onClick={onDelete} className="p-1.5 rounded-lg bg-red-500/20 backdrop-blur-sm hover:bg-red-500/40 text-white transition-colors ml-auto"><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-[10px] text-white font-medium">#{imgIdx + 1}</div>
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-0.5">
        <span className="text-[9px] text-white/70 font-medium">Drag to AI panel</span>
      </div>
    </motion.div>
    </div>
  )
}