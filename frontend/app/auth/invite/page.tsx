'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Film, Users, Star, Zap, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  { icon: Zap, title: 'AI-Powered', desc: 'Generate stories, beats, and shots with AI' },
  { icon: Users, title: 'Team Collaboration', desc: 'Work together in real-time on productions' },
  { icon: Star, title: 'Visual Pipeline', desc: 'From script to storyboard to final cut' },
]

export default function InvitePage() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Decorative animated panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex flex-1 relative overflow-hidden"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 via-background to-accent/5" />
        
        {/* Animated gradient orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full bg-accent/20 blur-3xl"
        />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Center content */}
        <div className="relative flex flex-col items-center justify-center w-full z-10 px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-accent mb-6 shadow-xl shadow-cyan-500/25"
            >
              <Film className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Join <span className="bg-gradient-to-r from-cyan-400 to-accent bg-clip-text text-transparent">Loqo Studio</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed mb-10">
              You&apos;ve been invited to the future of creative production
            </p>
          </motion.div>

          {/* Feature cards */}
          <div className="space-y-4 w-full max-w-sm">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.15, duration: 0.5 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Right: Sign-up form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full lg:w-[520px] xl:w-[560px] flex items-center justify-center p-8 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-card/50 to-background lg:bg-card/30" />
        <div className="absolute inset-y-0 left-0 w-[1px] hidden lg:block bg-gradient-to-b from-transparent via-accent/20 to-transparent" />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-6 text-center lg:hidden"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-accent mb-3 shadow-lg">
              <Film className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Loqo Studio</h1>
          </motion.div>

          {/* Welcome text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mb-6"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">Create your account</h2>
            <p className="text-sm text-muted-foreground">Enter your invitation code to get started</p>
          </motion.div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-xl shadow-black/10"
          >
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-foreground">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@studio.com"
                  className="bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground rounded-xl h-10 focus:border-accent/50 focus:ring-accent/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-code" className="text-xs font-medium text-foreground">Invitation code</Label>
                <Input
                  id="invite-code"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  className="bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground rounded-xl h-10 font-mono focus:border-accent/50 focus:ring-accent/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-foreground">Create password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground rounded-xl h-10 focus:border-accent/50 focus:ring-accent/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-xs font-medium text-foreground">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground rounded-xl h-10 focus:border-accent/50 focus:ring-accent/20"
                />
              </div>

              <Button className="w-full bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-600/90 text-white rounded-xl h-10 font-semibold shadow-lg shadow-accent/25 transition-all duration-300">
                Create account
              </Button>
            </form>

            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center mt-5">
              <Shield size={12} className="text-emerald-500" />
              <span>Your data is protected with enterprise-grade security</span>
            </div>
          </motion.div>

          {/* Footer links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center mt-6 space-y-3"
          >
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-accent hover:text-accent/80 font-medium transition-colors">
                Sign in
              </Link>
            </p>
            <p className="text-[10px] text-muted-foreground">Invitation-only platform</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
