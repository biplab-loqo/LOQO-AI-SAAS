'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/context/theme-context'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sun, Moon, Monitor, User, Palette, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { GlobalTopbar } from '@/components/global-topbar'
import toast from 'react-hot-toast'
import { StudioPageLoader } from '@/components/studio-loading'
import { motion } from 'framer-motion'

const sections = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'profile', label: 'Profile', icon: User },
]

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/30 bg-card/50 p-6 hover:border-accent/10 transition-all duration-300">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, loading, updateProfile } = useAuth()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('appearance')
  const [saving, setSaving] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      setDisplayName(user.name)
      setBio(user.bio || '')
    }
  }, [user])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await updateProfile({ name: displayName, bio })
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) {
    return <StudioPageLoader message="Loading settings..." />
  }

  const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="flex h-screen bg-background flex-col">
      <GlobalTopbar />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Top bar */}
          <header className="h-12 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center px-6 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-purple-500/20 flex items-center justify-center">
                <Settings size={14} className="text-accent" />
              </div>
              <h1 className="text-sm font-bold text-foreground">Settings</h1>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar nav */}
            <nav className="w-56 flex-shrink-0 border-r border-border/50 p-4 overflow-y-auto" aria-label="Settings navigation">
              <ul className="space-y-1" role="list">
                {sections.map((section) => {
                  const Icon = section.icon
                  const isActive = activeSection === section.id
                  return (
                    <li key={section.id}>
                      <button
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all duration-200',
                          isActive
                            ? 'bg-accent/10 text-accent font-medium border border-accent/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        )}
                      >
                        <Icon size={14} className="flex-shrink-0" />
                        <span>{section.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* Main content */}
            <motion.main
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex-1 p-8 space-y-8 max-w-3xl overflow-y-auto">
              {/* Appearance */}
              <section id="appearance" className="scroll-mt-20">
                <h2 className="text-lg font-semibold text-foreground mb-4">Appearance</h2>
                <div className="space-y-4">
                  <SectionCard title="Theme" description="Choose how the app looks. Select a theme or let it follow your system preference.">
                    <div className="flex gap-3">
                      {themeOptions.map((opt) => {
                        const Icon = opt.icon
                        const isSelected = theme === opt.value
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setTheme(opt.value)}
                            className={cn(
                              'flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                              isSelected
                                ? 'border-accent bg-accent/5'
                                : 'border-border hover:border-muted-foreground/30 bg-transparent'
                            )}
                          >
                            <div className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center',
                              isSelected ? 'bg-accent/15 text-accent' : 'bg-secondary text-muted-foreground'
                            )}>
                              <Icon size={18} />
                            </div>
                            <span className={cn(
                              'text-xs font-medium',
                              isSelected ? 'text-accent' : 'text-muted-foreground'
                            )}>{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </SectionCard>
                </div>
              </section>

              {/* Profile */}
              <section id="profile" className="scroll-mt-20">
                <h2 className="text-lg font-semibold text-foreground mb-4">Profile</h2>
                <SectionCard title="Personal Information" description="This information is visible to other team members in your organization.">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 pb-4 border-b border-border">
                      <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-accent">{userInitials}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="displayName" className="text-xs text-muted-foreground">Display Name</Label>
                        <Input 
                          id="displayName" 
                          value={displayName} 
                          onChange={(e) => setDisplayName(e.target.value)} 
                          className="h-9 text-sm" 
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                        <Input 
                          id="email" 
                          value={user.email} 
                          className="h-9 text-sm bg-muted" 
                          disabled
                        />
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bio" className="text-xs text-muted-foreground">Bio</Label>
                        <textarea
                          id="bio" 
                          value={bio} 
                          onChange={(e) => setBio(e.target.value)} 
                          className="w-full px-3 py-2 rounded bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none"
                          rows={3}
                          placeholder="Tell us about yourself..."
                          disabled={saving}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button 
                        size="sm" 
                        className="text-xs h-8 bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-600/90 text-white rounded-xl shadow-lg shadow-accent/20" 
                        onClick={handleSaveProfile}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </section>
            </motion.main>
          </div>
        </div>
      </div>
    </div>
  )
}
