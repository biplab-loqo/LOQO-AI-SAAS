'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCw, RefreshCw, Loader2, CheckCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GenerationToolbarProps {
  assetLabel: string
  onRetry: () => void
  onRegenerate: (feedback?: string) => void
  onApprove?: () => void
  isGenerating?: boolean
  status?: 'draft' | 'iterating' | 'approved'
  className?: string
}

export default function GenerationToolbar({
  assetLabel,
  onRetry,
  onRegenerate,
  onApprove,
  isGenerating = false,
  status = 'draft',
  className,
}: GenerationToolbarProps) {
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)

  const handleRegenerate = () => {
    onRegenerate(feedback || undefined)
    setFeedback('')
    setShowFeedback(false)
  }

  return (
    <div className={cn('border border-border rounded-lg bg-card', className)}>
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">{assetLabel}</p>
        {status === 'approved' && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
            <CheckCircle size={10} />
            Approved
          </span>
        )}
      </div>

      {/* Feedback input */}
      {showFeedback && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[11px] text-muted-foreground mb-2">Describe what to change before regenerating:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRegenerate()
              }}
              placeholder="e.g. Make the tone darker, change camera angle..."
              className="flex-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
            <Button
              onClick={handleRegenerate}
              disabled={isGenerating}
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground h-8 w-8 p-0 flex-shrink-0"
            >
              <Send size={12} />
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 py-3 flex items-center gap-2">
        <Button
          onClick={onRetry}
          disabled={isGenerating}
          variant="outline"
          size="sm"
          className="bg-transparent flex-1"
        >
          {isGenerating ? (
            <Loader2 size={14} className="mr-2 animate-spin" />
          ) : (
            <RefreshCw size={14} className="mr-2" />
          )}
          Retry
        </Button>
        <Button
          onClick={() => {
            if (showFeedback) {
              handleRegenerate()
            } else {
              setShowFeedback(true)
            }
          }}
          disabled={isGenerating}
          variant="outline"
          size="sm"
          className="bg-transparent flex-1"
        >
          {isGenerating ? (
            <Loader2 size={14} className="mr-2 animate-spin" />
          ) : (
            <RotateCw size={14} className="mr-2" />
          )}
          Regenerate
        </Button>
        {onApprove && status !== 'approved' && (
          <Button
            onClick={onApprove}
            disabled={isGenerating}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-foreground flex-1"
          >
            <CheckCircle size={14} className="mr-2" />
            Approve
          </Button>
        )}
      </div>
    </div>
  )
}
