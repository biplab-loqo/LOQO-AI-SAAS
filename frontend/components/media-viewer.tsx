'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Pause, Volume2, VolumeX, Maximize2, Film } from 'lucide-react'

type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9' | 'auto'

interface MediaViewerProps {
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  aspectRatio?: AspectRatio
  title?: string
  description?: string
  placeholder?: boolean
}

const aspectRatioClasses: Record<AspectRatio, string> = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '21:9': 'aspect-[21/9]',
  'auto': 'aspect-video'
}

export function MediaViewer({
  mediaUrl,
  mediaType = 'video',
  aspectRatio = '16:9',
  title,
  description,
  placeholder = false
}: MediaViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration)
    const handleEnded = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const aspectClass = aspectRatioClasses[aspectRatio]

  if (placeholder || !mediaUrl) {
    return (
      <Card className="overflow-hidden border-border bg-card">
        <div className={`w-full ${aspectClass} bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center`}>
          <div className="text-center space-y-3">
            <Film className="w-16 h-16 text-muted-foreground/30 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Media Viewer</p>
              <p className="text-xs text-muted-foreground">Generated media will appear here</p>
              <Badge variant="outline" className="mt-2 text-xs">
                {aspectRatio} aspect ratio
              </Badge>
            </div>
          </div>
        </div>
        {(title || description) && (
          <div className="p-4 border-t border-border">
            {title && <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        )}
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-border bg-card">
      <div className={`w-full ${aspectClass} relative bg-black group`}>
        {mediaType === 'video' ? (
          <>
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-full object-contain"
              onClick={togglePlay}
            />
            
            {/* Video Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-white hover:bg-white/20"
                      onClick={togglePlay}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-white hover:bg-white/20"
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </Button>
                    <span className="text-xs text-white font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    <Maximize2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <img
            src={mediaUrl}
            alt={title || 'Media'}
            className="w-full h-full object-contain"
          />
        )}
      </div>
      
      {(title || description) && (
        <div className="p-4 border-t border-border">
          {title && <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
    </Card>
  )
}
