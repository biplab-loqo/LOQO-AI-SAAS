'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import toast from 'react-hot-toast'
import Script from 'next/script'
import { Film, Sparkles, Clapperboard, Palette, Wand2 } from 'lucide-react'
import { StudioPageLoader } from '@/components/studio-loading'
import { motion } from 'framer-motion'

declare global {
  interface Window {
    google: any
  }
}

const floatingItems = [
  { icon: Clapperboard, label: 'Direct', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', x: '15%', y: '20%', delay: 0 },
  { icon: Palette, label: 'Design', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', x: '65%', y: '15%', delay: 0.2 },
  { icon: Wand2, label: 'Create', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', x: '25%', y: '65%', delay: 0.4 },
  { icon: Sparkles, label: 'AI', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', x: '70%', y: '60%', delay: 0.6 },
]

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      initializeGoogleSignIn()
    }
  }, [])

  const initializeGoogleSignIn = () => {
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    })
    
    window.google.accounts.id.renderButton(
      document.getElementById('googleSignInButton'),
      {
        theme: 'filled_black',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 300,
      }
    )
  }

  const handleCredentialResponse = async (response: any) => {
    try {
      await login(response.credential)
      toast.success('Signed in successfully!')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error?.message || 'Unable to sign in. Please try again.')
    }
  }

  if (loading) {
    return <StudioPageLoader message="Loading..." />
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={() => initializeGoogleSignIn()}
      />
      <div className="min-h-screen flex bg-background">
        {/* Left: Decorative animated panel */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="hidden lg:flex flex-1 relative overflow-hidden"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-purple-900/10" />
          
          {/* Animated gradient orbs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-accent/20 blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-orange-500/10 blur-3xl"
          />

          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          {/* Floating cards */}
          {floatingItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: [0, -8, 0],
              }}
              transition={{ 
                opacity: { delay: 0.5 + item.delay, duration: 0.5 },
                y: { delay: 1 + item.delay, duration: 3, repeat: Infinity, ease: 'easeInOut' }
              }}
              className="absolute"
              style={{ left: item.x, top: item.y }}
            >
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${item.bg} backdrop-blur-sm shadow-lg`}>
                <item.icon size={16} className={item.color} />
                <span className={`text-sm font-medium ${item.color}`}>{item.label}</span>
              </div>
            </motion.div>
          ))}

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
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-purple-600 mb-6 shadow-xl shadow-accent/25"
              >
                <Film className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-4xl font-bold text-foreground mb-3">
                Loqo <span className="bg-gradient-to-r from-accent to-cyan-400 bg-clip-text text-transparent">Studio</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
                Your AI-powered creative studio for storytelling, storyboarding, and production
              </p>
            </motion.div>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-wrap gap-2 mt-8 justify-center max-w-md"
            >
              {['AI Story Generation', 'Beat Mapping', 'Shot Lists', 'Storyboards', 'Visual Production'].map((feature, i) => (
                <motion.span
                  key={feature}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + i * 0.1, duration: 0.3 }}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20"
                >
                  {feature}
                </motion.span>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Right: Sign-in panel */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-full lg:w-[480px] xl:w-[520px] flex items-center justify-center p-8 relative"
        >
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-card/50 to-background lg:bg-card/30" />
          <div className="absolute inset-y-0 left-0 w-[1px] hidden lg:block bg-gradient-to-b from-transparent via-accent/20 to-transparent" />

          <div className="w-full max-w-sm relative z-10">
            {/* Mobile logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-8 text-center lg:hidden"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-purple-600 mb-3 shadow-lg shadow-accent/25">
                <Film className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Loqo Studio</h1>
            </motion.div>

            {/* Welcome text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to your creative workspace
              </p>
            </motion.div>

            {/* Sign-in card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-xl shadow-black/10"
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-full">
                  <p className="text-xs text-muted-foreground text-center mb-4">
                    Continue with your Google account
                  </p>
                  <div className="flex justify-center">
                    <div id="googleSignInButton"></div>
                  </div>
                </div>

                <div className="w-full flex items-center gap-3">
                  <div className="flex-1 h-[1px] bg-border/50" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">secure login</span>
                  <div className="flex-1 h-[1px] bg-border/50" />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  <span>256-bit SSL encrypted</span>
                </div>
              </div>
            </motion.div>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-[10px] text-muted-foreground text-center mt-6 leading-relaxed"
            >
              By signing in, you agree to our{' '}
              <span className="text-accent/70 hover:text-accent cursor-pointer">Terms of Service</span> and{' '}
              <span className="text-accent/70 hover:text-accent cursor-pointer">Privacy Policy</span>
            </motion.p>
          </div>
        </motion.div>
      </div>
    </>
  )
}

