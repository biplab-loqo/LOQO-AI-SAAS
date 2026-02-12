'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { UserCircle, ChevronRight, X, ImageIcon, Loader2, Eye } from 'lucide-react'
import { apiClient, AssetOut, AssetDetailOut } from '@/lib/api-client'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CharacterContent {
  "Name/Identifier"?: string
  "Cultural Context"?: string
  "Visual Design"?: string
  "Age & Gender"?: string
  "Physical Description"?: string
  Attire?: string
  [key: string]: any
}

export default function CharactersPage() {
  const params = useParams()
  const projectId = params.id as string

  const [characters, setCharacters] = useState<AssetOut[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AssetDetailOut | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    apiClient.getCharacters(projectId)
      .then(setCharacters)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    if (!selectedId || !projectId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    apiClient.getCharacter(projectId, selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selectedId, projectId])

  const parseContent = (content: string): CharacterContent => {
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
              <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                <UserCircle className="w-4 h-4 text-pink-400" />
              </div>
              Characters
              {!loading && (
                <span className="text-xs font-medium text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">
                  {characters.length}
                </span>
              )}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Character List */}
        <div className="w-80 border-r border-border/40 overflow-y-auto bg-card/40 flex-shrink-0
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-4">
                <UserCircle className="w-5 h-5 text-pink-400" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No characters yet</p>
              <p className="text-xs text-muted-foreground">Characters will appear here once added to the project.</p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {characters.map((char, i) => {
                const data = parseContent(char.content)
                const isActive = selectedId === char.id
                return (
                  <motion.button
                    key={char.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedId(isActive ? null : char.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group relative",
                      isActive
                        ? "bg-pink-500/10 border border-pink-500/20"
                        : "hover:bg-secondary/50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold",
                        isActive ? "bg-pink-500/20 text-pink-400" : "bg-secondary/60 text-muted-foreground"
                      )}>
                        {char.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold truncate", isActive ? "text-foreground" : "text-foreground/80")}>
                          {char.name}
                        </p>
                        {data["Age & Gender"] && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {data["Age & Gender"]}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={14} className={cn(
                        "text-muted-foreground/40 transition-transform flex-shrink-0",
                        isActive && "rotate-90 text-pink-400"
                      )} />
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Character Detail */}
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
                  <UserCircle className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Select a character</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Click on a character to view details and reference images</p>
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
                {/* Character Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-xl font-bold text-pink-400 flex-shrink-0">
                    {detail.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{detail.name}</h2>
                    {(() => {
                      const data = parseContent(detail.content)
                      return (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {data["Age & Gender"] && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                              {data["Age & Gender"]}
                            </span>
                          )}
                          {data["Cultural Context"] && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {data["Cultural Context"]}
                            </span>
                          )}
                          {data["Visual Design"] && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {data["Visual Design"]}
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Character Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {(() => {
                    const data = parseContent(detail.content)
                    const fields = [
                      { key: "Physical Description", label: "Physical Description", color: "text-pink-400" },
                      { key: "Attire", label: "Attire", color: "text-amber-400" },
                      { key: "Cultural Context", label: "Cultural Context", color: "text-emerald-400" },
                      { key: "Visual Design", label: "Visual Design", color: "text-blue-400" },
                    ]
                    return fields.filter(f => data[f.key]).map(f => (
                      <div key={f.key} className="rounded-xl border border-border/50 bg-card/60 p-4">
                        <p className={cn("text-[10px] font-bold uppercase tracking-[0.15em] mb-2", f.color)}>
                          {f.label}
                        </p>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {data[f.key]}
                        </p>
                      </div>
                    ))
                  })()}
                </div>

                {/* Reference Images */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon size={14} className="text-pink-400" />
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
                          className="group relative aspect-square rounded-xl overflow-hidden border border-border/50 bg-secondary/30 cursor-pointer"
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
