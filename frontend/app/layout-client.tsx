'use client'

import type { ReactNode } from "react"
import { ThemeProvider } from '@/context/theme-context'
import { AuthProvider } from '@/context/auth-context'
import { Toaster } from 'react-hot-toast'

export default function RootLayoutClient({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="h-full">
      <ThemeProvider>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </div>
  )
}
