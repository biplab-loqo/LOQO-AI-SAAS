'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CharacterCardProps {
  character: {
    name: string
    description: string
    visual_identity?: string | null
    voice_profile?: string | null
  }
}

export function CharacterCard({ character }: CharacterCardProps) {
  return (
    <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-foreground">{character.name}</h3>
        {character.visual_identity && (
          <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300">{character.visual_identity}</Badge>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-semibold text-foreground/80 mb-1">Description</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {character.description || 'No description provided.'}
          </p>
        </div>

        {character.voice_profile && (
          <div>
            <p className="font-semibold text-foreground/80 mb-1">Voice Profile</p>
            <Badge variant="outline">{character.voice_profile}</Badge>
          </div>
        )}
      </div>
    </Card>
  )
}
