'use client'

import React, { createContext, useContext, useState } from 'react'

interface SelectedAsset {
  name: string
  type: 'Bible' | 'Character' | 'Location' | 'Beat' | 'Storyboard' | 'Shot'
}

interface AIContextType {
  selectedAsset: SelectedAsset | null
  setSelectedAsset: (asset: SelectedAsset | null) => void
  aiPanelOpen: boolean
  setAIPanelOpen: (open: boolean) => void
}

const AIContext = createContext<AIContextType | undefined>(undefined)

export function AIContextProvider({ children }: { children: React.ReactNode }) {
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null)
  const [aiPanelOpen, setAIPanelOpen] = useState(true)

  return (
    <AIContext.Provider value={{ selectedAsset, setSelectedAsset, aiPanelOpen, setAIPanelOpen }}>
      {children}
    </AIContext.Provider>
  )
}

export function useAIContext() {
  const context = useContext(AIContext)
  if (context === undefined) {
    throw new Error('useAIContext must be used within AIContextProvider')
  }
  return context
}
