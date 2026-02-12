'use client'

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { GlobalTopbar } from '@/components/global-topbar'
import ProjectSidebarNew from '@/components/project-sidebar-new'
import { apiClient } from '@/lib/api-client'

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const projectId = params.id as string
  
  const [projectTitle, setProjectTitle] = useState<string>('Loading...')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    let isMounted = true
    if (projectId) {
      apiClient.getProject(projectId).then((p) => {
        if (isMounted) setProjectTitle(p.name)
      }).catch(() => {
        if (isMounted) setProjectTitle('Project')
      })
    }
    return () => { isMounted = false }
  }, [projectId])

  return (
    <div className="h-screen flex flex-col bg-background">
      <GlobalTopbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - slides fully off-screen when closed */}
        <div
          className={`absolute top-0 left-0 h-full z-30 transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <ProjectSidebarNew projectName={projectTitle} projectId={projectId} />
        </div>

        {/* Spacer pushes content when sidebar is open */}
        <div
          className="flex-shrink-0 transition-all duration-300 ease-in-out"
          style={{ width: sidebarOpen ? '18rem' : '0' }}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-hidden h-full">
          {children}
        </main>
      </div>
    </div>
  )
}
