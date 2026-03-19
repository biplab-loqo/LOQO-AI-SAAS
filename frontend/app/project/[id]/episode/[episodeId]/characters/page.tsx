'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Users2, Loader2, ImageIcon, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient, type CharacterOut } from '@/lib/api-client'
import { motion, AnimatePresence } from 'framer-motion'

function s3ToUrl(uri: string): string {
  if (!uri) return ''
  if (uri.startsWith('http')) return uri
  if (uri.startsWith('s3://')) {
    const rest = uri.slice(5)
    const slash = rest.indexOf('/')
    if (slash > 0) {
      const bucket = rest.slice(0, slash)
      const key = rest.slice(slash + 1)
      return `https://${bucket}.s3.amazonaws.com/${key}`
    }
  }
  return uri
}

interface ParsedCharacter {
  id: string
  name: string
  description: Record<string, any>
  anchorImages: { url: string; label: string }[]
  viewPackImages: { url: string; label: string }[]
  collageImage?: { url: string; label: string }
  version: number
  isApproved: boolean
}

function parseCharacter(row: CharacterOut): ParsedCharacter {
  const desc = row.character_description || {}
  const name = String(
    desc.display_name || desc.character_name || desc.name_identifier || desc.name || 'Unknown'
  )

  const anchors = (row.anchor_images || [])
    .filter(img => img.s3_uri)
    .map((img, i) => ({
      url: s3ToUrl(img.s3_uri!),
      label: img.display_name || img.file_name || `Anchor ${i + 1}`,
    }))

  const views = (row.view_pack_images || [])
    .filter(img => img.s3_uri)
    .map((img, i) => ({
      url: s3ToUrl(img.s3_uri!),
      label: img.display_name || img.file_name || `Reference ${i + 1}`,
    }))

  const collage = row.collage_image?.s3_uri
    ? { url: s3ToUrl(row.collage_image.s3_uri), label: row.collage_image.display_name || 'Collage' }
    : undefined

  return { id: row.id, name, description: desc, anchorImages: anchors, viewPackImages: views, collageImage: collage, version: row.version, isApproved: !!row.is_approved }
}

function ImageCard({ url, label }: { url: string; label: string }) {
  const [err, setErr] = useState(false)
  const [viewing, setViewing] = useState(false)

  if (!url || err) {
    return (
      <div className="rounded-xl border border-border/20 bg-muted/20 flex items-center justify-center h-40">
        <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
      </div>
    )
  }

  return (
    <>
      <div className="group/img relative rounded-xl border border-border/20 bg-black/5 dark:bg-white/5 overflow-hidden cursor-pointer"
        onClick={() => setViewing(true)}>
        <img src={url} alt={label} onError={() => setErr(true)} className="w-full h-auto object-contain block" loading="lazy" />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
          <p className="text-[10px] text-white/90 font-medium truncate">{label}</p>
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
          <button className="p-1.5 rounded-md bg-black/50 text-white/80 hover:bg-black/70 transition-all">
            <Eye size={11} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {viewing && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={() => setViewing(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              className="relative max-w-[92vw] max-h-[92vh]" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewing(false)} className="absolute -top-3.5 -right-3.5 z-10 w-8 h-8 rounded-full bg-card border border-border/50 flex items-center justify-center text-foreground hover:bg-secondary transition-all shadow-xl">
                ✕
              </button>
              <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img src={url} alt={label} className="max-w-[92vw] max-h-[82vh] object-contain block" />
              </div>
              <p className="mt-2 text-center text-white/70 text-sm font-medium">{label}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function CharactersPage() {
  const params = useParams()
  const projectId = params.id as string
  const episodeId = params.episodeId as string

  const [characters, setCharacters] = useState<ParsedCharacter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    apiClient.getEpisodeCharacters(episodeId)
      .then(rows => {
        if (!alive) return
        setCharacters(rows.map(parseCharacter))
      })
      .catch(err => {
        if (alive) setError(err?.message ?? 'Failed to load characters')
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [episodeId])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-border/30 bg-background">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Users2 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Characters</h1>
            <p className="text-xs text-muted-foreground">Episode-level character assets</p>
          </div>
        </div>
        <span className="ml-auto text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
          {characters.length} character{characters.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-accent/60" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <Users2 className="w-8 h-8 text-violet-400/40" />
            </div>
            <p className="text-base font-semibold text-foreground">No Characters Yet</p>
            <p className="text-sm text-muted-foreground">Characters will appear here once generated in a part.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {characters.map((char, idx) => (
              <motion.div key={char.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Character name header */}
                <div className="px-5 py-4 border-b border-border/20 bg-gradient-to-r from-violet-500/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                      <Users2 className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-foreground truncate">{char.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">v{char.version}</span>
                        {char.isApproved && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">✓ Approved</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description fields */}
                <div className="px-5 py-3 space-y-1 border-b border-border/10">
                  {Object.entries(char.description)
                    .filter(([k, v]) => typeof v === 'string' && v.length > 0 && !k.startsWith('_'))
                    .slice(0, 5)
                    .map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[minmax(80px,30%)_1fr] gap-2 py-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 break-words">{k.replace(/_/g, ' ')}</span>
                        <span className="text-[12px] text-foreground/80 leading-relaxed line-clamp-3">{String(v)}</span>
                      </div>
                    ))
                  }
                </div>

                {/* Anchor images */}
                {char.anchorImages.length > 0 && (
                  <div className="px-5 py-3 border-b border-border/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2">Anchor Images</p>
                    <div className="grid grid-cols-2 gap-2">
                      {char.anchorImages.map((img, i) => (
                        <ImageCard key={i} url={img.url} label={img.label} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Reference images */}
                {char.viewPackImages.length > 0 && (
                  <div className="px-5 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-2">Reference Images</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {char.viewPackImages.slice(0, 6).map((img, i) => (
                        <ImageCard key={i} url={img.url} label={img.label} />
                      ))}
                    </div>
                    {char.viewPackImages.length > 6 && (
                      <p className="text-[10px] text-muted-foreground mt-1.5">+{char.viewPackImages.length - 6} more</p>
                    )}
                  </div>
                )}

                {/* Collage */}
                {char.collageImage && (
                  <div className="px-5 py-3 border-t border-border/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">Collage</p>
                    <ImageCard url={char.collageImage.url} label={char.collageImage.label} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
