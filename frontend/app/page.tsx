'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import {
  Sparkles, Zap, Layers, Video, Wand2, Cpu, ArrowRight, Film, Clock,
  Play, ChevronRight, Star, MousePointerClick,
  Palette, Camera, Clapperboard, Monitor, ArrowDown, Globe, Users
} from 'lucide-react'

/* ─────────── Data ─────────── */
const features = [
  {
    icon: Cpu,
    title: 'Cinematic AI Engine',
    desc: 'API-first platform. From scripts to delivery — our proprietary AI creates cinema-quality content at unprecedented scale.',
    color: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  {
    icon: Users,
    title: '100+ Creative Team',
    desc: 'Writers, directors, and specialists from around the globe working alongside AI to bring your vision to life.',
    color: 'from-cyan-400 to-blue-500',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
  },
  {
    icon: Monitor,
    title: 'Broadcast Ready',
    desc: 'ProRes, DCI, and TV spec output with automatic QA gates. Your content meets industry standards from day one.',
    color: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
  {
    icon: Layers,
    title: 'Scale Infinitely',
    desc: 'From 10 to 1,000 minutes per day. Scale production without hiring — AI handles the heavy lifting.',
    color: 'from-orange-400 to-amber-500',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
  },
  {
    icon: Globe,
    title: '9 Languages',
    desc: 'Native production in Hindi, English, Rajasthani, Gujarati, Marathi, Telugu, Tamil, Bangla, and Kannada.',
    color: 'from-emerald-400 to-green-500',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
  },
  {
    icon: Film,
    title: 'All Genres',
    desc: 'Mythology, Crime, Drama, Kids, and more. AI adapts to any genre with culturally authentic storytelling.',
    color: 'from-blue-400 to-indigo-500',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
]

const stats = [
  { value: '100+', label: 'Minutes per Day', icon: Film },
  { value: '60%', label: 'Lower Cost', icon: Zap },
  { value: '80%', label: 'Faster Delivery', icon: Clock },
  { value: '9', label: 'Languages', icon: Globe },
]

const workflow = [
  { step: '01', title: 'Brief & Strategy', desc: 'Define audience, language, and creative direction. AI generates tailored scripts instantly.', icon: Clapperboard },
  { step: '02', title: 'AI Production', desc: 'Generate shots, visuals, audio, and dialogue. Complete assets from script to finished production.', icon: Sparkles },
  { step: '03', title: 'Reviews & Iterations', desc: 'Refine at shot, visual, audio, and dialogue level. Unlimited drafts before final approval.', icon: Camera },
  { step: '04', title: 'Post-Production', desc: 'ProRes broadcast-ready output. Delivered on schedule, ready to distribute.', icon: Monitor },
]

const customerCards = [
  { title: 'AI Content Studio', tagline: 'Multiply your creative ops', benefits: ['10x output', 'Your vision', 'We execute'], color: 'purple', gradient: 'from-purple-600/20 to-purple-900/10', borderColor: 'border-purple-500/20' },
  { title: 'Production House', tagline: 'Launch your IP instantly', benefits: ['No studio to build', '2-week go-live', 'All genres'], color: 'orange', gradient: 'from-orange-600/20 to-orange-900/10', borderColor: 'border-orange-500/20' },
  { title: 'OTT Platform', tagline: 'Fill library gaps fast', benefits: ['On-demand content', 'Any volume', 'Cheap @ scale'], color: 'cyan', gradient: 'from-cyan-600/20 to-cyan-900/10', borderColor: 'border-cyan-500/20' },
]

const reviews = [
  { name: 'Rajesh Menon', role: 'Head of Content, Regional OTT', quote: "LOQO delivered 200+ minutes of mythology content in 3 languages within a month. The quality rivals traditional studios at a fraction of the cost.", avatar: 'RM', stars: 5 },
  { name: 'Priya Sharma', role: 'Creative Director, Brand Studio', quote: "From brief to broadcast-ready episodes in 2 weeks. Our brand storytelling output increased 10x without adding headcount.", avatar: 'PS', stars: 5 },
  { name: 'Arjun Kapoor', role: 'Producer, Independent Films', quote: "The AI understands cinematic language. Shot composition, emotional beats, pacing — it gets it right. Game changer for pre-production.", avatar: 'AK', stars: 5 },
]

/* ─── Animated Section ─── */
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Dashboard Mockup ─── */
function DashboardMockup() {
  return (
    <div className="relative group">
      {/* Glow */}
      <div className="absolute -inset-4 bg-gradient-to-t from-purple-600/25 via-blue-500/15 to-transparent blur-3xl rounded-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
      <div className="absolute -inset-2 bg-purple-500/10 blur-2xl rounded-3xl" />

      <div className="relative rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-purple-900/30 bg-[#08090c]">
        {/* Chrome bar */}
        <div className="h-10 bg-[#0c0e14] border-b border-white/5 flex items-center px-4 gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 rounded-md bg-white/5 text-[10px] text-gray-500 font-mono">loqo.studio/project/the-mission</div>
          </div>
        </div>

        {/* App layout */}
        <div className="flex h-[540px]">
          {/* Sidebar */}
          <div className="w-56 bg-[#0a0c12] border-r border-white/5 p-4 space-y-4 hidden md:block">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
              <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center"><Film className="w-3 h-3" /></div>
              LOQO Studio
            </div>
            <div className="space-y-1">
              <div className="text-[9px] text-gray-600 uppercase tracking-wider pl-2">Projects</div>
              {['The Mission to Mars', 'Behind the Lens'].map((name, i) => (
                <div key={i} className={`text-xs px-2 py-1.5 rounded-md ${i === 0 ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' : 'text-gray-500'}`}>{name}</div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="text-[9px] text-gray-600 uppercase tracking-wider pl-2">Episodes</div>
              <div className="text-xs px-2 py-1.5 text-gray-500">View All Episodes</div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-10 border-b border-white/5 flex items-center px-4 gap-3">
              <span className="text-[10px] text-gray-400">EP 1</span>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <span className="text-[10px] text-gray-300 font-medium">Part 1</span>
              <div className="ml-auto px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] text-purple-400 font-medium">AI Studio</div>
            </div>

            <div className="flex gap-1 px-4 pt-3">
              {[
                { name: 'Beats', active: true },
                { name: 'Shots', active: false },
                { name: 'Storyboard', active: false },
                { name: 'Images', active: false },
                { name: 'Clips', active: false },
              ].map((tab) => (
                <div key={tab.name} className={`px-3 py-1.5 rounded-md text-[10px] font-medium ${tab.active ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20' : 'text-gray-500'}`}>{tab.name}</div>
              ))}
            </div>

            <div className="p-4 flex gap-3 overflow-hidden">
              {['Beat 1 - Opening', 'Beat 2 - Discovery', 'Beat 3 - Conflict'].map((beat, i) => (
                <div key={i} className="flex-shrink-0 w-64 rounded-lg border border-white/5 bg-[#0c0e14] overflow-hidden">
                  <div className="p-3 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-purple-300 font-semibold">{beat}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">v1</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="h-2 w-full rounded bg-white/5" />
                    <div className="h-2 w-4/5 rounded bg-white/5" />
                    <div className="h-2 w-3/5 rounded bg-white/5" />
                    <div className="h-6 w-full rounded bg-white/[0.02] mt-2" />
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-2">Generated Images</div>
              <div className="flex gap-2">
                {['from-purple-800/40 to-blue-900/40', 'from-blue-800/40 to-cyan-900/40', 'from-cyan-800/40 to-teal-900/40', 'from-pink-800/40 to-purple-900/40', 'from-orange-800/40 to-red-900/40'].map((g, i) => (
                  <div key={i} className={`w-20 h-14 rounded-md bg-gradient-to-br ${g} border border-white/5 flex items-center justify-center`}>
                    <Camera className="w-3 h-3 text-white/20" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-52 bg-[#0a0c12] border-l border-white/5 p-3 space-y-3 hidden lg:block">
            <div className="text-[10px] text-purple-300 font-bold flex items-center gap-1.5"><Wand2 className="w-3 h-3" /> AI Studio</div>
            <div className="flex gap-1">
              {['Beats', 'Shots', 'Images'].map((t, i) => (
                <div key={t} className={`flex-1 text-center text-[8px] py-1 rounded ${i === 2 ? 'bg-purple-500/15 text-purple-300' : 'text-gray-600'}`}>{t}</div>
              ))}
            </div>
            <div className="rounded-lg border border-dashed border-white/10 p-4 text-center">
              <div className="w-6 h-6 mx-auto mb-1 rounded bg-white/5 flex items-center justify-center"><ArrowDown className="w-3 h-3 text-gray-500" /></div>
              <div className="text-[8px] text-gray-500">Drag & drop images</div>
            </div>
            <div className="space-y-1">
              <div className="h-16 rounded bg-white/[0.02] border border-white/5" />
              <div className="h-7 rounded bg-purple-600/80 flex items-center justify-center text-[9px] text-white font-semibold">Generate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])
  const mockupScale = useTransform(scrollYProgress, [0, 0.5], [0.78, 1.02])
  const mockupY = useTransform(scrollYProgress, [0, 0.5], [80, -30])
  const mockupRotateX = useTransform(scrollYProgress, [0, 0.4], [8, 0])
  const mockupOpacity = useTransform(scrollYProgress, [0, 0.25], [0.6, 1])

  return (
    <div className="min-h-screen bg-[#050507] text-white overflow-x-hidden">
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-6">
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="bg-black/70 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-6 py-3 flex items-center justify-between shadow-2xl"
        >
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight" style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LOQO</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {['Features', 'Workflow', 'Reviews'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-gray-400 hover:text-white px-3.5 py-1.5 rounded-lg hover:bg-white/5 transition-all">{item}</a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link href="/auth/login">
              <button className="text-sm text-gray-400 hover:text-white px-4 py-1.5 rounded-lg hover:bg-white/5 transition-all">Login</button>
            </Link>
            <a href="https://calendly.com/deepak-connect/30-minute-meeting" target="_blank" rel="noopener noreferrer">
              <button className="px-5 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-purple-600/25 hover:shadow-purple-500/40">Schedule Demo</button>
            </a>
          </div>
        </motion.div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-28 pb-10 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,50,255,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_60%,rgba(59,130,246,0.06),transparent)]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="relative z-10 text-center max-w-5xl mx-auto mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs text-purple-300 font-medium">Technology Partner for Cinematic AI Content at Scale</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight mb-8">
            <span className="text-white">From script to</span><br />
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">screen in minutes</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A proprietary AI platform for creating cinema-quality episodes at scale. 100+ minutes per day, 9 languages, broadcast-ready output.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="flex flex-wrap items-center justify-center gap-4">
            <a href="https://calendly.com/deepak-connect/30-minute-meeting" target="_blank" rel="noopener noreferrer">
              <button className="group px-8 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-xl shadow-purple-600/30 hover:shadow-purple-500/50 flex items-center gap-2">
                Schedule a Demo <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </a>
            <a href="https://www.linkedin.com/posts/one-deepak_loqo-ott-television-activity-7415276566634655744-kuOL" target="_blank" rel="noopener noreferrer">
              <button className="group px-8 py-3.5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-all flex items-center gap-2 hover:bg-white/5">
                <Play className="w-4 h-4" /> Watch Showreel
              </button>
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: mockupY, scale: mockupScale, rotateX: mockupRotateX, opacity: mockupOpacity }}
          initial={{ opacity: 0, y: 100 }} animate={{ opacity: 0.6, y: 80 }}
          transition={{ delay: 0.9, duration: 1 }}
          className="relative z-10 w-full max-w-7xl mx-auto [perspective:1200px]">
          <DashboardMockup />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-5 h-8 border border-white/10 rounded-full flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 bg-purple-400 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="py-20 border-y border-white/5 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/5 via-transparent to-blue-900/5" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon
              return (
                <AnimatedSection key={stat.label} delay={i * 0.1} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/10 mb-4">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-4xl font-extrabold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-28 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(120,50,255,0.06),transparent_50%)]" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <AnimatedSection className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 mb-6">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-purple-300 font-medium">Technology & Creative Stack</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-5">
              Everything for<span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"> cinematic AI</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">End-to-end AI-powered production that covers every stage from script to broadcast-ready delivery.</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <AnimatedSection key={f.title} delay={i * 0.08}>
                  <div className={`group relative h-full rounded-2xl border ${f.border} bg-[#0a0c12] p-7 overflow-hidden hover:border-white/15 transition-all duration-500`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />
                    <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 text-white/80" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ WORKFLOW ═══ */}
      <section id="workflow" className="py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050507] via-[#0a0c14] to-[#050507]" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <AnimatedSection className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-6">
              <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-cyan-300 font-medium">How Integration Works</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-5">
              AI-powered production meets<span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"> creative control</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">Scale content without compromise. Four steps from brief to broadcast.</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflow.map((w, i) => {
              const Icon = w.icon
              return (
                <AnimatedSection key={w.step} delay={i * 0.12}>
                  <div className="relative group">
                    {i < workflow.length - 1 && (
                      <div className="hidden lg:block absolute top-10 left-full w-6 h-px bg-gradient-to-r from-white/10 to-transparent z-0" />
                    )}
                    <div className="relative rounded-2xl border border-white/5 bg-[#0a0c12] p-6 hover:border-cyan-500/20 transition-all duration-500 h-full">
                      <div className="text-5xl font-extrabold text-white/[0.04] absolute top-3 right-4">{w.step}</div>
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center mb-4">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-2">{w.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{w.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS FOR YOU ═══ */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050507] via-[#08071a] to-[#050507]" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-pink-500/20 bg-pink-500/5 mb-6">
              <Play className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-xs text-pink-300 font-medium">How It Works For You</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-5">
              Built for<span className="bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent"> every content creator</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">Whether you&apos;re a studio, production house, or OTT platform — LOQO scales with you.</p>
          </AnimatedSection>

          <div className="grid lg:grid-cols-3 gap-6">
            {customerCards.map((card, i) => (
              <AnimatedSection key={card.title} delay={i * 0.15}>
                <div className={`rounded-2xl border ${card.borderColor} bg-[#0a0c12] overflow-hidden hover:scale-[1.02] transition-transform duration-500 h-full flex flex-col`}>
                  <div className={`p-6 bg-gradient-to-br ${card.gradient}`}>
                    <h3 className="text-xl font-bold text-white mb-1">{card.title}</h3>
                    <p className="text-sm text-gray-400">{card.tagline}</p>
                  </div>
                  <div className="p-5 space-y-3 flex-1">
                    {card.benefits.map((benefit, j) => (
                      <div key={j} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold ${
                          card.color === 'purple' ? 'bg-purple-500/15 text-purple-400' :
                          card.color === 'orange' ? 'bg-orange-500/15 text-orange-400' :
                          'bg-cyan-500/15 text-cyan-400'
                        }`}>{j + 1}</div>
                        <span className="text-sm text-gray-300 font-medium">{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-5 pt-0">
                    <a href="https://calendly.com/deepak-connect/30-minute-meeting" target="_blank" rel="noopener noreferrer"
                      className={`w-full block text-center py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                        card.color === 'purple' ? 'bg-purple-600/80 hover:bg-purple-600 text-white' :
                        card.color === 'orange' ? 'bg-orange-600/80 hover:bg-orange-600 text-white' :
                        'bg-cyan-600/80 hover:bg-cyan-600 text-white'
                      }`}>Learn More →</a>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ REVIEWS ═══ */}
      <section id="reviews" className="py-28 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(120,50,255,0.04),transparent)]" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/5 mb-6">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs text-yellow-300 font-medium">Loved by Creators</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-5">What directors say</h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((r, i) => (
              <AnimatedSection key={r.name} delay={i * 0.1}>
                <div className="rounded-2xl border border-white/5 bg-[#0a0c12] p-7 h-full flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(r.stars)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-300 leading-relaxed flex-1 mb-6">&ldquo;{r.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">{r.avatar}</div>
                    <div>
                      <div className="text-sm font-semibold text-white">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.role}</div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LANGUAGES TICKER ═══ */}
      <section className="py-16 border-y border-white/5 overflow-hidden relative">
        <div className="mb-6 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em] font-medium">Languages we produce in</p>
        </div>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#050507] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#050507] to-transparent z-10" />
          <motion.div animate={{ x: [0, -1400] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} className="flex gap-8 items-center">
            {[...Array(2)].map((_, setIdx) => (
              <React.Fragment key={setIdx}>
                {['Hindi', 'English', 'Rajasthani', 'Gujarati', 'Marathi', 'Telugu', 'Tamil', 'Bangla', 'Kannada'].map((lang, i) => (
                  <div key={`${setIdx}-${i}`} className="flex-shrink-0 px-8 py-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <span className="text-xl font-bold text-gray-600 whitespace-nowrap">{lang}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,50,255,0.1),transparent_60%)]" />
        <AnimatedSection className="max-w-3xl mx-auto px-6 text-center relative">
          <h2 className="text-5xl md:text-6xl font-extrabold mb-6">
            Ready to <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">transform</span> your content?
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">Get a personalized demonstration of how our platform can help you scale content production across multiple languages and regions.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="https://calendly.com/deepak-connect/30-minute-meeting" target="_blank" rel="noopener noreferrer">
              <button className="group px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-2xl shadow-purple-600/30 hover:shadow-purple-500/50 transition-all flex items-center gap-2 text-lg">
                Schedule a Demo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </a>
            <Link href="/auth/login">
              <button className="px-10 py-4 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium rounded-xl transition-all text-lg hover:bg-white/5">Sign In</button>
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">LOQO</span>
          </div>
          <p className="text-xs text-gray-600">© 2026 LOQO. AI Content Studio for cinematic storytelling at scale. Built in India 🇮🇳</p>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Contact'].map((link) => (
              <a key={link} href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
