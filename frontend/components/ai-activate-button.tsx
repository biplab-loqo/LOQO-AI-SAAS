'use client'

import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { useAIContext } from '@/context/ai-context'

interface AIActivateButtonProps {
  assetName: string
  assetType: 'Bible' | 'Character' | 'Location' | 'Beat' | 'Storyboard' | 'Shot'
  size?: 'sm' | 'default'
}

export function AIActivateButton({ assetName, assetType, size = 'default' }: AIActivateButtonProps) {
  const { setSelectedAsset, setAIPanelOpen } = useAIContext()

  const handleClick = () => {
    setSelectedAsset({ name: assetName, type: assetType })
    setAIPanelOpen(true)
  }

  return (
    <Button
      onClick={handleClick}
      className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
      size={size}
    >
      <Sparkles size={size === 'sm' ? 14 : 18} />
      {size === 'sm' ? 'AI' : 'AI Refine'}
    </Button>
  )
}
