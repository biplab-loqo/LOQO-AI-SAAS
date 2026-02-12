'use client'

import React, { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import {
    RefreshCw,
    RotateCcw,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2
} from 'lucide-react'

type VersionStatus = 'completed' | 'failed' | 'processing' | 'pending'

interface Version {
    id: string
    version: number
    timestamp: Date
    status: VersionStatus
    entityType: 'beat' | 'shot' | 'storyboard' | 'image' | 'clip'
    entityId: string
    entityName: string
}

interface VersionPanelProps {
    partId: string
    partTitle: string
    versions?: Version[]
}

const statusConfig: Record<VersionStatus, { icon: React.ElementType; color: string; label: string }> = {
    completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
    processing: { icon: Loader2, color: 'text-blue-500', label: 'Processing' },
    pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' }
}

export function VersionPanel({ partId, partTitle, versions = [] }: VersionPanelProps) {
    const groupedVersions = useMemo(() => versions.reduce((acc, version) => {
        if (!acc[version.entityType]) {
            acc[version.entityType] = []
        }
        acc[version.entityType].push(version)
        return acc
    }, {} as Record<string, Version[]>), [versions])

    const formatTimestamp = (date: Date) => {
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (days > 0) return `${days}d ago`
        if (hours > 0) return `${hours}h ago`
        if (minutes > 0) return `${minutes}m ago`
        return 'Just now'
    }

    const entityTypeLabels: Record<string, string> = {
        beat: 'Beats',
        shot: 'Shots',
        storyboard: 'Storyboards',
        image: 'Images',
        clip: 'Clips'
    }

    const getLatestVersion = (entityType: string) => {
        const typeVersions = groupedVersions[entityType] || []
        return typeVersions.length > 0 ? Math.max(...typeVersions.map(v => v.version)) : 0
    }

    return (
        <Card className="h-full flex flex-col border-border bg-card">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground mb-1">Version History</h3>
                <p className="text-xs text-muted-foreground">{partTitle}</p>
            </div>

            {/* Version List */}
            <ScrollArea className="flex-1 p-4">
                {versions.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No version history yet.</div>
                ) : (
                    <Accordion type="multiple" className="space-y-2">
                    {Object.entries(groupedVersions).map(([entityType, entityVersions]) => {
                        const latestVersion = getLatestVersion(entityType)
                        return (
                            <AccordionItem
                                key={entityType}
                                value={entityType}
                                className="border border-border rounded-lg overflow-hidden"
                            >
                                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-secondary/50">
                                    <div className="flex items-center justify-between w-full pr-2">
                                        <span className="text-sm font-medium text-foreground">
                                            {entityTypeLabels[entityType]}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            v{latestVersion}
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pb-2">
                                    <div className="space-y-2">
                                        {entityVersions.map((version) => {
                                            const StatusIcon = statusConfig[version.status].icon
                                            return (
                                                <div
                                                    key={version.id}
                                                    className="flex items-start gap-2 p-2 rounded bg-secondary/30 border border-border/50"
                                                >
                                                    <StatusIcon
                                                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${statusConfig[version.status].color} ${version.status === 'processing' ? 'animate-spin' : ''}`}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <p className="text-xs font-medium text-foreground truncate">
                                                                {version.entityName}
                                                            </p>
                                                            <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                                                                v{version.version}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {formatTimestamp(version.timestamp)}
                                                            </p>
                                                            <span className="text-[10px] text-muted-foreground">•</span>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {statusConfig[version.status].label}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                    </Accordion>
                )}
            </ScrollArea>

            {/* Action Buttons */}
            <div className="p-4 border-t border-border space-y-2">
                <Button
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    size="sm"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                </Button>
                <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry
                </Button>
            </div>
        </Card>
    )
}
