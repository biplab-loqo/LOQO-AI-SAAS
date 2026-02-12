'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, Edit, Save, X, LogOut, UserCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { GlobalTopbar } from '@/components/global-topbar'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { StudioPageLoader } from '@/components/studio-loading'
import { motion } from 'framer-motion'

export default function ProfilePage() {
  const { user, organization, logout, updateProfile, loading } = useAuth()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        bio: user.bio || '',
      })
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(formData)
      setEditing(false)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name,
        bio: user.bio || '',
      })
    }
    setEditing(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  if (loading || !user) {
    return <StudioPageLoader message="Loading profile..." />
  }

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex h-screen bg-background flex-col">
      <GlobalTopbar />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-h-screen bg-background overflow-y-auto">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl px-8 py-12 mx-auto w-full"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/20 flex items-center justify-center">
                <UserCircle size={20} className="text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
                <p className="text-xs text-muted-foreground">Manage your profile and preferences</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mt-8">
              {/* Profile Card */}
              <div className="lg:col-span-2 space-y-4">
                {/* Profile Header */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="border border-border/30 rounded-2xl bg-card/50 p-8 hover:border-accent/10 transition-all duration-300">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16 ring-2 ring-accent/20">
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                        <AvatarFallback className="bg-gradient-to-br from-accent/20 to-purple-500/20 text-accent text-lg font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
                        {organization && (
                          <p className="text-muted-foreground text-sm">{organization.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Member since {new Date(user.id).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace('Invalid Date', 'Jan 2024')}
                        </p>
                      </div>
                    </div>
                    {!editing && (
                      <Button
                        onClick={() => setEditing(true)}
                        className="gap-2 bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-600/90 text-white rounded-xl shadow-lg shadow-accent/20"
                        size="sm"
                      >
                        <Edit size={14} />
                        Edit Profile
                      </Button>
                    )}
                  </div>

                  {editing && (
                    <div className="space-y-4 pt-6 border-t border-border">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Display Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 rounded bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Bio</label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          className="w-full px-3 py-2 rounded bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none"
                          rows={4}
                          placeholder="Tell us about yourself..."
                          disabled={saving}
                        />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={handleSave}
                          className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                          size="sm"
                          disabled={saving}
                        >
                          <Save size={14} />
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          className="gap-2 bg-transparent"
                          size="sm"
                          disabled={saving}
                        >
                          <X size={14} />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Contact Information */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="border border-border/30 rounded-2xl bg-card/50 p-6 hover:border-accent/10 transition-all duration-300">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                      <Mail size={16} className="text-accent" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Email</p>
                        <p className="text-foreground text-sm">{user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Professional Info */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="border border-border/30 rounded-2xl bg-card/50 p-6 hover:border-accent/10 transition-all duration-300">
                  <h3 className="text-sm font-semibold text-foreground mb-4">About</h3>
                  <div className="space-y-4">
                    {organization && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Organization</p>
                        <p className="text-foreground text-sm">{organization.name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Bio</p>
                      <p className="text-foreground text-sm leading-relaxed">
                        {user.bio || 'No bio added yet. Click Edit Profile to add one.'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Settings Sidebar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4">
                {/* Danger Zone */}
                <div className="border border-destructive/20 rounded-2xl bg-destructive/5 p-6">
                  <h3 className="text-sm font-semibold text-destructive mb-4">Danger Zone</h3>
                  <div className="space-y-3">
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full gap-2 text-destructive hover:bg-destructive/10 border-destructive/20 bg-transparent rounded-xl"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
