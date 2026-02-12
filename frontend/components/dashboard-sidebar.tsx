"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  Users,
  LogOut,
  Plus,
  Home,
  Film,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface Project {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  type?: string;
  status?: string;
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  className?: string;
}

function NavItem({ href, icon, label, isActive, className }: NavItemProps) {
  return (
    <Link href={href}>
      <motion.div
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer relative",
          "transition-colors duration-200",
          isActive
            ? "text-foreground bg-accent/10"
            : "text-foreground/70 hover:text-foreground hover:bg-secondary/50",
          className
        )}
        whileHover={{ x: 4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {isActive && (
          <motion.div
            layoutId="dashboard-sidebar-active"
            className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent rounded-r-full"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        {icon}
        <span>{label}</span>
      </motion.div>
    </Link>
  );
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchProjects() {
      try {
        const data = await apiClient.getProjects();
        if (isMounted) {
          setProjects(data);
        }
      } catch (err) {
        console.error("Failed to load projects for sidebar", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative border-r border-border/50 bg-card w-64 flex-shrink-0"
    >
      {/* Accent gradient line */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-accent/0 via-accent/50 to-accent/0" />

      <div className="h-full flex flex-col">
        {/* Main Navigation */}
        <div className="p-3 space-y-1 border-b border-border/50">
          <NavItem
            href="/dashboard"
            icon={<Home size={14} />}
            label="Projects"
            isActive={pathname === "/dashboard"}
          />
          <NavItem
            href="/dashboard/create-project"
            icon={<Plus size={14} />}
            label="New Project"
            isActive={pathname === "/dashboard/create-project"}
            className="hover:text-accent"
          />
          <NavItem
            href="/team"
            icon={<Users size={14} />}
            label="Team"
            isActive={pathname === "/team"}
          />
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          <motion.button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-bold text-foreground/60 uppercase tracking-widest hover:text-foreground transition-colors mb-2"
            whileHover={{ x: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <span>Projects</span>
            <motion.div
              animate={{ rotate: projectsExpanded ? 0 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={12} />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {projectsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1 overflow-hidden"
              >
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-3 py-2 text-sm text-muted-foreground"
                  >
                    Loading...
                  </motion.div>
                )}
                {!loading && projects.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-3 py-2 text-sm text-muted-foreground"
                  >
                    No projects yet.
                  </motion.div>
                )}
                {projects.map((project, i) => {
                  const isActive = pathname.startsWith(`/project/${project.id}`);
                  return (
                    <Link key={project.id} href={`/project/${project.id}`}>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer relative",
                          "transition-colors duration-200",
                          isActive
                            ? "text-foreground bg-accent/10"
                            : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
                        )}
                        whileHover={{ x: 4, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="dashboard-sidebar-active"
                            className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent rounded-r-full"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <Film size={14} className="flex-shrink-0" />
                        <span className="truncate">{project.name}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom */}
        <div className="border-t border-border/50 p-3 space-y-1">
          <NavItem
            href="/settings"
            icon={<Settings size={14} />}
            label="Settings"
            isActive={pathname === "/settings"}
          />
          <NavItem
            href="/auth/login"
            icon={<LogOut size={14} />}
            label="Sign Out"
            className="text-red-400 hover:text-red-300"
          />
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.3);
        }
      `}</style>
    </motion.div>
  );
}
