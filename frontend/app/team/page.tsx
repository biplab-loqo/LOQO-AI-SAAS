'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Users, Mail, X, Crown, Shield, UserCircle, Search, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { GlobalTopbar } from '@/components/global-topbar'
import { motion, AnimatePresence } from 'framer-motion'

const roleConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  owner: { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  admin: { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  member: { icon: UserCircle, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
}

export default function TeamPage() {
  const { organization, addTeamMember, refreshUser, user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setLoading(true)
    setError('')

    try {
      await addTeamMember(inviteEmail)
      setInviteEmail('')
      setShowModal(false)
    } catch (err: any) {
      setError(err.message || 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  const members = organization?.members || []
  const isOwner = user && members.length > 0 && user.id === members[0]?.id

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const ownerCount = members.length > 0 ? 1 : 0
  const memberCount = Math.max(0, members.length - ownerCount)

  return (
    <div className="flex h-screen bg-background flex-col">
      <GlobalTopbar />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Animated header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-border/50 bg-card/50 backdrop-blur-sm"
          >
            <div className="max-w-5xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/20 flex items-center justify-center"
                  >
                    <Users size={22} className="text-accent" />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Team</h1>
                    <p className="text-sm text-muted-foreground">
                      {organization?.name || 'Your organization'} · {members.length} member{members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {isOwner && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button
                      onClick={() => setShowModal(true)}
                      className="bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-600/90 text-white gap-2 rounded-xl shadow-lg shadow-accent/20 transition-all duration-300 hover:shadow-xl hover:shadow-accent/30"
                    >
                      <Plus size={16} />
                      Add Member
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-4 mt-5"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Crown size={12} className="text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">{ownerCount} Owner{ownerCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <UserCircle size={12} className="text-cyan-400" />
                  <span className="text-xs font-medium text-cyan-400">{memberCount} Member{memberCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex-1" />
                {/* Search members */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search members..."
                    className="pl-9 pr-3 py-1.5 rounded-lg border border-border/50 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 w-52 transition-all"
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Content */}
          <main className="flex-1 p-6">
            <div className="max-w-5xl mx-auto">
              {filteredMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMembers.map((member, i) => {
                    const role = (members.length > 0 && member.id === members[0]?.id) ? 'owner' : (member.role || 'member')
                    const config = roleConfig[role] || roleConfig.member
                    const RoleIcon = config.icon

                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="group border border-border/30 rounded-xl bg-card/50 p-4 flex items-center gap-4 hover:border-accent/20 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5"
                      >
                        <div className="relative">
                          <Avatar className="w-11 h-11 ring-2 ring-border/30 group-hover:ring-accent/20 transition-all">
                            {member.avatarUrl && <AvatarImage src={member.avatarUrl} />}
                            <AvatarFallback className="bg-gradient-to-br from-accent/20 to-purple-500/20 text-accent text-sm font-semibold">
                              {member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {role === 'owner' && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                              <Crown size={8} className="text-white" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail size={10} />
                            {member.email}
                          </p>
                        </div>

                        <div className={cn(
                          'flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border tracking-wider',
                          config.bg
                        )}>
                          <RoleIcon size={11} className={config.color} />
                          <span className={config.color}>{role}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : searchQuery ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <Search size={32} className="text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No members matching &ldquo;{searchQuery}&rdquo;</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Users size={28} className="text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">No team members yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Add team members to start collaborating on your creative projects
                  </p>
                  {isOwner && (
                    <Button
                      onClick={() => setShowModal(true)}
                      className="mt-4 bg-accent hover:bg-accent/90 text-white gap-2 rounded-xl"
                    >
                      <Plus size={16} />
                      Add your first member
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border/50 rounded-2xl max-w-md w-full shadow-2xl shadow-black/20"
            >
              {/* Modal Header */}
              <div className="border-b border-border/50 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Sparkles size={14} className="text-accent" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Add Team Member</h2>
                </div>
                <button
                  onClick={() => { setShowModal(false); setError('') }}
                  className="p-1.5 hover:bg-secondary/50 rounded-lg transition-colors"
                >
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleInviteMember} className="p-6 space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/30 rounded-xl p-3"
                  >
                    <p className="text-sm text-destructive">{error}</p>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Email Address</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="member@example.com"
                    disabled={loading}
                    className="h-10 rounded-xl bg-secondary/30 border-border/50 focus:border-accent/50"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    The user must already have a Google account. They will be added to your organization.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowModal(false); setError('') }}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-transparent border-border/50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!inviteEmail.trim() || loading}
                    className="flex-1 bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-600/90 text-white rounded-xl shadow-lg shadow-accent/20"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Adding...
                      </span>
                    ) : 'Add Member'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
