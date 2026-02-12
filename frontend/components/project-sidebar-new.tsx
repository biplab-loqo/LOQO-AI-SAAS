"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  Users,
  Settings,
  Film,
  Layers,
  Eye,
  ChevronDown,
  Clapperboard,
  UserCircle,
  MapPin,
  Box,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/context/auth-context"
import { motion, AnimatePresence } from "framer-motion"

/* ────────────────────────────────────────────────────────────
   SIDEBAR NAV ITEM
   ──────────────────────────────────────────────────────────── */
function NavItem({ href, icon: Icon, label, isActive, badge, color }: {
  href: string; icon: React.ElementType; label: string; isActive: boolean; badge?: number; color?: string
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 group relative overflow-hidden",
          isActive
            ? "bg-accent/12 text-foreground font-semibold border border-accent/20 shadow-sm shadow-accent/5"
            : "text-foreground/70 hover:text-foreground hover:bg-secondary/60"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent shadow-lg shadow-accent/50"
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        )}
        <Icon size={16} className={cn("flex-shrink-0 transition-colors", isActive ? "text-accent" : color || "group-hover:text-foreground")} />
        <span className="truncate flex-1">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="text-[10px] font-bold bg-accent/15 text-accent px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {badge}
          </span>
        )}
      </motion.div>
    </Link>
  )
}

/* ────────────────────────────────────────────────────────────
   SECTION HEADER
   ──────────────────────────────────────────────────────────── */
function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center justify-between px-3 mb-2">
      <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-[0.15em]">
        {label}
      </p>
      {count !== undefined && (
        <span className="text-[10px] font-medium text-muted-foreground">{count}</span>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   EPISODE + PARTS TREE
   ──────────────────────────────────────────────────────────── */
interface EpisodeTreeItem {
  id: string
  episodeNumber: number
  parts: { id: string; title: string; partNumber: number }[]
}

function EpisodeTree({ episodes, projectId, pathname }: {
  episodes: EpisodeTreeItem[]
  projectId: string
  pathname: string
}) {
  const [expandedEp, setExpandedEp] = useState<string | null>(null)

  // Auto-expand the episode we're currently viewing
  useEffect(() => {
    for (const ep of episodes) {
      if (pathname.includes(`/episode/${ep.id}`)) {
        setExpandedEp(ep.id)
        break
      }
    }
  }, [pathname, episodes])

  if (episodes.length === 0) {
    return (
      <div className="px-3 py-3 text-xs text-muted-foreground/60 text-center">
        No episodes yet
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {episodes.map((ep) => {
        const isExpanded = expandedEp === ep.id
        const isEpActive = pathname.includes(`/episode/${ep.id}`)
        return (
          <div key={ep.id}>
            <motion.button
              whileHover={{ x: 2 }}
              onClick={() => setExpandedEp(isExpanded ? null : ep.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 group",
                isEpActive
                  ? "bg-accent/8 text-foreground font-semibold"
                  : "text-foreground/70 hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.15 }}
                className="flex-shrink-0"
              >
                <ChevronRight size={12} className="text-muted-foreground/50" />
              </motion.div>
              <Clapperboard size={15} className={cn("flex-shrink-0", isEpActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="flex-1 text-left truncate">Episode {ep.episodeNumber}</span>
              <span className="text-[10px] font-semibold bg-secondary/60 px-1.5 py-0.5 rounded-full text-muted-foreground/60">
                {ep.parts.length}
              </span>
            </motion.button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-5 pl-3 border-l-2 border-accent/15 space-y-0.5 mt-0.5 mb-1">
                    {ep.parts.length === 0 ? (
                      <div className="px-2.5 py-2 text-xs text-muted-foreground/50">No parts</div>
                    ) : (
                      ep.parts
                        .sort((a, b) => a.partNumber - b.partNumber)
                        .map((part, i) => {
                          const partHref = `/project/${projectId}/episode/${ep.id}/part/${part.id}`
                          const isPartActive = pathname === partHref || pathname.startsWith(partHref + "/")
                          return (
                            <motion.div
                              key={part.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                            >
                              <Link href={partHref}>
                                <div className={cn(
                                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all duration-200 cursor-pointer group",
                                  isPartActive
                                    ? "bg-accent/10 text-foreground font-semibold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                                )}>
                                  <Layers size={12} className={cn("flex-shrink-0", isPartActive ? "text-accent" : "text-muted-foreground/50")} />
                                  <span className="truncate">{part.title || `Part ${part.partNumber}`}</span>
                                </div>
                              </Link>
                            </motion.div>
                          )
                        })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   MAIN SIDEBAR
   ──────────────────────────────────────────────────────────── */
interface ProjectSidebarProps {
  projectName?: string
  projectId?: string
}

export default function ProjectSidebarNew({
  projectName,
  projectId,
}: ProjectSidebarProps) {
  const pathname = usePathname()
  const resolvedProjectId = projectId ?? "1"
  const projectBase = `/project/${resolvedProjectId}`

  const { organization } = useAuth()
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [episodes, setEpisodes] = useState<EpisodeTreeItem[]>([])
  const [loadingEpisodes, setLoadingEpisodes] = useState(true)

  const isActivePath = (href: string) => pathname === `${projectBase}${href}` || pathname.startsWith(`${projectBase}${href}/`)

  // Fetch projects
  useEffect(() => {
    let alive = true
    apiClient.getProjects()
      .then(data => { if (alive) setProjects(data.map((p: any) => ({ id: p.id, name: p.name }))) })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingProjects(false) })
    return () => { alive = false }
  }, [])

  // Fetch episodes + parts for current project
  useEffect(() => {
    let alive = true
    if (!resolvedProjectId) return
    setLoadingEpisodes(true)
    apiClient.getProjectFull(resolvedProjectId)
      .then(data => {
        if (!alive) return
        setEpisodes(
          data.episodes
            .sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)
            .map((ep: any) => ({
              id: ep.id,
              episodeNumber: ep.episodeNumber,
              parts: (ep.parts || []).map((p: any) => ({
                id: p.id,
                title: p.title,
                partNumber: p.partNumber,
              })),
            }))
        )
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingEpisodes(false) })
    return () => { alive = false }
  }, [resolvedProjectId])

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="border-r border-border/40 bg-card/95 backdrop-blur-xl flex flex-col h-screen overflow-hidden w-72 relative"
    >
      {/* Subtle gradient side accent */}
      <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-gradient-to-b from-accent/40 via-accent/10 to-transparent" />

      {/* ═══ Projects ═══ */}
      <div className="border-b border-border/30 p-3 flex-shrink-0">
        <SectionLabel label="Projects" count={projects.length} />
        <div className="space-y-0.5">
          {loadingProjects ? (
            <div className="space-y-1.5 px-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-9 rounded-xl bg-muted/20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground/60 text-center">No projects</div>
          ) : (
            projects.map((project, i) => {
              const isActive = project.id === resolvedProjectId
              return (
                <motion.div key={project.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <NavItem
                    href={`/project/${project.id}`}
                    icon={Film}
                    label={project.name}
                    isActive={isActive}
                  />
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* ═══ Scrollable: Episodes & Parts + Assets ═══ */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30 hover:[&::-webkit-scrollbar-thumb]:bg-border/50">
        {/* Episodes & Parts */}
        <div className="border-b border-border/30 p-3">
          <SectionLabel label="Episodes & Parts" count={episodes.length} />
          {loadingEpisodes ? (
            <div className="space-y-1.5 px-3">
              {[0, 1].map(i => (
                <div key={i} className="h-9 rounded-xl bg-muted/20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          ) : (
            <EpisodeTree
              episodes={episodes}
              projectId={resolvedProjectId}
              pathname={pathname}
            />
          )}
        </div>

        {/* Assets */}
        <div className="p-3">
          <SectionLabel label="Assets" />
          <div className="space-y-0.5">
            <NavItem
              href={`${projectBase}/characters`}
              icon={UserCircle}
              label="Characters"
              isActive={isActivePath("/characters")}
              color="text-pink-400"
            />
            <NavItem
              href={`${projectBase}/locations`}
              icon={MapPin}
              label="Locations"
              isActive={isActivePath("/locations")}
              color="text-emerald-400"
            />
            <NavItem
              href={`${projectBase}/props`}
              icon={Box}
              label="Props"
              isActive={isActivePath("/props")}
              color="text-orange-400"
            />
          </div>
        </div>
      </div>

      {/* ═══ Footer Links ═══ */}
      <div className="border-t border-border/30 p-3 flex-shrink-0 space-y-0.5">
        <NavItem href="/team" icon={Users} label="Team" isActive={pathname === "/team"} />
        <NavItem href="/dashboard" icon={Eye} label="Dashboard" isActive={pathname === "/dashboard"} />
        <NavItem href="/settings" icon={Settings} label="Settings" isActive={pathname === "/settings"} />
      </div>
    </motion.div>
  )
}
