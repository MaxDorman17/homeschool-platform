'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export default function RootRedirect() {
  const { isAuthenticated, isLoading, isParent, isChild } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    if (isParent) {
      router.replace('/dashboard/parent')
    } else if (isChild) {
      router.replace('/dashboard/child')
    } else {
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, isParent, isChild, router])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
