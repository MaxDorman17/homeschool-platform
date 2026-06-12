'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lessonsApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Play,
  Trophy,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Target,
} from 'lucide-react'
import Link from 'next/link'
import { format, startOfWeek, endOfWeek, isSameDay } from 'date-fns'

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  in_progress: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
  partially_completed: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300',
  missed: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
}

export default function ChildLessonsPage() {
  const queryClient = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [activeTab, setActiveTab] = useState('today')
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null)
  const [timeSpent, setTimeSpent] = useState(30)

  const { data: todayData, isLoading: loadingToday } = useQuery({
    queryKey: ['child-lessons', 'today'],
    queryFn: () => lessonsApi.getChildLessons('me', { date: today }),
    enabled: activeTab === 'today',
  })

  const { data: weekData, isLoading: loadingWeek } = useQuery({
    queryKey: ['child-lessons', 'week', weekStart],
    queryFn: () => lessonsApi.getChildLessons('me', { from_date: weekStart, to_date: weekEnd }),
    enabled: activeTab === 'week',
  })

  const { data: allData, isLoading: loadingAll } = useQuery({
    queryKey: ['child-lessons', 'all'],
    queryFn: () => lessonsApi.getChildLessons('me', { status: 'pending,in_progress' }),
    enabled: activeTab === 'all',
  })

  const completeMutation = useMutation({
    mutationFn: (data: { assignmentId: string; score?: number; timeSpent?: number }) =>
      lessonsApi.completeAssignment(data.assignmentId, {
        status: 'completed',
        score: data.score || 100,
        time_spent_minutes: data.timeSpent || 30,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-lessons'] })
      setSelectedLesson(null)
      toast.success('Lesson completed! 🎉 XP awarded!')
    },
    onError: () => toast.error('Failed to complete lesson'),
  })

  const lessons = todayData?.data || weekData?.data || allData?.data || []
  const isLoading = loadingToday || loadingWeek || loadingAll

  const getSubjectColor = (lesson: any) => lesson.lesson?.subject?.color || '#6366F1'

  if (selectedLesson) {
    const assignment = (lessons as any[]).find((l: any) => l.id === selectedLesson)
    const lesson = assignment?.lesson
    if (!lesson) return null

    return (
      <AuthGuard>
        <AppShell>
          <div className="max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => setSelectedLesson(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Lessons
            </Button>

            <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
              <div className="h-2" style={{ backgroundColor: getSubjectColor(lesson) }} />
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Badge style={{ backgroundColor: getSubjectColor(lesson) + '20', color: getSubjectColor(lesson) }}>
                      {lesson.subject?.name || 'General'}
                    </Badge>
                    <h1 className="text-2xl font-bold">{lesson.title}</h1>
                    {lesson.description && (
                      <p className="text-muted-foreground">{lesson.description}</p>
                    )}
                  </div>
                  <Badge className={DIFFICULTY_COLORS[lesson.difficulty] || DIFFICULTY_COLORS.beginner}>
                    {lesson.difficulty}
                  </Badge>
                </div>

                {lesson.objectives && lesson.objectives.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" /> Learning Objectives
                    </h3>
                    <ul className="space-y-1">
                      {lesson.objectives.map((obj: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {lesson.content && (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm">{lesson.content}</div>
                  </div>
                )}

                {lesson.notes && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground italic">{lesson.notes}</p>
                  </div>
                )}

                {lesson.materials_needed && lesson.materials_needed.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Materials Needed</h3>
                    <div className="flex flex-wrap gap-2">
                      {lesson.materials_needed.map((mat: string, i: number) => (
                        <Badge key={i} variant="outline">{mat}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {lesson.duration_minutes} minutes
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Time spent (min):</label>
                    <input
                      type="number"
                      value={timeSpent}
                      onChange={(e) => setTimeSpent(Number(e.target.value))}
                      className="w-20 rounded-md border px-2 py-1 text-sm"
                      min={1}
                    />
                  </div>
                  <Button
                    onClick={() => completeMutation.mutate({ assignmentId: selectedLesson, timeSpent })}
                    disabled={completeMutation.isPending}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {completeMutation.isPending ? 'Saving...' : 'Complete Lesson'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">My Lessons</h1>
              <p className="text-muted-foreground">Complete your lessons and earn XP!</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="all">All Lessons</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="mt-4">
              {renderLessonList(lessons, isLoading, getSubjectColor)}
            </TabsContent>
            <TabsContent value="week" className="mt-4">
              {renderLessonList(lessons, isLoading, getSubjectColor)}
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              {renderLessonList(lessons, isLoading, getSubjectColor)}
            </TabsContent>
          </Tabs>
        </div>
      </AppShell>
    </AuthGuard>
  )

  function renderLessonList(items: any[], loading: boolean, getColor: (l: any) => string) {
    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      )
    }

    if (!items || items.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No lessons found</h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'today' ? 'No lessons scheduled for today. Enjoy your free time!' : 'No lessons available.'}
            </p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((assignment: any) => (
          <Card
            key={assignment.id}
            className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
            onClick={() => setSelectedLesson(assignment.id)}
          >
            <div className="h-1.5" style={{ backgroundColor: getColor(assignment) }} />
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <Badge
                  variant="secondary"
                  className="text-xs"
                  style={{ backgroundColor: getColor(assignment) + '20', color: getColor(assignment) }}
                >
                  {assignment.lesson?.subject?.name || 'General'}
                </Badge>
                <Badge className={`text-xs ${STATUS_COLORS[assignment.status] || STATUS_COLORS.pending}`}>
                  {assignment.status.replace('_', ' ')}
                </Badge>
              </div>
              <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                {assignment.lesson?.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {assignment.lesson?.duration_minutes}m
                </span>
                <Badge className={`text-xs ${DIFFICULTY_COLORS[assignment.lesson?.difficulty] || DIFFICULTY_COLORS.beginner}`}>
                  {assignment.lesson?.difficulty}
                </Badge>
              </div>
              {assignment.status === 'completed' && assignment.score && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Score</span>
                    <span className="font-medium">{assignment.score}%</span>
                  </div>
                  <Progress value={assignment.score} className="h-1.5" />
                </div>
              )}
              <div className="pt-2">
                <Button variant="secondary" size="sm" className="w-full gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {assignment.status === 'completed' ? (
                    <>View <ChevronRight className="h-3 w-3" /></>
                  ) : (
                    <><Play className="h-3 w-3" /> Start Lesson</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
}
