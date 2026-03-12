'use client'

import { Button } from '@/components/ui/button'
import { Upload, FileText, Users, MapPin, Clock, Download, MoreVertical } from 'lucide-react'
import { CanonBadge } from '@/components/project-breadcrumb'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export default function ScriptPage() {
  const parsedData = {
    scenes: 12,
    characters: 8,
    locations: 5,
    estimatedMinutes: 95,
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-8 bg-card">
        <div className="max-w-7xl mx-auto flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">Screenplay</h1>
              <CanonBadge level="project" />
              <span className="px-2 py-1 text-xs font-medium rounded bg-secondary text-muted-foreground uppercase">draft</span>
            </div>
            <p className="text-sm text-muted-foreground">Primary input for all downstream stages. Re-upload to create new versions.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-transparent">
              <Download size={16} className="mr-2" />
              Download
            </Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" size="sm">
              <Upload size={16} className="mr-2" />
              New Version
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 border border-border rounded-lg bg-card overflow-hidden flex flex-col">
              <div className="border-b border-border p-4 bg-secondary flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Script Preview</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical size={14} className="text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>Full Screen</DropdownMenuItem>
                    <DropdownMenuItem>Download</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>View History</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex-1 overflow-y-auto p-6 font-mono text-xs">
                <div className="text-muted-foreground space-y-4">
                  <div className="font-bold text-foreground">INT. COFFEE SHOP - MORNING</div>
                  <div>Rain patters against the windows. The shop is nearly empty.</div>
                  <div className="mt-4">
                    <div className="font-bold text-foreground">MAYA (32)</div>
                    <div>Sits by the window, laptop open, coffee untouched.</div>
                  </div>
                  <div className="mt-4">
                    <div className="font-bold text-foreground">MAYA</div>
                    <div className="text-foreground ml-4">(to herself)</div>
                    <div>Here we go again.</div>
                  </div>
                  <div className="mt-6 text-muted-foreground/60">CUT TO:</div>
                  <div className="mt-6 font-bold text-foreground">EXT. CITY STREET - CONTINUOUS</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border border-border rounded-lg bg-card p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Version Info</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Version</p>
                    <p className="text-sm font-semibold text-foreground">v1.0</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <p className="text-sm font-semibold text-foreground capitalize">Draft</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Uploaded</p>
                    <p className="text-sm font-semibold text-foreground">2 hours ago</p>
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-lg bg-card p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Parsed Data</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm border-b border-border pb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock size={14} />
                      Duration
                    </div>
                    <span className="font-medium text-foreground">{parsedData.estimatedMinutes}m</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-b border-border pb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText size={14} />
                      Scenes
                    </div>
                    <span className="font-medium text-foreground">{parsedData.scenes}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-b border-border pb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users size={14} />
                      Characters
                    </div>
                    <span className="font-medium text-foreground">{parsedData.characters}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin size={14} />
                      Locations
                    </div>
                    <span className="font-medium text-foreground">{parsedData.locations}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
