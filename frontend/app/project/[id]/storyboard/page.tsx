'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Play } from 'lucide-react'

const storyboards = [
  { episode: 1, scene: 1, title: 'INT. COFFEE SHOP - MORNING', status: 'in-progress', shots: 4 },
  { episode: 1, scene: 2, title: 'EXT. STREET - CONTINUOUS', status: 'draft', shots: 0 },
  { episode: 1, scene: 3, title: 'INT. FBI SAFE HOUSE - DAY', status: 'draft', shots: 0 },
]

export default function StoryboardListPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-8 bg-card">
        <div className="max-w-7xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Storyboards</h1>
            <p className="text-sm text-muted-foreground">Scene-by-scene visual planning and shot composition.</p>
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" size="sm">
            <Plus size={16} className="mr-2" />
            New Storyboard
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-4">
          {storyboards.map((sb) => (
            <Link key={`${sb.episode}-${sb.scene}`} href={`/project/${projectId}/episode/0${sb.episode}/scene/0${sb.scene}/storyboard`}>
              <div className="border border-border rounded-lg bg-card hover:border-accent/50 transition-colors cursor-pointer p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase">Episode {sb.episode} / Scene {sb.scene}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${sb.status === 'draft' ? 'bg-secondary text-muted-foreground' : 'bg-accent/10 text-accent'}`}>{sb.status}</span>
                    </div>
                    <h3 className="text-foreground font-medium mb-2">{sb.title}</h3>
                  </div>
                  <Button variant="ghost" size="sm"><Play size={16} /></Button>
                </div>
                <p className="text-sm text-muted-foreground">{sb.shots} shots planned</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
