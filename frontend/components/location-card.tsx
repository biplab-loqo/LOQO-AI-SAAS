'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface LocationCardProps {
  location: {
    name: string
    description: string
    visual_profile?: Record<string, any> | null
  }
}

export function LocationCard({ location }: LocationCardProps) {
  return (
    <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">{location.name}</h3>
        <Badge className="bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-300">Location</Badge>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-semibold text-foreground/80 mb-1">Description</p>
          <p className="text-muted-foreground">{location.description || 'No description provided.'}</p>
        </div>

        {location.visual_profile && (
          <div className="border-t border-border pt-3">
            <p className="font-semibold text-foreground/80 mb-2">Visual Profile</p>
            <div className="space-y-2">
              {Object.entries(location.visual_profile).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground font-semibold capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-foreground/80 text-xs">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
