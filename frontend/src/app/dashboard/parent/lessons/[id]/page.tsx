'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lessonsApi, subjectsApi, childrenApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import Link from 'next/link'
import {
  BookOpen,
  Clock,
  ArrowLeft,
  Edit3,
  Trash2,
  Users,
  Link2,
  Video,
  CheckCircle2,
  ClipboardList,
  Package,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'

export default function LessonDetail() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const lessonId = params.id as string
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignChildIds, setAssignChildIds] = useState<string[]>([])

  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const res = await lessonsApi.get(lessonId)
      return res.data
    },
    enabled: !!lessonId,
  })

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await subjectsApi.list()
      return res.data
    },
  })

  const { data: childrenData } = useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const res = await childrenApi.list()
      return res.data
    },
  })

  const subjects = Array.isArray(subjectsData) ? subjectsData : subjectsData?.subjects || []
  const children = Array.isArray(childrenData) ? childrenData : childrenData?.children || []
  const subject = subjects.find((s: any) => s.id === lesson?.subject_id)
  const assignments = lesson?.assignments || []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => lessonsApi.delete(id),
    onSuccess: () => {
      toast.success('Lesson deleted')
      router.push('/dashboard/parent/lessons')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete'),
  })

  const assignMutation = useMutation({
    mutationFn: ({ lessonId, childIds }: { lessonId: string; childIds: string[] }) =>
      lessonsApi.assign(lessonId, { child_ids: childIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] })
      toast.success('Lesson assigned!')
      setAssignDialogOpen(false)
      setAssignChildIds([])
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to assign'),
  })

  const handleDelete = () => {
    if (window.confirm('Delete this lesson? This cannot be undone.')) {
      deleteMutation.mutate(lessonId)
    }
  }

  const toggleChild = (childId: string) => {
    setAssignChildIds((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    )
  }

  const handleAssign = () => {
    if (assignChildIds.length === 0) {
      toast.error('Select at least one child')
      return
    }
    assignMutation.mutate({ lessonId, childIds: assignChildIds })
  }

  if (isLoading) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Lesson Detail">
          <div className="mx-auto max-w-4xl space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  if (error || !lesson) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Lesson Detail">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">Lesson not found</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/parent/lessons')}>
              Back to Lessons
            </Button>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Lesson Detail">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Back button */}
          <Link href="/dashboard/parent/lessons" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
             <ArrowLeft className="h-4 w-4" />
             Back to Lessons
           </Link>

          {/* Header Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-xl"
                    style={{ backgroundColor: subject?.color ? `${subject.color}20` : '#6366f120' }}
                  >
                    <BookOpen className="h-7 w-7" style={{ color: subject?.color || '#6366f1' }} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{lesson.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {subject && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1.5"
                          style={{
                            borderColor: subject.color,
                            color: subject.color,
                          }}
                        >
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color }} />
                          {subject.name}
                        </Badge>
                      )}
                      <Badge variant="secondary">{lesson.difficulty}</Badge>
                      <Badge variant={lesson.status === 'active' ? 'default' : 'outline'}>
                        {lesson.status}
                      </Badge>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {lesson.duration_minutes} minutes
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(true)}>
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Assign
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/parent/lessons?edit=${lesson.id}`)}>
                    <Edit3 className="mr-1.5 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>

              {lesson.description && (
                <>
                  <Separator className="my-4" />
                  <p className="text-muted-foreground">{lesson.description}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Content */}
          {lesson.content && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {lesson.content}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Links */}
          {(lesson.resource_url || lesson.video_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Link2 className="h-5 w-5 text-primary" />
                  Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lesson.resource_url && (
                  <a
                    href={lesson.resource_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Link2 className="h-4 w-4" />
                    {lesson.resource_url}
                  </a>
                )}
                {lesson.video_url && (
                  <a
                    href={lesson.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Video className="h-4 w-4" />
                    {lesson.video_url}
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {lesson.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-primary" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{lesson.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Two column layout */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Objectives */}
            {lesson.objectives && lesson.objectives.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Objectives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {lesson.objectives.map((obj: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        </div>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Materials */}
            {lesson.materials_needed && lesson.materials_needed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5 text-amber-500" />
                    Materials Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {lesson.materials_needed.map((mat: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                          <Package className="h-3 w-3 text-amber-500" />
                        </div>
                        {mat}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Assigned Children */}
          {assignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Assigned Children ({assignments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {assignments.map((assignment: any) => {
                    const child = assignment.child || {}
                    return (
                      <div key={assignment.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={child.avatar_url} alt={child.display_name} />
                          <AvatarFallback className="text-xs">
                            {child.display_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{child.display_name}</p>
                          <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {assignment.status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assign Dialog */}
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Lesson</DialogTitle>
                <DialogDescription>Select children to assign this lesson to</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                {children.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">No children available</p>
                ) : (
                  children.map((child: any) => {
                    const alreadyAssigned = assignments.some((a: any) => a.child_id === child.id)
                    return (
                      <div
                        key={child.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          assignChildIds.includes(child.id)
                            ? 'border-primary bg-primary/5'
                            : alreadyAssigned
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => {
                          if (!alreadyAssigned) toggleChild(child.id)
                        }}
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                          assignChildIds.includes(child.id)
                            ? 'bg-primary border-primary'
                            : alreadyAssigned
                            ? 'border-muted-foreground/30'
                            : 'border-muted-foreground'
                        }`}>
                          {assignChildIds.includes(child.id) && (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{child.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {alreadyAssigned ? 'Already assigned' : `@${child.username}`}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAssign} disabled={assignChildIds.length === 0 || assignMutation.isPending}>
                  {assignMutation.isPending ? 'Assigning...' : `Assign to ${assignChildIds.length} child${assignChildIds.length !== 1 ? 'ren' : ''}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
