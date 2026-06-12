'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { progressApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sparkles,
  Award,
  CheckCircle2,
  Target,
  Zap,
  Star,
  BookOpen,
  Trophy,
  Filter,
  Infinity,
} from 'lucide-react'

const EVENT_ICONS: Record<string, React.ReactNode> = {
  badge_earned: <Award className="h-5 w-5 text-white" />,
  lesson_completed: <CheckCircle2 className="h-5 w-5 text-white" />,
  quiz_passed: <Target className="h-5 w-5 text-white" />,
  quiz_failed: <Target className="h-5 w-5 text-white" />,
  level_up: <Trophy className="h-5 w-5 text-white" />,
  streak_milestone: <Star className="h-5 w-5 text-white" />,
  worksheet_completed: <BookOpen className="h-5 w-5 text-white" />,
}

const EVENT_COLORS: Record<string, string> = {
  badge_earned: 'from-amber-300 to-amber-500',
  lesson_completed: 'from-emerald-400 to-emerald-500',
  quiz_passed: 'from-blue-400 to-blue-500',
  quiz_failed: 'from-red-400 to-red-500',
  level_up: 'from-purple-400 to-purple-500',
  streak_milestone: 'from-orange-400 to-orange-500',
  worksheet_completed: 'from-teal-400 to-teal-500',
}

export default function TimelinePage() {
  const { user } = useAuth()
  const childId = user?.id || ''
  const [filterType, setFilterType] = useState('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['timeline', childId],
    queryFn: async () => {
      const res = await progressApi.getTimeline(childId, { limit: 50 })
      return res.data
    },
    enabled: !!childId,
  })

  const events = useMemo(() => {
    const all = Array.isArray(data) ? data : data?.events || data?.timeline || []
    if (filterType === 'all') return all
    return all.filter((e: any) => e.event_type === filterType)
  }, [data, filterType])

  const groupedEvents = useMemo(() => {
    const groups: Record<string, any[]> = {}
    events.forEach((event: any) => {
      const date = new Date(event.event_date || event.created_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(event)
    })
    return groups
  }, [events])

  return (
    <AuthGuard requiredRole="child">
      <AppShell title="Timeline">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Learning Timeline</h1>
              <p className="text-muted-foreground">Your learning journey, one step at a time</p>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="lesson_completed">Lessons</SelectItem>
                <SelectItem value="quiz_passed">Quizzes</SelectItem>
                <SelectItem value="badge_earned">Badges</SelectItem>
                <SelectItem value="level_up">Level Ups</SelectItem>
                <SelectItem value="streak_milestone">Streaks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground">Could not load timeline</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
              </CardContent>
            </Card>
          ) : Object.keys(groupedEvents).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Sparkles className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="mb-1 text-lg font-medium">No events yet</h3>
                <p className="text-sm text-muted-foreground">Complete lessons and earn achievements to see them here!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                <div key={date}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm font-medium text-muted-foreground">{date}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-0">
                    {(dayEvents as any[]).map((event: any, idx: number) => (
                      <div key={event.id || idx} className="relative flex gap-4 pb-8 last:pb-0">
                        {idx < (dayEvents as any[]).length - 1 && (
                          <div className="absolute left-[21px] top-10 h-full w-0.5 bg-gradient-to-b from-primary/20 to-transparent" />
                        )}
                        <div className={`relative z-10 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-md ${
                          EVENT_COLORS[event.event_type] || 'from-purple-400 to-purple-500'
                        }`}>
                          {EVENT_ICONS[event.event_type] || <Sparkles className="h-5 w-5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{event.title}</p>
                            <Badge variant="outline" className="text-[10px] capitalize">{event.event_type?.replace(/_/g, ' ')}</Badge>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                          )}
                          {event.xp_earned > 0 && (
                            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-500">
                              <Zap className="h-3 w-3" />
                              +{event.xp_earned} XP
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  )
}
