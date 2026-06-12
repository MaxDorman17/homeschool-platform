'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lessonsApi, subjectsApi, childrenApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Plus,
  Search,
  GraduationCap,
  Clock,
  Users,
  BookOpen,
  Filter,
  X,
  PlusCircle,
  MinusCircle,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const STATUSES = ['active', 'draft', 'archived']
const STATUS_VARIANTS: Record<string, string> = {
  active: 'default',
  draft: 'secondary',
  archived: 'outline',
}

interface Objective {
  text: string
}

interface Material {
  text: string
}

interface LessonFormData {
  title: string
  description: string
  subject_id: string
  content: string
  notes: string
  duration_minutes: number
  difficulty: string
  resource_url: string
  video_url: string
  objectives: string[]
  materials_needed: string[]
  status: string
}

const defaultForm: LessonFormData = {
  title: '',
  description: '',
  subject_id: '',
  content: '',
  notes: '',
  duration_minutes: 30,
  difficulty: 'beginner',
  resource_url: '',
  video_url: '',
  objectives: [''],
  materials_needed: [''],
  status: 'draft',
}

export default function LessonsManagement() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [editingLesson, setEditingLesson] = useState<any>(null)
  const [form, setForm] = useState<LessonFormData>(defaultForm)
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [assignChildIds, setAssignChildIds] = useState<string[]>([])

  const { data: lessonsData, isLoading, error } = useQuery({
    queryKey: ['lessons', filterSubject, filterStatus, searchQuery],
    queryFn: async () => {
      const params: any = {}
      if (filterSubject !== 'all') params.subject_id = filterSubject
      if (filterStatus !== 'all') params.status = filterStatus
      if (searchQuery) params.search = searchQuery
      const res = await lessonsApi.list(params)
      return res.data
    },
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
  const lessons = Array.isArray(lessonsData) ? lessonsData : lessonsData?.lessons || []

  const createMutation = useMutation({
    mutationFn: (data: LessonFormData) => lessonsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      toast.success('Lesson created!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create lesson'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LessonFormData> }) =>
      lessonsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      toast.success('Lesson updated!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update lesson'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => lessonsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      toast.success('Lesson deleted')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete lesson'),
  })

  const assignMutation = useMutation({
    mutationFn: ({ lessonId, childIds }: { lessonId: string; childIds: string[] }) =>
      lessonsApi.assign(lessonId, { child_ids: childIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      toast.success('Lesson assigned!')
      setAssignDialogOpen(false)
      setAssignChildIds([])
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to assign lesson'),
  })

  const openCreate = () => {
    setEditingLesson(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  const openEdit = (lesson: any) => {
    setEditingLesson(lesson)
    setForm({
      title: lesson.title || '',
      description: lesson.description || '',
      subject_id: lesson.subject_id || '',
      content: lesson.content || '',
      notes: lesson.notes || '',
      duration_minutes: lesson.duration_minutes || 30,
      difficulty: lesson.difficulty || 'beginner',
      resource_url: lesson.resource_url || '',
      video_url: lesson.video_url || '',
      objectives: lesson.objectives?.length ? lesson.objectives : [''],
      materials_needed: lesson.materials_needed?.length ? lesson.materials_needed : [''],
      status: lesson.status || 'draft',
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingLesson(null)
    setForm(defaultForm)
  }

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error('Lesson title is required')
      return
    }
    const payload = {
      ...form,
      objectives: form.objectives.filter((o) => o.trim()),
      materials_needed: form.materials_needed.filter((m) => m.trim()),
    }
    if (editingLesson) {
      updateMutation.mutate({ id: editingLesson.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const openAssign = (lessonId: string) => {
    setSelectedLessonId(lessonId)
    setAssignChildIds([])
    setAssignDialogOpen(true)
  }

  const handleAssign = () => {
    if (!selectedLessonId || assignChildIds.length === 0) {
      toast.error('Select at least one child')
      return
    }
    assignMutation.mutate({ lessonId: selectedLessonId, childIds: assignChildIds })
  }

  const toggleChild = (childId: string) => {
    setAssignChildIds((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    )
  }

  const getSubject = (id: string) => subjects.find((s: any) => s.id === id)

  if (isLoading) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Lessons">
          <div className="mx-auto max-w-7xl space-y-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Lessons">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">Failed to load lessons.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Lessons">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Lessons</h1>
              <p className="text-muted-foreground">Create and manage lessons</p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Lesson
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lessons List */}
          {lessons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <GraduationCap className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="mb-1 text-lg font-medium">No lessons yet</h3>
                <p className="mb-6 text-sm text-muted-foreground">Create your first lesson to get started</p>
                <Button onClick={openCreate}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Your First Lesson
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson: any) => {
                const subject = getSubject(lesson.subject_id)
                return (
                  <Card key={lesson.id} className="transition-all hover:shadow-md">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: subject?.color ? `${subject.color}20` : '#6366f120' }}
                      >
                        <BookOpen className="h-5 w-5" style={{ color: subject?.color || '#6366f1' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/parent/lessons/${lesson.id}`}
                            className="font-medium hover:text-primary truncate"
                          >
                            {lesson.title}
                          </Link>
                          <Badge
                            variant={(STATUS_VARIANTS[lesson.status] || 'secondary') as any}
                            className="shrink-0 text-xs"
                          >
                            {lesson.status}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {subject && (
                            <span className="flex items-center gap-1">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color }} />
                              {subject.name}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs font-normal">
                            {lesson.difficulty}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lesson.duration_minutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {lesson.assigned_count || 0} children
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openAssign(lesson.id)}>
                          Assign
                        </Button>
                        <Link href={`/dashboard/parent/lessons/${lesson.id}`}>
                          <Button variant="ghost" size="icon-xs">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(lesson)}>
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            if (window.confirm(`Delete "${lesson.title}"?`)) {
                              deleteMutation.mutate(lesson.id)
                            }
                          }}
                        >
                          <svg className="h-4 w-4 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Create Lesson'}</DialogTitle>
                <DialogDescription>Fill in the lesson details below</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Lesson title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    placeholder="Brief description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Subject</Label>
                    <Select
                      value={form.subject_id}
                      onValueChange={(v) => setForm({ ...form, subject_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Difficulty</Label>
                    <Select
                      value={form.difficulty}
                      onValueChange={(v) => setForm({ ...form, difficulty: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map((d) => (
                          <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    rows={6}
                    placeholder="Lesson content / instructions..."
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (for parent)</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder="Teaching notes, tips, etc."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="resource_url">Resource URL</Label>
                    <Input
                      id="resource_url"
                      placeholder="https://..."
                      value={form.resource_url}
                      onChange={(e) => setForm({ ...form, resource_url: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="video_url">Video URL</Label>
                    <Input
                      id="video_url"
                      placeholder="https://..."
                      value={form.video_url}
                      onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    />
                  </div>
                </div>
                {/* Objectives */}
                <div className="space-y-2">
                  <Label>Objectives</Label>
                  {form.objectives.map((obj, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder={`Objective ${idx + 1}`}
                        value={obj}
                        onChange={(e) => {
                          const updated = [...form.objectives]
                          updated[idx] = e.target.value
                          setForm({ ...form, objectives: updated })
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          const updated = form.objectives.filter((_, i) => i !== idx)
                          setForm({ ...form, objectives: updated.length ? updated : [''] })
                        }}
                      >
                        <MinusCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, objectives: [...form.objectives, ''] })}
                  >
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    Add Objective
                  </Button>
                </div>
                {/* Materials */}
                <div className="space-y-2">
                  <Label>Materials Needed</Label>
                  {form.materials_needed.map((mat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder={`Material ${idx + 1}`}
                        value={mat}
                        onChange={(e) => {
                          const updated = [...form.materials_needed]
                          updated[idx] = e.target.value
                          setForm({ ...form, materials_needed: updated })
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          const updated = form.materials_needed.filter((_, i) => i !== idx)
                          setForm({ ...form, materials_needed: updated.length ? updated : [''] })
                        }}
                      >
                        <MinusCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, materials_needed: [...form.materials_needed, ''] })}
                  >
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    Add Material
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingLesson ? 'Save Changes' : 'Create Lesson'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Assign Dialog */}
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Lesson</DialogTitle>
                <DialogDescription>Select children to assign this lesson to</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                {children.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No children available. Add children first.</p>
                ) : (
                  children.map((child: any) => (
                    <div
                      key={child.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        assignChildIds.includes(child.id) ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => toggleChild(child.id)}
                    >
                      <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                        assignChildIds.includes(child.id) ? 'bg-primary border-primary' : 'border-muted-foreground'
                      }`}>
                        {assignChildIds.includes(child.id) && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{child.display_name}</p>
                        <p className="text-xs text-muted-foreground">@{child.username}</p>
                      </div>
                    </div>
                  ))
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
