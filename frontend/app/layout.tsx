import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'

import './globals.css'
import RootLayoutClient from './layout-client'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cinematic Studio | AI-Powered Screenplay to Visual Pipeline',
  description: 'Professional SaaS platform for directors and creative studios. Convert screenplays into structured cinematic assets with AI-powered iteration and versioning.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} font-sans antialiased bg-background text-foreground`}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  )
}
