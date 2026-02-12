'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Box, ChevronRight, X, ImageIcon, Loader2, Eye } from 'lucide-react'
import { apiClient, AssetOut, AssetDetailOut } from '@/lib/api-client'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PropContent {
  name?: string
  description?: string
  category?: string
  details?: string
  [key: string]: any
}

export default function PropsPage() {
  const params = useParams()
  const projectId = params.id as string

  const [props, setProps] = useState<AssetOut[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AssetDetailOut | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    apiClient.getProps(projectId)
      .then(setProps)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    if (!selectedId || !projectId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    apiClient.getProp(projectId, selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selectedId, projectId])

  const parseContent = (content: string): PropContent => {
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
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Box className="w-4 h-4 text-orange-400" />
              </div>
              Props &amp; Extras
              {!loading && (
                <span className="text-xs font-medium text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">
                  {props.length}
                </span>
              )}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Props List */}
        <div className="w-80 border-r border-border/40 overflow-y-auto bg-card/40 flex-shrink-0
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : props.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                <Box className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No props yet</p>
              <p className="text-xs text-muted-foreground">Props & extras will appear here once added to the project.</p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {props.map((prop, i) => {
                const isActive = selectedId === prop.id
                return (
                  <motion.button
                    key={prop.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedId(isActive ? null : prop.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group relative",
                      isActive
                        ? "bg-orange-500/10 border border-orange-500/20"
                        : "hover:bg-secondary/50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        isActive ? "bg-orange-500/20" : "bg-secondary/60"
                      )}>
                        <Box size={16} className={isActive ? "text-orange-400" : "text-muted-foreground"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold truncate", isActive ? "text-foreground" : "text-foreground/80")}>
                          {prop.name}
                        </p>
                        {prop.category && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5 capitalize">
                            {prop.category}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={14} className={cn(
                        "text-muted-foreground/40 transition-transform flex-shrink-0",
                        isActive && "rotate-90 text-orange-400"
                      )} />
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Prop Detail */}
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
                  <Box className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Select a prop</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Click on a prop to view details and reference images</p>
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
                {/* Prop Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Box className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{detail.name}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {detail.category && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 capitalize">
                          {detail.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prop Details */}
                {(() => {
                  const data = parseContent(detail.content)
                  const entries = Object.entries(data).filter(([k]) => k !== 'name' && k !== 'category')
                  if (entries.length === 0) return null
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {entries.map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-border/50 bg-card/60 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 text-orange-400">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Reference Images */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon size={14} className="text-orange-400" />
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
