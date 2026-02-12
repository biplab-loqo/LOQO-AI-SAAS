'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Send, Sparkles, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIMessage {
  id: string
  type: 'user' | 'system'
  content: string
  timestamp: Date
}

interface AIPanelProps {
  assetName?: string
  assetType?: 'Bible' | 'Character' | 'Location' | 'Beat' | 'Storyboard' | 'Shot'
  onClose: () => void
  open: boolean
}

const examplePrompts = {
  Bible: [
    'Make the tone grittier',
    'Add more magical elements',
    'Emphasize isolation theme',
  ],
  Character: [
    'Make older, worn appearance',
    'Different hair color',
    'More intimidating expression',
  ],
  Location: [
    'Add dramatic lighting',
    'More overgrown vegetation',
    'Industrial aesthetic',
  ],
  Beat: [
    'Increase emotional tension',
    'Faster pacing here',
    'Add dialogue moment',
  ],
  Storyboard: [
    'Wider camera angle',
    'More movement',
    'Closer framing',
  ],
  Shot: [
    'Warmer color grading',
    'More depth of field blur',
    'Add atmospheric fog',
  ],
}

export default function AIPanel({ assetName, assetType, onClose, open }: AIPanelProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'system',
      content: `Ready to help refine your ${assetType}. Describe the changes you'd like.`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleSendMessage = () => {
    if (!input.trim()) return

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages([...messages, userMessage])
    setInput('')
    setGenerating(true)

    // Simulate AI response
    setTimeout(() => {
      const systemMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Generated 3 variations based on: "${input}"`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, systemMessage])
      setGenerating(false)
    }, 1000)
  }

  if (!open) return null

  const currentPrompts = assetType ? examplePrompts[assetType] : []

  return (
    <div className={cn(
      'border-l border-border bg-card flex flex-col transition-all duration-300 overflow-hidden',
      collapsed ? 'w-14' : 'w-80'
    )}>
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between flex-shrink-0">
        {!collapsed && (
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              AI Assistant
            </h3>
            {assetName && (
              <p className="text-xs text-muted-foreground mt-1">
                {assetType}: {assetName}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-6 w-6 p-0"
          >
            <ChevronDown
              size={14}
              className={cn('transition-transform', collapsed && '-rotate-90')}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X size={14} />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* References Section */}
          <div className="border-b border-border p-4 text-xs flex-shrink-0">
            <p className="text-muted-foreground font-semibold mb-2">References Used</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                <span>Bible v1.0 (approved)</span>
              </div>
              {assetType === 'Character' && (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <span>Location: Coffee Shop</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <span>3 prev. versions</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2 text-xs leading-relaxed',
                  msg.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-xs px-3 py-2 rounded',
                    msg.type === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-foreground'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {generating && (
              <div className="flex gap-2 justify-start">
                <div className="bg-secondary text-foreground px-3 py-2 rounded text-xs">
                  <div className="flex gap-1 items-center">
                    <span>Generating</span>
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Prompt Input */}
          <div className="border-t border-border p-4 space-y-3 flex-shrink-0">
            {currentPrompts.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">Try</p>
                <div className="grid grid-cols-1 gap-1">
                  {currentPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(prompt)
                      }}
                      className="text-left text-xs px-2 py-1.5 rounded bg-secondary hover:bg-secondary/80 transition text-muted-foreground hover:text-foreground text-balance"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage()
                }}
                placeholder="Describe changes..."
                className="flex-1 px-3 py-2 rounded bg-secondary border border-border text-foreground placeholder-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || generating}
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground p-0 w-8 h-8 flex items-center justify-center"
              >
                <Send size={12} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
