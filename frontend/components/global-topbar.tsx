'use client'

import Link from 'next/link'
import { ChevronDown, PanelLeftClose, PanelLeft, Sun, Moon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/auth-context'
import { useTheme } from '@/context/theme-context'
import { GlobalSearch } from '@/components/global-search'
import { ProjectBreadcrumb } from '@/components/project-breadcrumb'
import toast from 'react-hot-toast'

interface GlobalTopbarProps {
  /** Show sidebar toggle + breadcrumb when inside a project */
  sidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export function GlobalTopbar({ sidebarOpen, onToggleSidebar }: GlobalTopbarProps = {}) {
  const { user, organization, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()

  const isProjectView = typeof onToggleSidebar === 'function'

  const handleSignOut = async () => {
    try {
      await logout()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const orgName = organization?.name || 'Loqo Studios'
  const orgLogo = organization?.name?.substring(0, 2).toUpperCase() || 'LS'
  const userName = user?.name || 'User'
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header className="h-12 bg-card border-b border-border/50 flex items-center justify-between px-4 flex-shrink-0 relative">
      {/* Gradient accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* Left: Org logo + sidebar toggle (project) or org name (dashboard) */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-accent">{orgLogo}</span>
        </div>

        {isProjectView ? (
          <>
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
          </>
        ) : (
          <span className="text-sm font-semibold text-foreground">{orgName}</span>
        )}
      </div>

      {/* Center: All Projects + Search */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-accent rounded-lg h-8 transition-all duration-200">
            All Projects
          </Button>
        </Link>
        <GlobalSearch />
      </div>

      {/* Right: Theme toggle + User Menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-accent/10 hover:text-accent transition-colors"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </Button>

        <span className="text-sm text-muted-foreground hidden md:block">{userName}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-1.5 px-2 h-8 rounded-lg hover:bg-secondary/50 transition-all duration-200">
              <Avatar className="w-6 h-6">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={userName} />}
                <AvatarFallback className="text-[10px] bg-accent/10 text-accent">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown size={12} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
