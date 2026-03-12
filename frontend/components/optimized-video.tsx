'use client'

import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import { cn } from '@/lib/utils'

/**
 * OptimizedVideo — video player component with:
 *   - CDN URL delivery for fast first-byte
 *   - HLS adaptive streaming via hls.js (dynamic import)
 *   - Preload metadata for fast start
 *   - Poster image support
 *   - Processing indicator for videos still transcoding
 *   - Idle pause / IntersectionObserver pause when out of viewport
 */

interface OptimizedVideoProps {
  /** Primary video URL (CDN or S3) */
  src: string
  /** CDN URL (preferred over src) */
  cdnUrl?: string | null
  /** HLS manifest URL for adaptive streaming */
  hlsUrl?: string | null
  /** Poster image URL */
  poster?: string | null
  /** CSS class for the container */
  className?: string
  /** CSS class for the video element */
  videoClassName?: string
  /** Width */
  width?: number
  /** Height */
  height?: number
  /** Object fit */
  objectFit?: 'cover' | 'contain' | 'fill'
  /** Autoplay (muted, inline) */
  autoPlay?: boolean
  /** Loop */
  loop?: boolean
  /** Muted */
  muted?: boolean
  /** Show native controls */
  controls?: boolean
  /** Preload strategy */
  preload?: 'none' | 'metadata' | 'auto'
  /** Called when video is ready to play */
  onCanPlay?: () => void
  /** Called on error */
  onError?: () => void
  /** Called when playback ends */
  onEnded?: () => void
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void
  /** Processing status from backend */
  processingStatus?: string
  /** Pause when out of viewport */
  pauseOffscreen?: boolean
  /** Play preview only while hovering */
  playOnHover?: boolean
}

function OptimizedVideoInner({
  src,
  cdnUrl,
  hlsUrl,
  poster,
  className,
  videoClassName,
  width,
  height,
  objectFit = 'cover',
  autoPlay = false,
  loop = false,
  muted = true,
  controls = true,
  preload = 'metadata',
  onCanPlay,
  onError,
  onEnded,
  onClick,
  processingStatus,
  pauseOffscreen = true,
  playOnHover = false,
}: OptimizedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  const resolvedSrc = cdnUrl || src

  // ------- HLS setup (dynamic import) -------
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // If we have an HLS URL and the browser doesn't natively support it
    if (hlsUrl && !video.canPlayType('application/vnd.apple.mpegurl')) {
      let cancelled = false

      import('hls.js').then(({ default: Hls }) => {
        if (cancelled) return

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
          })
          hls.loadSource(hlsUrl)
          hls.attachMedia(video)
          hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal: boolean }) => {
            if (data.fatal) {
              // Fall back to direct MP4
              video.src = resolvedSrc
            }
          })
          hlsRef.current = hls
        } else {
          // Fallback to native playback
          video.src = resolvedSrc
        }
      }).catch(() => {
        // hls.js not available, use direct src
        video.src = resolvedSrc
      })

      return () => {
        cancelled = true
        if (hlsRef.current) {
          hlsRef.current.destroy()
          hlsRef.current = null
        }
      }
    } else if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = hlsUrl
    } else {
      video.src = resolvedSrc
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [hlsUrl, resolvedSrc])

  // ------- IntersectionObserver: pause off-screen -------
  useEffect(() => {
    if (!pauseOffscreen || !containerRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.25 }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [pauseOffscreen])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !pauseOffscreen) return

    if (!isVisible && !video.paused) {
      video.pause()
    } else if (isVisible && autoPlay && video.paused) {
      video.play().catch(() => {/* ignore autoplay rejection */})
    }
  }, [isVisible, autoPlay, pauseOffscreen])

  // ------- Handlers -------
  const handleCanPlay = useCallback(() => {
    setReady(true)
    onCanPlay?.()
  }, [onCanPlay])

  const handleError = useCallback(() => {
    setError(true)
    onError?.()
  }, [onError])

  const handleMouseEnter = useCallback(() => {
    if (!playOnHover) return
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => { /* ignore autoplay rejection */ })
  }, [playOnHover])

  const handleMouseLeave = useCallback(() => {
    if (!playOnHover) return
    const video = videoRef.current
    if (!video) return
    video.pause()
    try {
      video.currentTime = 0
    } catch {
      // ignore seek errors
    }
  }, [playOnHover])

  // ------- Processing placeholder -------
  if (processingStatus === 'processing') {
    return (
      <div
        className={cn(
          'bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground/60 rounded',
          className
        )}
        style={{ width, height }}
      >
        <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-xs">Optimizing video…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          'bg-muted/30 flex items-center justify-center text-muted-foreground/40 rounded',
          className
        )}
        style={{ width, height }}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden rounded', className)}
      style={{ width, height }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 bg-muted/20 animate-pulse flex items-center justify-center">
          <svg className="w-6 h-6 text-muted-foreground/40 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      <video
        ref={videoRef}
        poster={poster || undefined}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        controls={controls}
        preload={preload}
        playsInline
        onCanPlay={handleCanPlay}
        onError={handleError}
        onEnded={onEnded}
        className={cn(
          'transition-opacity duration-300',
          ready ? 'opacity-100' : 'opacity-0',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          width === undefined && height === undefined && 'w-full h-full',
          videoClassName,
        )}
        width={width}
        height={height}
      />
    </div>
  )
}

export const OptimizedVideo = memo(OptimizedVideoInner, (prev, next) => {
  return (
    prev.src === next.src &&
    prev.cdnUrl === next.cdnUrl &&
    prev.hlsUrl === next.hlsUrl &&
    prev.poster === next.poster &&
    prev.className === next.className &&
    prev.processingStatus === next.processingStatus
  )
})

OptimizedVideo.displayName = 'OptimizedVideo'
