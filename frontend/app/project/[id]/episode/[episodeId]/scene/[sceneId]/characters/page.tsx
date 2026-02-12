'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users } from 'lucide-react'
import { ProjectBreadcrumb } from '@/components/project-breadcrumb'

export default function CharactersPage() {
  const params = useParams()
  const projectId = params.id as string
  const episodeId = params.episodeId as string
  const sceneId = params.sceneId as string

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ProjectBreadcrumb projectId={params.id as string} episodeId={episodeId} sceneId={sceneId} />

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href={`/project/${params.id}/episode/${episodeId}/scene/${sceneId}`}>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft size={16} />
                Back to Part
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users size={28} />
              Characters
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Cast profiles and character descriptions</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Coming Soon</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Character management is being redesigned. Check back soon for an improved experience.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
