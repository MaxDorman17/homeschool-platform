'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  BookOpen,
  FileQuestion,
  Calendar,
  Plus,
  Clock,
  TrendingUp,
  Award,
  Zap,
  Flame,
  Sparkles,
  ArrowRight,
  BarChart3,
  PieChartIcon,
  CheckCircle2,
  Target,
  Gift,
} from 'lucide-react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const GREETINGS = [
  'Good morning! ☀️',
  'Good afternoon! 🌤️',
  'Good evening! 🌙',
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return GREETINGS[0]
  if (hour < 18) return GREETINGS[1]
  return GREETINGS[2]
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']

const weeklyData = [
  { day: 'Mon', lessons: 4 },
  { day: 'Tue', lessons: 3 },
  { day: 'Wed', lessons: 5 },
  { day: 'Thu', lessons: 2 },
  { day: 'Fri', lessons: 4 },
  { day: 'Sat', lessons: 1 },
  { day: 'Sun', lessons: 0 },
]

const subjectData = [
  { name: 'Math', completed: 12, total: 15 },
  { name: 'Science', completed: 8, total: 12 },
  { name: 'English', completed: 10, total: 10 },
  { name: 'History', completed: 5, total: 8 },
  { name: 'Art', completed: 6, total: 6 },
]

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ParentDashboard() {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: async () => {
      const res = await dashboardApi.getParent()
      return res.data
    },
  })

  const greeting = getGreeting()
  const today = formatDate()

  if (isLoading) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Dashboard">
          <DashboardSkeleton />
        </AppShell>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Dashboard">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">Failed to load dashboard. Please try again.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  const childrenOverview = data?.children_overview || []
  const upcomingLessons = data?.upcoming_lessons || []
  const recentAchievements = data?.recent_achievements || []
  const attendanceStats = data?.attendance_stats || { completion_rate: 0, completed: 0, partially_completed: 0, missed: 0 }
  const rewardTracking = data?.reward_tracking || []

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Dashboard">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Header Section */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {greeting}, {user?.full_name?.split(' ')[0] || 'Parent'}!
              </h1>
              <p className="text-muted-foreground">{today}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/parent/lessons">
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Lesson
                </Button>
              </Link>
              <Link href="/dashboard/parent/children">
                <Button variant="outline" size="sm">
                  <Users className="mr-1.5 h-4 w-4" />
                  Add Child
                </Button>
              </Link>
              <Link href="/dashboard/parent/planner">
                <Button variant="outline" size="sm">
                  <Calendar className="mr-1.5 h-4 w-4" />
                  Schedule
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 dark:from-indigo-950/20 dark:to-background dark:border-indigo-900/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
                <div className="rounded-full bg-indigo-100 p-2 dark:bg-indigo-900/30">
                  <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {attendanceStats.completion_rate ? `${Math.round(attendanceStats.completion_rate)}%` : '--'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {attendanceStats.completed || 0} completed days
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100 dark:from-purple-950/20 dark:to-background dark:border-purple-900/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lessons This Week</CardTitle>
                <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                  <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingLessons.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Upcoming lessons</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-50 to-white border-pink-100 dark:from-pink-950/20 dark:to-background dark:border-pink-900/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Quizzes Taken</CardTitle>
                <div className="rounded-full bg-pink-100 p-2 dark:bg-pink-900/30">
                  <FileQuestion className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.quizzes_taken || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 dark:from-amber-950/20 dark:to-background dark:border-amber-900/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Children</CardTitle>
                <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                  <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{childrenOverview.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Enrolled</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Children Overview */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Children Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {childrenOverview.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No children added yet</p>
                    <Link href="/dashboard/parent/children">
                      <Button variant="outline" size="sm">
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add Child
                      </Button>
                    </Link>
                  </div>
                ) : (
                  childrenOverview.map((child: any) => (
                    <Link
                      key={child.child?.id || child.id}
                      href={`/dashboard/parent/children`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        <AvatarImage src={child.child?.avatar_url} alt={child.child?.display_name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {child.child?.avatar_url && child.child.avatar_url.match(/[👦👧🧒👨‍🎓👩‍🎓🎨🧪🔭📚🎵🌍💻🤖🐶🐱🦊🐼🦄🌟🚀🌈🧑‍🏫]/)
                            ? child.child.avatar_url
                            : child.child?.display_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {child.child?.display_name || child.display_name || 'Child'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            Lvl {child.current_level?.level_number || child.level || 1}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500" />
                            {child.current_xp || child.xp || 0} XP
                          </span>
                          <span className="flex items-center gap-1">
                            <Flame className="h-3 w-3 text-orange-500" />
                            {child.streak || 0}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming Lessons + Quick Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming Lessons */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Upcoming Lessons
                  </CardTitle>
                  <CardDescription>Next 5 scheduled lessons</CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingLessons.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No upcoming lessons</p>
                      <Link href="/dashboard/parent/lessons">
                        <Button variant="outline" size="sm">
                          <Plus className="mr-1.5 h-4 w-4" />
                          Create Lesson
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingLessons.slice(0, 5).map((assignment: any) => {
                        const lesson = assignment.lesson || {}
                        const child = assignment.child || {}
                        const subject = lesson.subject || {}
                        return (
                          <Link
                            key={assignment.id}
                            href={`/dashboard/parent/lessons/${lesson.id}`}
                            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                          >
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-full"
                              style={{ backgroundColor: subject.color ? `${subject.color}20` : '#6366f120' }}
                            >
                              <BookOpen
                                className="h-4 w-4"
                                style={{ color: subject.color || '#6366f1' }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {lesson.title || assignment.title || 'Untitled Lesson'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{subject.name || 'General'}</span>
                                {child.display_name && (
                                  <>
                                    <span>·</span>
                                    <span>{child.display_name}</span>
                                  </>
                                )}
                                {assignment.due_date && (
                                  <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'} className="shrink-0">
                              {assignment.status || 'pending'}
                            </Badge>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reward Tracking */}
              {rewardTracking.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Gift className="h-5 w-5 text-primary" />
                      Reward Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {rewardTracking.slice(0, 4).map((reward: any, idx: number) => (
                        <div key={idx} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">{reward.child_name || reward.child_id}</p>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(reward.completion_percentage || 0)}%
                            </Badge>
                          </div>
                          <Progress
                            value={reward.completion_percentage || 0}
                            className="h-2"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            Reward: ${reward.reward_amount || 0} {reward.reward_type || 'monthly'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Weekly Activity Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Weekly Activity
                </CardTitle>
                <CardDescription>Lessons completed per day this week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--popover))',
                      }}
                    />
                    <Bar dataKey="lessons" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subject Completion Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  Subject Completion
                </CardTitle>
                <CardDescription>Lessons completed per subject</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={subjectData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="completed"
                    >
                      {subjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--popover))',
                      }}
                      formatter={(value: any, name: any) => [`${value} lessons`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-wrap justify-center gap-4">
                  {subjectData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-medium">{Math.round((entry.completed / entry.total) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Achievements Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-primary" />
                Recent Achievements
              </CardTitle>
              <CardDescription>Latest learning milestones</CardDescription>
            </CardHeader>
            <CardContent>
              {recentAchievements.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No achievements yet. Start learning to earn badges!</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {recentAchievements.slice(0, 5).map((event: any, idx: number) => (
                    <div key={event.id || idx} className="relative flex gap-4 pb-6 last:pb-0">
                      {idx < Math.min(recentAchievements.length, 5) - 1 && (
                        <div className="absolute left-[17px] top-10 h-full w-0.5 bg-border" />
                      )}
                      <div
                        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          event.event_type === 'badge_earned'
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : event.event_type === 'lesson_completed'
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : event.event_type === 'quiz_passed'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {event.event_type === 'badge_earned' ? (
                          <Award className="h-4 w-4" />
                        ) : event.event_type === 'lesson_completed' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : event.event_type === 'quiz_passed' ? (
                          <Target className="h-4 w-4" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-1.5">
                        <p className="text-sm font-medium">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        )}
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(event.event_date || event.created_at).toLocaleDateString()}</span>
                          {event.xp_earned > 0 && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
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
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
