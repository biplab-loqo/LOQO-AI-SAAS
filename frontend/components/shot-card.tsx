'use client'

import type { Shot } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ShotCardProps {
  shot: Shot
}

export function ShotCard({ shot }: ShotCardProps) {
  return (
    <Card className="p-5 space-y-3 bg-card border border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Badge className="bg-accent/20 text-accent border-accent/30 mb-2">
            Shot {shot.shot}
          </Badge>
          <h4 className="font-semibold text-foreground">{shot.intent_title}</h4>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{shot.estimated_duration}</span>
      </div>

      <p className="text-sm text-muted-foreground">{shot.intent}</p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Emotion</p>
          <p className="text-foreground/80">{shot.emotion}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Narrative Function</p>
          <p className="text-foreground/80 text-xs">{shot.narrative_function}</p>
        </div>
      </div>
    </Card>
  )
}
