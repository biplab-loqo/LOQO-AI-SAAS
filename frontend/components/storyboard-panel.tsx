'use client'

import React, { useState } from 'react'
import type { StoryboardPanel as StoryboardPanelType } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Camera, Users, MapPin, Sparkles, Music } from 'lucide-react'

interface StoryboardPanelProps {
  panel: StoryboardPanelType
}

export function StoryboardPanel({ panel }: StoryboardPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="overflow-hidden border-border bg-card hover:border-accent/50 transition-colors">
      {/* Panel Placeholder */}
      <div className="w-full aspect-[9/16] bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center border-b border-border relative">
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold text-muted-foreground/40">Panel {panel.metadata.panel_number}</div>
          <p className="text-sm text-muted-foreground/50">{panel.cinematography.shot_size_angle}</p>
        </div>
        <div className="absolute top-3 left-3">
          <Badge className="bg-accent/20 text-accent border-accent/30">
            Beat {panel.metadata.beat_number}
          </Badge>
        </div>
      </div>

      {/* Panel Details */}
      <div className="p-4 space-y-4">
        {/* Summary */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">Shot Summary</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{panel.metadata.shot_summary}</p>
        </div>

        {/* Cinematography */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-3.5 h-3.5 text-accent" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Cinematography</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Shot Size</p>
              <Badge variant="outline" className="text-[10px] w-full justify-center">
                {panel.cinematography.shot_size_angle}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Lens</p>
              <Badge variant="outline" className="text-[10px] w-full justify-center">
                {panel.cinematography.lens_intent}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Movement</p>
              <Badge variant="outline" className="text-[10px] w-full justify-center">
                {panel.cinematography.camera_movement}
              </Badge>
            </div>
          </div>
        </div>

        {/* Composition */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Composition</p>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Subject</p>
              <p className="text-xs text-foreground leading-relaxed">{panel.composition.subject_composition}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Action</p>
              <p className="text-xs text-foreground leading-relaxed">{panel.composition.action}</p>
            </div>
          </div>
        </div>

        {/* Expandable Section Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 mr-1" />
              Show More Details
            </>
          )}
        </Button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t border-border">
            {/* Setting */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Setting</p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Location</p>
                  <p className="text-xs text-foreground font-medium">{panel.setting.key_location}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Scenography</p>
                  <p className="text-xs text-foreground leading-relaxed">{panel.setting.scenography}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Time Context</p>
                  <p className="text-xs text-foreground">{panel.setting.time_context}</p>
                </div>
              </div>
            </div>

            {/* Character Focal Position */}
            {panel.character_focal_position && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Character Focal Position
                </p>
                <p className="text-xs text-foreground leading-relaxed">{panel.character_focal_position}</p>
              </div>
            )}

            {/* Characters */}
            {panel.characters && panel.characters.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-3.5 h-3.5 text-accent" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Characters</p>
                </div>
                <div className="space-y-2">
                  {panel.characters.map((character, idx) => (
                    <div key={idx} className="bg-secondary/50 p-2 rounded border border-border/50">
                      <p className="text-xs font-semibold text-foreground mb-1">{character.character_name}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {character.character_visual_identity}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Story Context */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Story Context</p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Visual Style Guide</p>
                  <p className="text-xs text-foreground">{panel.story_context.visual_style_guide}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Project Context</p>
                  <p className="text-xs text-foreground">{panel.story_context.project_context}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Era/Culture Context</p>
                  <p className="text-xs text-foreground">{panel.story_context.era_culture_context}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Emotional/Thematic Intent</p>
                  <p className="text-xs text-foreground italic leading-relaxed">
                    {panel.story_context.emotional_thematic_intent}
                  </p>
                </div>
              </div>
            </div>

            {/* Audio */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-3.5 h-3.5 text-accent" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Audio</p>
              </div>
              <div className="space-y-2">
                {panel.audio.dialogue !== 'NA' && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Dialogue</p>
                    <p className="text-xs text-foreground italic leading-relaxed bg-secondary/30 p-2 rounded border border-border/50">
                      "{panel.audio.dialogue}"
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Audio Cue Intent</p>
                  <p className="text-xs text-foreground leading-relaxed">{panel.audio.audio_cue_intent}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
