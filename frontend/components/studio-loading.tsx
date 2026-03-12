'use client'

import { cn } from '@/lib/utils'
import { Sparkles, Film, Clapperboard, Wand2, Layers } from 'lucide-react'

/* ─── Full-page studio loader with orbiting dots ─── */
export function StudioPageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--studio-purple)/0.08)_0%,_transparent_70%)]" />
      
      <div className="relative flex flex-col items-center gap-6 z-10">
        {/* Orbiting loader */}
        <div className="relative w-20 h-20">
          {/* Outer ring */}
          <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full animate-spin" style={{ animationDuration: '1.2s' }} />
          
          {/* Inner ring */}
          <div className="absolute inset-3 border-2 border-transparent border-b-[hsl(var(--studio-cyan))] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.8s' }} />
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent animate-pulse" />
          </div>
          
          {/* Orbiting dot */}
          <div className="absolute inset-0 animate-orbit" style={{ animationDuration: '2s' }}>
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--studio-purple))]" />
          </div>
        </div>
        
        {/* Text */}
        <div className="text-center space-y-1.5">
          <p className="text-sm font-semibold text-foreground">{message}</p>
          <div className="flex items-center justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-accent animate-dot-bounce"
                style={{ animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Inline section loader ─── */
export function StudioSectionLoader({ message = 'Loading content...', className }: { message?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 gap-4", className)}>
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
        <div className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full animate-spin" style={{ animationDuration: '1s' }} />
        <div className="absolute inset-2 border-2 border-transparent border-b-[hsl(var(--studio-cyan))] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Wand2 className="w-4 h-4 text-accent/60" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  )
}

/* ─── Project card skeleton ─── */
export function ProjectCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden studio-card">
      {/* Top gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-accent/30 via-[hsl(var(--studio-cyan)/0.3)] to-[hsl(var(--studio-pink)/0.3)] animate-gradient-x" style={{ backgroundSize: '200% 200%' }} />
      
      <div className="p-6 space-y-4">
        {/* Badge */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-accent/10 animate-skeleton-breathe" />
          <div className="h-3 w-16 rounded-full animate-skeleton-wave" />
        </div>
        
        {/* Title */}
        <div className="h-5 w-3/4 rounded-lg animate-skeleton-wave delay-100" />
        
        {/* Description lines */}
        <div className="space-y-2">
          <div className="h-3 w-full rounded-md animate-skeleton-wave delay-200" />
          <div className="h-3 w-2/3 rounded-md animate-skeleton-wave delay-300" />
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 pt-2">
          <div className="h-3 w-20 rounded-full animate-skeleton-wave delay-400" />
          <div className="h-3 w-20 rounded-full animate-skeleton-wave delay-500" />
        </div>
        
        {/* Button */}
        <div className="pt-4 border-t border-border/50">
          <div className="h-9 w-full rounded-lg animate-skeleton-wave delay-600" />
        </div>
      </div>
    </div>
  )
}

/* ─── Dashboard skeleton grid ─── */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-72 rounded-lg animate-skeleton-wave" />
        <div className="h-4 w-48 rounded-md animate-skeleton-wave delay-100" />
      </div>
      
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/* ─── Episode list skeleton ─── */
export function EpisodeListSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in-up">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Number */}
          <div className="w-10 h-10 rounded-lg animate-skeleton-wave flex-shrink-0" />
          
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded-md animate-skeleton-wave" style={{ animationDelay: `${i * 50}ms` }} />
            <div className="h-3 w-24 rounded-md animate-skeleton-wave" style={{ animationDelay: `${i * 50 + 100}ms` }} />
          </div>
          
          {/* Progress bar */}
          <div className="w-24 h-2 rounded-full animate-skeleton-wave flex-shrink-0" />
          
          {/* Arrow */}
          <div className="w-5 h-5 rounded animate-skeleton-breathe flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

/* ─── Pipeline skeleton ─── */
export function PipelineSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4 animate-fade-in-up">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/50 bg-card p-5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg animate-skeleton-wave" style={{ animationDelay: `${i * 100}ms` }} />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-16 rounded-md animate-skeleton-wave" style={{ animationDelay: `${i * 100 + 50}ms` }} />
              <div className="h-3 w-full rounded-md animate-skeleton-wave" style={{ animationDelay: `${i * 100 + 100}ms` }} />
            </div>
          </div>
          <div className="h-6 w-20 rounded-full animate-skeleton-wave" style={{ animationDelay: `${i * 100 + 150}ms` }} />
        </div>
      ))}
    </div>
  )
}

/* ─── Part content skeleton (for beats/shots/images tabs) ─── */
export function PartContentSkeleton({ count = 4, type = 'card' }: { count?: number; type?: 'card' | 'image' | 'video' }) {
  if (type === 'image') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-fade-in-up">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border/50 bg-card">
            <div className="w-full h-full animate-skeleton-wave" style={{ animationDelay: `${i * 80}ms` }} />
          </div>
        ))}
      </div>
    )
  }
  
  if (type === 'video') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in-up">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border/50 bg-card">
            <div className="aspect-video w-full animate-skeleton-wave" style={{ animationDelay: `${i * 80}ms` }} />
            <div className="p-3 space-y-2">
              <div className="h-3 w-2/3 rounded-md animate-skeleton-wave" />
              <div className="h-3 w-1/3 rounded-md animate-skeleton-wave delay-100" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-hidden animate-fade-in-up">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[380px] rounded-xl border border-border/50 bg-card overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-border/50 bg-gradient-to-r from-accent/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 rounded-md animate-skeleton-wave" style={{ animationDelay: `${i * 100}ms` }} />
              <div className="h-5 w-8 rounded-full animate-skeleton-wave" />
            </div>
          </div>
          
          {/* Content */}
          <div className="p-4 space-y-3">
            <div className="h-4 w-full rounded-md animate-skeleton-wave" style={{ animationDelay: `${i * 100 + 100}ms` }} />
            <div className="h-4 w-5/6 rounded-md animate-skeleton-wave" style={{ animationDelay: `${i * 100 + 200}ms` }} />
            <div className="h-4 w-2/3 rounded-md animate-skeleton-wave" style={{ animationDelay: `${i * 100 + 300}ms` }} />
            <div className="h-12 w-full rounded-lg animate-skeleton-wave" style={{ animationDelay: `${i * 100 + 400}ms` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
