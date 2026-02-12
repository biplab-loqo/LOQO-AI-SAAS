'use client'

import React from 'react'
import type { StoryboardPanel as StoryboardPanelType } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface StoryboardTableProps {
    panels: StoryboardPanelType[]
}

export function StoryboardTable({ panels }: StoryboardTableProps) {
    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-secondary/50">
                        <TableHead className="w-16 text-center">Panel</TableHead>
                        <TableHead className="w-16 text-center">Beat</TableHead>
                        <TableHead className="min-w-[200px]">Shot Summary</TableHead>
                        <TableHead className="w-32">Shot Size/Angle</TableHead>
                        <TableHead className="w-24">Lens</TableHead>
                        <TableHead className="w-32">Camera Movement</TableHead>
                        <TableHead className="min-w-[150px]">Location</TableHead>
                        <TableHead className="min-w-[200px]">Dialogue</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {panels.map((panel) => (
                        <TableRow key={panel.metadata.panel_number} className="hover:bg-secondary/30">
                            <TableCell className="text-center font-medium">
                                {panel.metadata.panel_number}
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant="outline" className="text-xs">
                                    {panel.metadata.beat_number}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{panel.metadata.shot_summary}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {panel.cinematography.shot_size_angle}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {panel.cinematography.lens_intent}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {panel.cinematography.camera_movement}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {panel.setting.key_location}
                            </TableCell>
                            <TableCell className="text-xs italic">
                                {panel.audio.dialogue !== 'NA' ? `"${panel.audio.dialogue}"` : '—'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
