"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  Settings,
  Film,
  Play,
  Loader2,
  Home,
  ChevronDown,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { projectRefreshEvents } from '@/lib/refresh-events'
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

/* ════════════════════════════════════════════════════════════════
   NAVIGATION ITEM - Top-level nav (Dashboard, Team, Settings)
   ════════════════════════════════════════════════════════════════ */
function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string
  icon: React.ElementType
  label: string
  isActive: boolean
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-accent/15 text-accent shadow-sm shadow-accent/10"
            : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Icon size={18} className="flex-shrink-0" />
        <span>{label}</span>
      </motion.div>
    </Link>
  )
}

/* ════════════════════════════════════════════════════════════════
   SECTION HEADER
   ════════════════════════════════════════════════════════════════ */
function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   PROJECT ITEM
   ════════════════════════════════════════════════════════════════ */
function ProjectItem({
  id,
  name,
  isActive,
  href,
}: {
  id: string
  name: string
  isActive: boolean
  href: string
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200",
          isActive
            ? "bg-accent/15 text-accent font-semibold shadow-sm shadow-accent/10"
            : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Film size={16} className="flex-shrink-0" />
        <span>{name}</span>
      </motion.div>
    </Link>
  )
}

/* ════════════════════════════════════════════════════════════════
   EPISODE HEADER (Collapsible)
   ════════════════════════════════════════════════════════════════ */
function EpisodeHeader({
  episodeNumber,
  partCount,
  isExpanded,
  isActive,
  onToggle,
  href,
}: {
  episodeNumber: number
  partCount: number
  isExpanded: boolean
  isActive: boolean
  onToggle: () => void
  href: string
}) {
  const label = `Episode ${episodeNumber}`
  return (
    <Link href={href}>
      <motion.button
        onClick={(e) => {
          e.preventDefault()
          onToggle()
        }}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
          isActive
            ? "bg-accent/15 text-accent shadow-sm shadow-accent/10"
            : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <ChevronDown
          size={16}
          className={cn("flex-shrink-0 transition-transform duration-300", isExpanded ? "rotate-180" : "")}
        />
        <Play size={16} className="flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
          isActive
            ? "bg-accent/10 text-accent"
            : "bg-muted/60 text-foreground/60"
        )}>
          {partCount}
        </span>
      </motion.button>
    </Link>
  )
}

/* ════════════════════════════════════════════════════════════════
   PART ITEM (Child of Episode)
   ════════════════════════════════════════════════════════════════ */
function PartItem({
  partNumber,
  title,
  isActive,
  href,
}: {
  partNumber: number
  title: string
  isActive: boolean
  href: string
}) {
  const [isHovered, setIsHovered] = useState(false)
  const fullLabel = `Part ${partNumber} ${title}`
  const shouldAnimate = title.length > 20
  
  return (
    <Link href={href}>
      <motion.div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "w-4/5 ml-auto flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 overflow-hidden",
          isActive
            ? "bg-accent/20 text-accent font-semibold shadow-sm shadow-accent/10"
            : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <div className="min-w-0 flex-1 flex flex-col">
          <span className="font-semibold">Part {partNumber}</span>
          <p>
            <span className="text-foreground/50 text-xs">{title}</span>
          </p>
        </div>
      </motion.div>
    </Link>
  )
}

/* ════════════════════════════════════════════════════════════════
   TYPES & MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
interface EpisodeItem {
  id: string
  episodeNumber: number
  parts: Array<{
    id: string
    partNumber: number
    title: string
  }>
}

interface ProjectSidebarProps {
  projectName?: string
  projectId?: string
}

export default function ProjectSidebarNew({
  projectName,
  projectId,
}: ProjectSidebarProps) {
  const pathname = usePathname()
  const resolvedProjectId = projectId ?? ""

  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([])
  const [loadingEpisodes, setLoadingEpisodes] = useState(true)
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, boolean>>({})

  const activeEpisodeId = (() => {
    const m = pathname.match(/\/project\/[^/]+\/episode\/([^/]+)/)
    return m?.[1] ?? null
  })()

  const activePartId = (() => {
    const m = pathname.match(/\/project\/[^/]+\/episode\/[^/]+\/part\/([^/]+)/)
    return m?.[1] ?? null
  })()

  // Fetch projects
  useEffect(() => {
    let alive = true
    apiClient
      .getProjects()
      .then((data) => {
        if (alive)
          setProjects(data.map((p: any) => ({ id: p.id, name: p.name })))
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoadingProjects(false)
      })
    return () => {
      alive = false
    }
  }, [])

  // Fetch episodes + parts for current project
  useEffect(() => {
    let alive = true
    if (!resolvedProjectId) return

    const fetchData = () => {
      setLoadingEpisodes(true)
      apiClient
        .getProjectFull(resolvedProjectId)
        .then((data) => {
          if (!alive) return
          setEpisodes(
            (data.episodes || [])
              .sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)
              .map((ep: any) => ({
                id: ep.id,
                episodeNumber: ep.episodeNumber,
                parts: (ep.parts || [])
                  .slice()
                  .sort((a: any, b: any) => (a.partNumber ?? 0) - (b.partNumber ?? 0))
                  .map((part: any) => ({
                    id: part.id,
                    partNumber: part.partNumber,
                    title: part.title || `Part ${part.partNumber}`,
                  })),
              }))
          )

          if (activeEpisodeId) {
            setExpandedEpisodes((prev) => ({ ...prev, [activeEpisodeId]: true }))
          }
        })
        .catch(() => {})
        .finally(() => {
          if (alive) setLoadingEpisodes(false)
        })
    }

    fetchData()

    const unsubscribe = projectRefreshEvents.subscribe(fetchData)

    return () => {
      alive = false
      unsubscribe()
    }
  }, [resolvedProjectId, activeEpisodeId])

  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisodes((prev) => ({ ...prev, [episodeId]: !prev[episodeId] }))
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ x: -32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="h-full w-72 flex flex-col bg-gradient-to-b from-background to-background/95 border-r border-border/50 overflow-hidden pt-12 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80"
      >
      {/* ═══════════════════════════════════════════════════════════
          TOP NAVIGATION
          ═══════════════════════════════════════════════════════════ */}
      <div className="px-3 py-3 flex-shrink-0 space-y-1 border-b border-border/30">
        <NavItem
          href="/dashboard"
          icon={Home}
          label="Dashboard"
          isActive={pathname === "/dashboard"}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          PROJECTS SECTION
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 border-b border-border/30">
        <SectionLabel label="Projects" count={projects.length} />
        <div className="px-2 pb-3 space-y-1">
          {loadingProjects ? (
            <div className="space-y-2 px-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="h-10 rounded-lg bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="px-4 py-4 text-xs text-center text-foreground/40">
              No projects yet
            </div>
          ) : (
            projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ProjectItem
                  id={project.id}
                  name={project.name}
                  isActive={project.id === resolvedProjectId}
                  href={`/project/${project.id}`}
                />
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          EPISODES SECTION (Scrollable)
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
            Episodes
          </span>
          {loadingEpisodes && (
            <Loader2 size={14} className="animate-spin text-accent" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30 hover:[&::-webkit-scrollbar-thumb]:bg-border/50">
          <div className="px-2 pb-4 space-y-1">
            {loadingEpisodes ? (
              <div className="space-y-3 px-2">
                {[0, 1].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="h-10 rounded-lg bg-muted/30 animate-pulse" />
                    <div className="ml-8 h-8 rounded-lg bg-muted/30 animate-pulse" />
                  </motion.div>
                ))}
              </div>
            ) : episodes.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-xs text-foreground/40">No episodes yet</p>
              </div>
            ) : (
              episodes.map((ep, i) => {
                const epHref = `/project/${resolvedProjectId}/episode/${ep.id}`
                const isEpActive = activeEpisodeId === ep.id
                const isExpanded = expandedEpisodes[ep.id] ?? isEpActive

                return (
                  <motion.div
                    key={ep.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="space-y-2"
                  >
                    <EpisodeHeader
                      episodeNumber={ep.episodeNumber}
                      partCount={ep.parts.length}
                      isExpanded={isExpanded}
                      isActive={isEpActive}
                      onToggle={() => toggleEpisode(ep.id)}
                      href={epHref}
                    />

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            duration: 0.25,
                            ease: [0.32, 0.72, 0, 1],
                          }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-1.5 pr-2">
                            {ep.parts.length === 0 ? (
                              <div className="w-4/5 ml-auto px-4 py-3 text-xs text-foreground/40 text-center bg-muted/20 rounded-md border border-border/20">
                                No acts yet
                              </div>
                            ) : (
                              ep.parts.map((part, j) => {
                                const partHref = `${epHref}/part/${part.id}`
                                const isPartActive = activePartId === part.id

                                return (
                                  <motion.div
                                    key={part.id}
                                    initial={{
                                      opacity: 0,
                                      x: 8,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      x: 0,
                                    }}
                                    transition={{
                                      delay: j * 0.04,
                                    }}
                                  >
                                    <PartItem
                                      partNumber={part.partNumber}
                                      title={part.title}
                                      isActive={isPartActive}
                                      href={partHref}
                                    />
                                  </motion.div>
                                )
                              })
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
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FOOTER NAVIGATION
          ═══════════════════════════════════════════════════════════ */}
      <div className="px-3 py-3 flex-shrink-0 space-y-1 border-t border-border/30">
        <NavItem
          href="/team"
          icon={Users}
          label="Team"
          isActive={pathname === "/team"}
        />
        <NavItem
          href="/settings"
          icon={Settings}
          label="Settings"
          isActive={pathname === "/settings"}
        />
      </div>
    </motion.div>
    </TooltipProvider>
  )
}
