'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Send, X, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AttributeOption {
  label: string
  value: string
  category: string
}

interface AICreationPanelProps {
  assetType: string
  title: string
  description?: string
  attributes?: AttributeOption[]
  suggestedPrompts?: string[]
  onApply?: (content: string) => void
  onClose: () => void
}

export default function AICreationPanel({
  assetType,
  title,
  description,
  attributes = [],
  suggestedPrompts = [],
  onApply,
  onClose,
}: AICreationPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `I can help you create and refine your ${assetType}. Describe what you want or pick a suggestion below.`,
    },
  ])
  const [input, setInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([])
  const [showAttributes, setShowAttributes] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || generating) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    }
    setMessages((prev) => [...prev, userMsg])
    const currentInput = input
    setInput('')
    setGenerating(true)

    // Simulated AI response
    setTimeout(() => {
      const attrContext = selectedAttributes.length > 0
        ? ` (configured: ${selectedAttributes.join(', ')})`
        : ''

      const responses: Record<string, string[]> = {
        character: [
          `Here's a character concept based on your input${attrContext}:\n\n**Name suggestion:** A weathered individual shaped by conflict and isolation. Their defining trait is an unwavering sense of duty that conflicts with personal desires.\n\n**Personality:** Reserved but perceptive. They notice details others miss. Under pressure, a dry humor surfaces.\n\n**Backstory hook:** They left behind something they can never return to. The question isn't what happened -- it's what they'll do now.\n\nWant me to refine any of these aspects?`,
          `Based on your description${attrContext}, I'd suggest:\n\n**Archetype:** The reluctant hero with a hidden past\n**Key traits:** Observant, guarded, unexpectedly compassionate\n**Visual presence:** Someone who blends into crowds by choice, not necessity\n**Speech pattern:** Economical with words, every sentence carries weight\n\nShall I develop the backstory further or adjust the personality?`,
        ],
        bible: [
          `Here's a refined take on your story bible${attrContext}:\n\n**Tone adjustment:** The narrative voice should feel like a documentary that slowly reveals it's fiction. Grounded realism with creeping surrealism.\n\n**Visual language:** Favor practical lighting over stylized. The world should feel lived-in, not designed.\n\n**Thematic anchor:** Every scene should subtly ask: "What are we willing to forget to survive?"\n\nWant me to expand on any section?`,
        ],
        location: [
          `Here's a location concept${attrContext}:\n\n**Atmosphere:** The space tells a story before any character enters. Details reveal history -- scuff marks, faded signage, ambient sounds.\n\n**Lighting notes:** Natural light dominant, creating sharp contrasts between illuminated and shadowed areas.\n\n**Production consideration:** This location works for both intimate dialogue scenes and wider establishing shots.\n\nShall I adjust the mood or add technical details?`,
        ],
        beat: [
          `Beat concept${attrContext}:\n\n**Emotional arc:** Start with false security, build through subtle unease, arrive at a moment of clarity that changes everything.\n\n**Pacing note:** Let the audience feel the shift before the characters acknowledge it.\n\n**Transition:** This beat naturally flows into a confrontation or revelation.\n\nWant me to adjust the intensity or restructure the arc?`,
        ],
        shot: [
          `Shot design${attrContext}:\n\n**Composition:** Frame the subject off-center, using negative space to emphasize isolation or tension.\n\n**Camera:** Begin static, introduce slow movement as the emotional stakes rise.\n\n**Lens choice:** Longer focal length to compress the background, creating visual pressure.\n\nShall I generate alternative compositions?`,
        ],
        storyboard: [
          `Storyboard sequence${attrContext}:\n\n**Flow:** Open with an establishing wide, cut to a reaction close-up, then track with the subject's movement.\n\n**Rhythm:** Hold the wide shot longer than feels comfortable -- let tension build through stillness.\n\n**Transition to next scene:** End on a visual echo that connects to the following sequence.\n\nWant me to adjust the shot order or add frames?`,
        ],
      }

      const typeResponses = responses[assetType] || responses.beat || []
      const responseText = typeResponses[Math.floor(Math.random() * typeResponses.length)]
        || `Here's my suggestion for your ${assetType}${attrContext}. I've considered your input and project context to generate something that fits your creative vision. Want me to adjust anything?`

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
      }
      setMessages((prev) => [...prev, assistantMsg])
      setGenerating(false)
      onApply?.(currentInput)
    }, 1500)
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
  }

  const handleAttributeToggle = (value: string) => {
    setSelectedAttributes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const groupedAttributes = attributes.reduce(
    (acc, attr) => {
      if (!acc[attr.category]) acc[attr.category] = []
      acc[attr.category].push(attr)
      return acc
    },
    {} as Record<string, AttributeOption[]>
  )

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} className="text-accent flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
            {description && <p className="text-[11px] text-muted-foreground truncate">{description}</p>}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 flex-shrink-0">
          <X size={14} />
        </Button>
      </div>

      {/* Attributes toggle */}
      {attributes.length > 0 && (
        <div className="border-b border-border flex-shrink-0">
          <button
            onClick={() => setShowAttributes(!showAttributes)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-secondary/50 transition-colors"
          >
            <span>Configure{selectedAttributes.length > 0 ? ` (${selectedAttributes.length})` : ''}</span>
            <ChevronDown size={12} className={cn('transition-transform', !showAttributes && '-rotate-90')} />
          </button>
          {showAttributes && (
            <div className="px-4 pb-3 space-y-2.5">
              {Object.entries(groupedAttributes).map(([category, attrs]) => (
                <div key={category}>
                  <p className="text-[11px] font-medium text-foreground mb-1.5">{category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {attrs.map((attr) => (
                      <button
                        key={attr.value}
                        onClick={() => handleAttributeToggle(attr.value)}
                        className={cn(
                          'px-2 py-1 rounded text-[11px] transition-all border',
                          selectedAttributes.includes(attr.value)
                            ? 'bg-accent/15 border-accent/40 text-accent'
                            : 'bg-secondary border-transparent text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {attr.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-foreground'
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {generating && (
          <div className="flex justify-start">
            <div className="bg-secondary text-muted-foreground px-3 py-2 rounded-lg text-xs flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              Generating...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts -- only show when few messages */}
      {messages.length <= 2 && suggestedPrompts.length > 0 && !generating && (
        <div className="border-t border-border px-4 py-3 flex-shrink-0">
          <p className="text-[11px] text-muted-foreground font-semibold mb-2">Suggestions</p>
          <div className="space-y-1">
            {suggestedPrompts.slice(0, 3).map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="w-full text-left text-[11px] px-2.5 py-1.5 rounded bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors leading-relaxed"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border px-4 py-3 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={`Describe your ${assetType}...`}
            className="flex-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || generating}
            size="sm"
            className="bg-accent hover:bg-accent/90 text-accent-foreground h-8 w-8 p-0 flex-shrink-0"
          >
            <Send size={12} />
          </Button>
        </div>
      </div>
    </div>
  )
}
