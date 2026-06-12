'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, progressApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import {
  Sparkles,
  BookOpen,
  Zap,
  Flame,
  Award,
  Gift,
  Trophy,
  Star,
  CheckCircle2,
  Clock,
  Target,
  ArrowRight,
  GraduationCap,
} from 'lucide-react'
import { toast } from 'sonner'

export default function ChildDashboard() {
  const { user } = useAuth()
  const childId = user?.id || ''

  const { data, isLoading, error } = useQuery({
    queryKey: ['child-dashboard', childId],
    queryFn: async () => {
      const res = await dashboardApi.getChild(childId)
      return res.data
    },
    enabled: !!childId,
  })

  if (isLoading) {
    return (
      <AuthGuard requiredRole="child">
        <AppShell title="Dashboard">
          <div className="mx-auto max-w-5xl space-y-6">
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard requiredRole="child">
        <AppShell title="Dashboard">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">Couldn&apos;t load your dashboard</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  const todaysLessons = data?.todays_lessons || []
  const recentEvents = data?.recent_events || []
  const currentLevel = data?.current_level || { level_number: 1, name: 'Beginner', color: '#6366f1' }
  const badges = data?.badges || []
  const streak = data?.current_streak || 0
  const xpTotal = data?.xp_total || 0
  const monthlyProgress = data?.monthly_reward_progress || 0
  const projectedReward = data?.projected_reward || 0

  const xpToNextLevel = data?.xp_to_next_level || 100
  const xpProgress = Math.min((xpTotal % xpToNextLevel) / xpToNextLevel * 100, 100)

  return (
    <AuthGuard requiredRole="child">
      <AppShell title="Dashboard">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Welcome Greeting */}
          <div className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  Hey, {user?.full_name?.split(' ')[0] || 'Learner'}! 🎉
                </h1>
                <p className="mt-1 text-white/80">Ready for another fun day of learning?</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-white/20 p-3">
                  <Flame className="h-6 w-6 text-yellow-300" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{streak}</p>
                  <p className="text-xs text-white/70">Day Streak</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 dark:from-amber-950/20 dark:to-background">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
                  <Zap className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total XP</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{xpTotal}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 dark:from-indigo-950/20 dark:to-background">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/30">
                  <Award className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Level</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Level {currentLevel.level_number}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 dark:from-emerald-950/20 dark:to-background">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
                  <Gift className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reward Progress</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{Math.round(monthlyProgress)}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* XP Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold">Level {currentLevel.level_number} — {currentLevel.name || 'Learner'}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {xpTotal % xpToNextLevel} / {xpToNextLevel} XP
                </span>
              </div>
              <Progress value={xpProgress} className="h-3 bg-indigo-100 dark:bg-indigo-950/30">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${xpProgress}%` }} />
              </Progress>
            </CardContent>
          </Card>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Today's Lessons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Today&apos;s Lessons
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todaysLessons.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <GraduationCap className="h-12 w-12 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No lessons scheduled for today! 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todaysLessons.map((assignment: any) => {
                      const lesson = assignment.lesson || {}
                      const subject = lesson.subject || {}
                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                        >
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-full"
                            style={{ backgroundColor: subject.color ? `${subject.color}20` : '#6366f120' }}
                          >
                            <BookOpen className="h-4 w-4" style={{ color: subject.color || '#6366f1' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{lesson.title || 'Lesson'}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{subject.name || 'General'}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {lesson.duration_minutes || '?'} min
                              </span>
                            </div>
                          </div>
                          <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                            {assignment.status === 'completed' ? '✅ Done' : assignment.status === 'in_progress' ? '▶️ In Progress' : '⏳ Pending'}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
                <Link href="/dashboard/child/lessons">
                  <Button variant="outline" className="mt-4 w-full">
                    View All Lessons
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Badges & Reward Progress */}
            <div className="space-y-6">
              {/* Badges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="h-5 w-5 text-primary" />
                    Recent Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {badges.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <Star className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Complete lessons to earn badges!</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {badges.slice(0, 5).map((badge: any) => {
                        const b = badge.badge || badge
                        return (
                          <div
                            key={badge.id}
                            className="flex flex-col items-center gap-1"
                            title={b.description || b.name}
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-md">
                              <Award className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[60px] text-center">
                              {b.name}
                            </span>
                          </div>
                        )
                      })}
                      {badges.length > 5 && (
                        <Link href="/dashboard/child/achievements" className="flex flex-col items-center justify-center h-12 w-12 rounded-full bg-muted text-xs text-muted-foreground">
                          +{badges.length - 5}
                        </Link>
                      )}
                    </div>
                  )}
                  <Link href="/dashboard/child/achievements">
                    <Button variant="ghost" size="sm" className="mt-3 w-full text-xs">
                      View All Badges
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Monthly Reward */}
              <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 dark:from-emerald-950/20 dark:to-background">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-emerald-500" />
                      <span className="font-semibold">Monthly Reward</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{Math.round(monthlyProgress)}%</span>
                  </div>
                  <Progress value={monthlyProgress} className="h-3 bg-emerald-100 dark:bg-emerald-950/30">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${monthlyProgress}%` }} />
                  </Progress>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Projected reward</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">${projectedReward}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Achievement Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Your Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEvents.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Sparkles className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Start learning to see your achievements here!</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {recentEvents.slice(0, 5).map((event: any, idx: number) => (
                    <div key={event.id || idx} className="relative flex gap-4 pb-6 last:pb-0">
                      {idx < Math.min(recentEvents.length, 5) - 1 && (
                        <div className="absolute left-[21px] top-10 h-full w-0.5 bg-gradient-to-b from-primary/30 to-transparent" />
                      )}
                      <div className={`relative z-10 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full shadow-md ${
                        event.event_type === 'badge_earned'
                          ? 'bg-gradient-to-br from-amber-300 to-amber-500'
                          : event.event_type === 'lesson_completed'
                          ? 'bg-gradient-to-br from-emerald-400 to-emerald-500'
                          : event.event_type === 'quiz_passed'
                          ? 'bg-gradient-to-br from-blue-400 to-blue-500'
                          : 'bg-gradient-to-br from-purple-400 to-purple-500'
                      }`}>
                        {event.event_type === 'badge_earned' ? <Award className="h-5 w-5 text-white" /> :
                         event.event_type === 'lesson_completed' ? <CheckCircle2 className="h-5 w-5 text-white" /> :
                         event.event_type === 'quiz_passed' ? <Target className="h-5 w-5 text-white" /> :
                         <Sparkles className="h-5 w-5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-semibold">{event.title}</p>
                        {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(event.event_date || event.created_at).toLocaleDateString()}</span>
                          {event.xp_earned > 0 && (
                            <span className="flex items-center gap-1 text-amber-500 font-medium">
                              <Zap className="h-3 w-3" />
                              +{event.xp_earned} XP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/dashboard/child/timeline">
                <Button variant="ghost" size="sm" className="mt-2 w-full text-xs">
                  View Full Timeline
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Action */}
          <div className="flex justify-center">
            {todaysLessons.length > 0 && todaysLessons.some((a: any) => a.status !== 'completed') && (
              <Button size="lg" className="rounded-full px-8 shadow-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                <GraduationCap className="mr-2 h-5 w-5" />
                Start Next Lesson
              </Button>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
