'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Clock, CheckCircle, RotateCw } from 'lucide-react'

export interface Version {
  id: string
  number: number
  timestamp: string
  label?: string
  isActive: boolean
  isApproved?: boolean
}

interface VersionHistoryProps {
  versions: Version[]
  onSelect: (version: Version) => void
  onRestore?: (version: Version) => void
  className?: string
}

export default function VersionHistory({ versions, onSelect, onRestore, className }: VersionHistoryProps) {
  const [expanded, setExpanded] = useState(false)
  const activeVersion = versions.find(v => v.isActive) || versions[0]

  if (versions.length <= 1) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        <Clock size={12} />
        <span>v{activeVersion?.number || 1}</span>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-secondary border border-border text-xs text-foreground hover:bg-secondary/80 transition-colors"
      >
        <Clock size={12} className="text-muted-foreground" />
        <span className="font-medium">v{activeVersion.number}</span>
        <ChevronDown size={10} className={cn('text-muted-foreground transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Version History</p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {versions.map((version) => (
              <button
                key={version.id}
                onClick={() => {
                  onSelect(version)
                  setExpanded(false)
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  version.isActive ? 'bg-accent/10' : 'hover:bg-secondary/50'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold',
                  version.isActive ? 'bg-accent text-accent-foreground' :
                  version.isApproved ? 'bg-emerald-500/15 text-emerald-400' :
                  'bg-secondary text-muted-foreground'
                )}>
                  {version.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-xs font-medium', version.isActive ? 'text-accent' : 'text-foreground')}>
                      v{version.number}
                    </span>
                    {version.isApproved && <CheckCircle size={10} className="text-emerald-400" />}
                    {version.isActive && <span className="text-[9px] text-accent font-semibold uppercase">Current</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{version.timestamp}</p>
                  {version.label && <p className="text-[10px] text-muted-foreground/80">{version.label}</p>}
                </div>
                {!version.isActive && onRestore && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRestore(version)
                      setExpanded(false)
                    }}
                    className="p-1 rounded hover:bg-secondary transition-colors"
                    aria-label={`Restore version ${version.number}`}
                  >
                    <RotateCw size={10} className="text-muted-foreground" />
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
