'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="mb-6 text-8xl">🔍</div>
        <h1 className="mb-2 text-6xl font-bold tracking-tighter text-foreground">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-foreground">Page Not Found</h2>
        <p className="mb-8 text-muted-foreground">
          Oops! It looks like this page wandered off on its own adventure. Let&apos;s get you back to familiar ground.
        </p>
        <div className="flex gap-4">
          <Link href="/">
            <Button size="lg">Go Home</Button>
          </Link>
          <Link href="/dashboard/parent">
            <Button variant="outline" size="lg">Dashboard</Button>
          </Link>
        </div>
        <div className="mt-12 text-4xl opacity-40">
          📚 ✏️ 🎨 🔬 🌍
        </div>
      </div>
    </div>
  )
}
