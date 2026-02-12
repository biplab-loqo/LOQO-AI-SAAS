'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MapPin, ChevronRight, X, ImageIcon, Loader2, Eye, Sun, Building2, Globe } from 'lucide-react'
import { apiClient, AssetOut, AssetDetailOut } from '@/lib/api-client'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LocationContent {
  location_id?: string
  name?: string
  type?: string
  narrative_role?: string
  visual_profile?: {
    environment?: string
    cultural_or_era_style?: string
    architecture_or_space?: string
    lighting_time_of_day?: string
    key_objects_or_features?: string[]
  }
  [key: string]: any
}

export default function LocationsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [locations, setLocations] = useState<AssetOut[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AssetDetailOut | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    apiClient.getLocations(projectId)
      .then(setLocations)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    if (!selectedId || !projectId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    apiClient.getLocation(projectId, selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selectedId, projectId])

  const parseContent = (content: string): LocationContent => {
    try { return JSON.parse(content) } catch { return {} }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 px-6 py-5 bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-1">World Building</p>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
              Locations
              {!loading && (
                <span className="text-xs font-medium text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">
                  {locations.length}
                </span>
              )}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Location List */}
        <div className="w-80 border-r border-border/40 overflow-y-auto bg-card/40 flex-shrink-0
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No locations yet</p>
              <p className="text-xs text-muted-foreground">Locations will appear here once added to the project.</p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {locations.map((loc, i) => {
                const data = parseContent(loc.content)
                const isActive = selectedId === loc.id
                return (
                  <motion.button
                    key={loc.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedId(isActive ? null : loc.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group relative",
                      isActive
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : "hover:bg-secondary/50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        isActive ? "bg-emerald-500/20" : "bg-secondary/60"
                      )}>
                        <MapPin size={16} className={isActive ? "text-emerald-400" : "text-muted-foreground"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold truncate", isActive ? "text-foreground" : "text-foreground/80")}>
                          {loc.name}
                        </p>
                        {data.type && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {data.type}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={14} className={cn(
                        "text-muted-foreground/40 transition-transform flex-shrink-0",
                        isActive && "rotate-90 text-emerald-400"
                      )} />
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Location Detail */}
        <div className="flex-1 overflow-y-auto
          [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
          <AnimatePresence mode="wait">
            {!selectedId ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full text-center px-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-secondary/40 border border-border/50 flex items-center justify-center mb-4">
                  <MapPin className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Select a location</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Click on a location to view details and reference images</p>
              </motion.div>
            ) : detailLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-full"
              >
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </motion.div>
            ) : detail ? (
              <motion.div
                key={detail.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-6 max-w-4xl mx-auto"
              >
                {/* Location Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{detail.name}</h2>
                    {(() => {
                      const data = parseContent(detail.content)
                      return (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {data.type && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {data.type}
                            </span>
                          )}
                          {data.narrative_role && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {data.narrative_role}
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Visual Profile */}
                {(() => {
                  const data = parseContent(detail.content)
                  const vp = data.visual_profile
                  if (!vp) return null

                  const profileFields = [
                    { key: "environment", label: "Environment", icon: Globe, color: "text-emerald-400" },
                    { key: "architecture_or_space", label: "Architecture / Space", icon: Building2, color: "text-blue-400" },
                    { key: "cultural_or_era_style", label: "Cultural / Era Style", icon: Globe, color: "text-amber-400" },
                    { key: "lighting_time_of_day", label: "Lighting / Time of Day", icon: Sun, color: "text-yellow-400" },
                  ]

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {profileFields.filter(f => vp[f.key as keyof typeof vp]).map(f => {
                        const Icon = f.icon
                        return (
                          <div key={f.key} className="rounded-xl border border-border/50 bg-card/60 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon size={12} className={f.color} />
                              <p className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", f.color)}>
                                {f.label}
                              </p>
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              {vp[f.key as keyof typeof vp] as string}
                            </p>
                          </div>
                        )
                      })}

                      {vp.key_objects_or_features && vp.key_objects_or_features.length > 0 && (
                        <div className="rounded-xl border border-border/50 bg-card/60 p-4 md:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-purple-400 mb-2">
                            Key Objects & Features
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {vp.key_objects_or_features.map((obj, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Reference Images */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon size={14} className="text-emerald-400" />
                    <h3 className="text-sm font-bold text-foreground">Reference Images</h3>
                    {detail.images.length > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-full">
                        {detail.images.length}
                      </span>
                    )}
                  </div>

                  {detail.images.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-8 text-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No reference images yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {detail.images.map((img, i) => (
                        <motion.div
                          key={img.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-border/50 bg-secondary/30 cursor-pointer"
                          onClick={() => setLightboxImage(img.imageUrl)}
                        >
                          <img
                            src={img.imageUrl}
                            alt={img.name || detail.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                            <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {img.name && (
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                              <p className="text-[10px] text-white truncate">{img.name}</p>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[85vh] w-full"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
              <img
                src={lightboxImage}
                alt="Preview"
                className="w-full h-full object-contain rounded-xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
