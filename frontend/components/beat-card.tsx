'use client'

import type { Beat } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BeatCardProps {
  beat: Beat
  expanded?: boolean
}

export function BeatCard({ beat, expanded = false }: BeatCardProps) {
  return (
    <Card className="p-6 space-y-4 bg-card border border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-accent/20 text-accent border-accent/30">
              Beat {beat.Beat_Number}
            </Badge>
            <span className="text-xs text-muted-foreground">{beat.Time_Range}s</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">{beat.Title}</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{beat.Description}</p>

      <div className="bg-accent/10 border border-accent/20 rounded p-3">
        <p className="text-xs font-semibold text-accent mb-1">Scene Reference</p>
        <p className="text-sm text-foreground/80">{beat.Scene_Ref}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Emotion</p>
          <Badge variant="secondary" className="text-xs bg-secondary text-foreground border-border">
            {beat.Emotion}
          </Badge>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Screenplay Lines</p>
          <Badge variant="outline" className="text-xs border-border text-foreground">
            {beat.Screenplay_lines.length} lines
          </Badge>
        </div>
      </div>

      {expanded && (
        <div className="pt-4 border-t border-border space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Screenplay</p>
            <div className="bg-secondary/50 p-3 rounded text-xs text-foreground space-y-1 max-h-32 overflow-y-auto border border-border/50">
              {beat.Screenplay_lines.map((line, idx) => (
                <p key={idx} className="font-mono text-foreground/70">
                  {line}
                </p>
              ))}
            </div>
          </div>

          {beat.shots && beat.shots.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Shots ({beat.shots.length})
              </p>
              <div className="space-y-2">
                {beat.shots.map((shot) => (
                  <div key={shot.shot} className="bg-secondary border border-border p-2 rounded">
                    <p className="text-xs font-semibold text-foreground">{shot.shot} - {shot.intent_title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{shot.intent}</p>
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Duration: {shot.estimated_duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
