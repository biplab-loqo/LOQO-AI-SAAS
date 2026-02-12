'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, DownloadCloud } from 'lucide-react'

const shots = [
  { id: 1, episode: 1, scene: 1, shotLabel: 'A', title: 'Wide establishing shot', status: 'approved', versions: 4 },
  { id: 2, episode: 1, scene: 1, shotLabel: 'B', title: 'Close-up on hands', status: 'draft', versions: 3 },
  { id: 3, episode: 1, scene: 1, shotLabel: 'C', title: 'Morgan enters', status: 'draft', versions: 5 },
  { id: 4, episode: 1, scene: 1, shotLabel: 'D', title: 'Two-shot at table', status: 'draft', versions: 2 },
]

export default function ShotsListPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-8 bg-card">
        <div className="max-w-7xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Visual Shots</h1>
            <p className="text-sm text-muted-foreground">Gallery of AI-generated visual frames across all scenes.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-transparent"><DownloadCloud size={16} className="mr-2" />Export All</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" size="sm"><Plus size={16} className="mr-2" />Generate More</Button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shots.map((shot) => (
              <Link key={shot.id} href={`/project/${projectId}/episode/0${shot.episode}/scene/0${shot.scene}/shots`}>
                <div className="border border-border rounded-lg bg-card hover:border-accent/50 transition-colors cursor-pointer overflow-hidden">
                  <div className="aspect-video bg-secondary border-b border-border flex items-center justify-center">
                    <span className="text-sm text-muted-foreground font-semibold">Shot {shot.shotLabel}</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Ep {shot.episode} / Sc {shot.scene} / Shot {shot.shotLabel}</p>
                        <h3 className="text-sm font-semibold text-foreground">{shot.title}</h3>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${shot.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-secondary text-muted-foreground'}`}>{shot.status}</span>
                      <span className="text-xs text-muted-foreground">{shot.versions} versions</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
