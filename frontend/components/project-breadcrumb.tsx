'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'

interface Crumb {
  label: string
  href: string
}

export function ProjectBreadcrumb() {
  const params = useParams()
  const pathname = usePathname()
  
  const projectId = params.id as string
  const episodeId = params.episodeId as string | undefined
  const partId = params.partId as string | undefined
  const sceneId = params.sceneId as string | undefined // Legacy support

  const [projectTitle, setProjectTitle] = useState<string>('Loading...')
  const [episodeLabel, setEpisodeLabel] = useState<string>(episodeId ? `Episode ...` : '')
  const [partLabel, setPartLabel] = useState<string>(partId ? `Part ...` : '')

  // Fetch data for labels
  useEffect(() => {
    let isMounted = true
    
    async function fetchLabels() {
      try {
        // 1. Fetch Project
        if (projectId) {
           // We might want to cache this or assume it's stable, but fetching is safer
           apiClient.getProject(projectId).then(p => {
             if(isMounted) setProjectTitle(p.name)
           }).catch(() => {
             if(isMounted) setProjectTitle('Project')
           })
        }

        // 2. Fetch Episode
        if (projectId && episodeId) {
          apiClient.getEpisode(projectId, episodeId).then(ep => {
            if(isMounted) setEpisodeLabel(`Episode ${ep.episodeNumber}`) // Show Serial Number
            // Optionally: setEpisodeLabel(`EP ${ep.episode_number}: ${ep.title}`)
          }).catch(() => {
             if(isMounted) setEpisodeLabel('Episode')
          })
        }

        // 3. Fetch Part
        if (projectId && episodeId && partId) {
          // Note: getPart returns basic info. 
          apiClient.getPart(projectId, episodeId, partId).then(p => {
             if(isMounted) setPartLabel(`Part ${p.partNumber}`)
          }).catch(() => {
             if(isMounted) setPartLabel('Part')
          })
        }

      } catch (err) {
        console.error("Breadcrumb fetch error", err)
      }
    }

    fetchLabels()
    
    return () => { isMounted = false }
  }, [projectId, episodeId, partId])

  // Build crumbs dynamically
  const crumbs: Crumb[] = [
    { label: projectTitle, href: `/project/${projectId}` },
  ]

  const projectBase = `/project/${projectId}`
  const relative = pathname?.replace(projectBase, '') ?? ''

  // Top-level pages
  if (relative.startsWith('/script')) {
    crumbs.push({ label: 'Script', href: `${projectBase}/script` })
  } else if (relative.startsWith('/bible')) {
    crumbs.push({ label: 'Bible', href: `${projectBase}/bible` })
  } else if (relative.startsWith('/characters')) {
    crumbs.push({ label: 'Characters', href: `${projectBase}/characters` })
  } else if (relative.startsWith('/locations')) {
    crumbs.push({ label: 'Locations', href: `${projectBase}/locations` })
  } else if (relative.startsWith('/episodes')) {
    // Only if we aren't already deep in an episode
    if (!episodeId) {
      crumbs.push({ label: 'Episodes', href: `${projectBase}/episodes` })
    }
  }

  // Episode-level
  if (episodeId) {
    crumbs.push({ label: 'Episodes', href: `${projectBase}/episodes` })
    crumbs.push({
      label: episodeLabel || `Episode`, 
      href: `${projectBase}/episode/${episodeId}`,
    })

    // Part-level
    if (partId) {
      crumbs.push({
        label: partLabel || `Part`,
        href: `${projectBase}/episode/${episodeId}/part/${partId}`,
      })
    }
    // Scene-level (legacy)
    else if (sceneId) {
       crumbs.push({
        label: `Part ${sceneId}`, // Fallback for legacy
        href: `${projectBase}/episode/${episodeId}/scene/${sceneId}`,
      })
    }
  }

  if (crumbs.length <= 1) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center">
      <ol className="flex items-center gap-1">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  size={12}
                  className="text-muted-foreground/50 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span
                  className="text-xs font-medium text-foreground"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Keeping ScopeSelector and CanonBadge roughly the same but simplified dependency
export function ScopeSelector() {
  return null 
}

export function CanonBadge({ level }: { level: 'project' | 'episode' | 'segment' }) {
    // ... existing implementation ...
  const config = {
    project: { label: 'Project Canon', className: 'bg-emerald-500/15 text-emerald-400' },
    episode: { label: 'Episode Override', className: 'bg-accent/15 text-accent' },
    segment: { label: 'Segment Local', className: 'bg-amber-500/15 text-amber-400' },
  }

  const { label, className } = config[level]

  return (
    <span className={cn('px-1.5 py-0.5 text-xs font-medium rounded inline-flex items-center gap-1', className)}>
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          level === 'project' && 'bg-emerald-400',
          level === 'episode' && 'bg-accent',
          level === 'segment' && 'bg-amber-400'
        )}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
