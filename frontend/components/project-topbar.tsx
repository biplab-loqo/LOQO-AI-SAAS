'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PanelLeftClose, PanelLeft, ChevronDown, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/theme-context'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProjectBreadcrumb } from '@/components/project-breadcrumb'
import { GlobalSearch } from '@/components/global-search'

interface ProjectTopbarProps {
  projectName: string
  userEmail: string
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function ProjectTopbar({ projectName, userEmail, sidebarOpen, onToggleSidebar }: ProjectTopbarProps) {
  const [saved] = useState(true)
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="h-12 bg-card border-b border-border/50 flex items-center justify-between px-4 flex-shrink-0 relative">
      {/* Subtle gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      
      {/* Left: Toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="h-8 w-8 p-0 flex-shrink-0 rounded-lg hover:bg-accent/10 hover:text-accent transition-colors"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
        </Button>

        <ProjectBreadcrumb />

        {/* Status */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-shrink-0">
          {saved ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span className="font-medium">Saved</span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-sm shadow-amber-500/50" />
              <span className="font-medium">Saving...</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Search + Theme toggle + User Menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <GlobalSearch />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-accent/10 hover:text-accent transition-colors"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        >
          {resolvedTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </Button>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground hover:text-accent hover:bg-accent/10 h-8 px-3 rounded-lg font-semibold">
            All Projects
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-1.5 px-1.5 h-7">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-[8px] bg-secondary">
                  {userEmail.split('@')[0].substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <ChevronDown size={12} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-foreground">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-destructive">
              <Link href="/auth/login">Sign out</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
