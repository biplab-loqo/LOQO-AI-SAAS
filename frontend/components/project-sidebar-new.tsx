"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  Settings,
  Film,
  Eye,
  Clapperboard,
  Loader2,
  Home,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { projectRefreshEvents } from '@/lib/refresh-events'
import { motion } from "framer-motion"

/* ────────────────────────────────────────────────────────────
   SIDEBAR NAV ITEM
   ──────────────────────────────────────────────────────────── */
function NavItem({ href, icon: Icon, label, isActive, badge, color, activeIndicatorId = 'sidebar-active' }: {
  href: string; icon: React.ElementType; label: string; isActive: boolean; badge?: number; color?: string; activeIndicatorId?: string
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 group relative border-l-2",
          isActive
            ? "bg-accent/10 text-accent font-semibold border-l-accent border border-accent/30 shadow-sm shadow-accent/10"
            : "text-foreground/70 hover:text-foreground hover:bg-secondary/60 border-l-transparent border border-border/20"
        )}
      >
        {isActive && (
          <motion.div
            layoutId={activeIndicatorId}
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/5 to-transparent pointer-events-none"
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
   MAIN SIDEBAR
   ──────────────────────────────────────────────────────────── */
interface EpisodeItem {
  id: string
  episodeNumber: number
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
  const projectBase = `/project/${resolvedProjectId}`

  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([])
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

    const fetchData = () => {
      setLoadingEpisodes(true)
      apiClient.getProjectFull(resolvedProjectId)
        .then(data => {
          if (!alive) return
          setEpisodes(
            (data.episodes || [])
              .sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)
              .map((ep: any) => ({
                id: ep.id,
                episodeNumber: ep.episodeNumber,
              }))
          )
        })
        .catch(() => {})
        .finally(() => { if (alive) setLoadingEpisodes(false) })
    }

    fetchData()

    // Subscribe to refresh events
    const unsubscribe = projectRefreshEvents.subscribe(fetchData)

    return () => {
      alive = false
      unsubscribe()
    }
  }, [resolvedProjectId])

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-[hsl(240_8%_6%)] border-r border-border/10 flex flex-col h-full overflow-hidden w-72 relative pt-12"
    >
      {/* ═══ Dashboard (always top) ═══ */}
      <div className="pt-3 px-3 pb-4 flex-shrink-0">
        <NavItem href="/dashboard" icon={Home} label="Dashboard" isActive={pathname === "/dashboard"} />
      </div>

      {/* ═══ Projects ═══ */}
      <div className="px-3 pb-2 flex-shrink-0">
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
            projects.map((project, i) => (
              <motion.div key={project.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <NavItem
                  href={`/project/${project.id}`}
                  icon={Film}
                  label={project.name}
                  isActive={project.id === resolvedProjectId}
                  activeIndicatorId="sidebar-active-project"
                />
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ═══ Scrollable: Episodes ═══ */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/30 hover:[&::-webkit-scrollbar-thumb]:bg-border/50">
        <div className="p-3">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-[0.15em]">Episodes</p>
            {loadingEpisodes && <Loader2 size={10} className="animate-spin text-muted-foreground" />}
          </div>
          {loadingEpisodes ? (
            <div className="space-y-1.5 px-3">
              {[0, 1].map(i => (
                <div key={i} className="h-9 rounded-xl bg-muted/20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          ) : episodes.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground/60 text-center">No episodes yet</div>
          ) : (
            <div className="space-y-0.5">
              {episodes.map((ep, i) => {
                const epHref = `/project/${resolvedProjectId}/episode/${ep.id}`
                const isEpActive = pathname === epHref || pathname.startsWith(epHref + "/")
                return (
                  <motion.div
                    key={ep.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <NavItem
                      href={epHref}
                      icon={Clapperboard}
                      label={`Episode ${ep.episodeNumber}`}
                      isActive={isEpActive}
                      activeIndicatorId="sidebar-active-episode"
                    />
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Footer Links ═══ */}
      <div className="px-3 pb-3 flex-shrink-0 space-y-0.5">
        <NavItem href="/team" icon={Users} label="Team" isActive={pathname === "/team"} />
        <NavItem href="/settings" icon={Settings} label="Settings" isActive={pathname === "/settings"} />
      </div>
    </motion.div>
  )
}
