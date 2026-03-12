'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function LegacyScriptRedirect() {
  const params = useParams()
  const router = useRouter()
  useEffect(() => {
    router.replace(`/project/${params.id}/episode/${params.episodeId}/part/${params.partId}`)
  }, [params.id, params.episodeId, params.partId, router])
  return null
}
