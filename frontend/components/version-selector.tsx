"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface VersionSelectorProps {
  entityType: "beat" | "shot" | "storyboard" | "part"
  entityId: string
  onVersionChange?: (version: any | null) => void
}

export function VersionSelector({
  entityType,
  entityId,
  onVersionChange,
}: VersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="w-full border-t border-border/50 bg-gradient-to-br from-muted/30 via-muted/10 to-background">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-3 h-auto hover:bg-gradient-to-r hover:from-primary/5 hover:to-purple-500/5 transition-all duration-200 group"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">Version History</span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border/50">
          <div className="p-4">
            <p className="text-sm text-muted-foreground text-center py-6">
              Version history is managed through individual beat, shot, and storyboard version controls.
              Use the set-current controls on each item to manage active versions.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
