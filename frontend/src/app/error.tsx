'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mb-2 text-muted-foreground">
          We encountered an unexpected error. Don&apos;t worry, we&apos;re on it!
        </p>
        {error.digest && (
          <p className="mb-6 text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-4">
          <Button onClick={reset} size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            Go Home
          </a>
        </div>
        <div className="mt-12 text-4xl opacity-30">
          🛠️ 🔧 💪
        </div>
      </div>
    </div>
  )
}
