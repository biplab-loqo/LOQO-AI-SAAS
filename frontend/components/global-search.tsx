'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Film, Clapperboard, Layers, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'

interface SearchResult {
  type: 'project' | 'episode' | 'part'
  id: string
  label: string
  sub: string
  href: string
  icon: React.ElementType
  color: string
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [allItems, setAllItems] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch all data for search index on open
  const loadSearchData = useCallback(async () => {
    try {
      setLoading(true)
      const projects = await apiClient.getProjects()
      const items: SearchResult[] = []

      for (const proj of projects) {
        items.push({
          type: 'project', id: proj.id, label: proj.name,
          sub: proj.description || 'Project',
          href: `/project/${proj.id}`, icon: Film, color: 'text-accent',
        })
        try {
          const full = await apiClient.getProjectFull(proj.id)
          for (const ep of full.episodes) {
            items.push({
              type: 'episode', id: ep.id,
              label: `Episode ${ep.episodeNumber}`,
              sub: `${proj.name} · ${ep.parts.length} parts`,
              href: `/project/${proj.id}/episode/${ep.id}`,
              icon: Clapperboard, color: 'text-blue-400',
            })
            for (const part of ep.parts) {
              items.push({
                type: 'part', id: part.id, label: part.title,
                sub: `${proj.name} · Ep ${ep.episodeNumber} · Part ${part.partNumber}`,
                href: `/project/${proj.id}/episode/${ep.id}/part/${part.id}`,
                icon: Layers, color: 'text-emerald-400',
              })
            }
          }
        } catch { /* skip */ }
      }

      setAllItems(items)
      setResults(items.slice(0, 12))
    } catch (err) {
      console.error('Failed to load search data', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Filter results when query changes
  useEffect(() => {
    if (!query.trim()) { setResults(allItems.slice(0, 12)); setSelectedIdx(0); return }
    const q = query.toLowerCase()
    const filtered = allItems.filter(
      item => item.label.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q)
    )
    setResults(filtered.slice(0, 15))
    setSelectedIdx(0)
  }, [query, allItems])

  // Load data when opened
  useEffect(() => {
    if (open && allItems.length === 0) loadSearchData()
  }, [open, allItems.length, loadSearchData])

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard shortcut: Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = (result: SearchResult) => {
    setOpen(false); setQuery(''); router.push(result.href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(prev => Math.min(prev + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(prev => Math.max(prev - 1, 0)) }
    else if (e.key === 'Enter' && results[selectedIdx]) { e.preventDefault(); handleSelect(results[selectedIdx]) }
  }

  const typeLabels: Record<string, string> = { project: 'Projects', episode: 'Episodes', part: 'Parts' }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = []
    acc[item.type].push(item)
    return acc
  }, {})

  let flatIdx = -1

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/60 hover:border-accent/30 text-muted-foreground hover:text-foreground transition-all text-sm min-w-[180px]"
      >
        <Search size={15} />
        <span className="hidden sm:inline text-muted-foreground">Search...</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-background/50 border border-border/50 text-[10px] font-mono text-muted-foreground ml-auto">
          ⌘K
        </kbd>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[150]" onClick={() => setOpen(false)} />
          <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[560px] max-w-[90vw] z-[200] rounded-xl border border-border/50 bg-card shadow-2xl shadow-black/40 overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
              <Search size={15} className="text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef} value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search projects, episodes, parts..."
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[380px] overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center">
                  <Sparkles className="w-5 h-5 text-accent animate-pulse mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Loading search index...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {query ? `No results for "${query}"` : 'No items found'}
                </div>
              ) : (
                Object.entries(grouped).map(([type, items]) => (
                  <div key={type}>
                    <div className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest bg-secondary/30">
                      {typeLabels[type] || type}
                    </div>
                    {items.map(item => {
                      flatIdx++
                      const idx = flatIdx
                      const Icon = item.icon
                      return (
                        <button key={`${item.type}-${item.id}`} onClick={() => handleSelect(item)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/10 transition-colors",
                            idx === selectedIdx && "bg-accent/10"
                          )}>
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-secondary/50", item.color)}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                          </div>
                          <span className="text-xs text-muted-foreground/50 flex-shrink-0 capitalize">{item.type}</span>
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border/50 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-secondary text-[10px]">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-secondary text-[10px]">↵</kbd> Open</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-secondary text-[10px]">Esc</kbd> Close</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
