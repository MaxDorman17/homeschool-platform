'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subjectsApi } from '@/services/api'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  BookOpen,
  Plus,
  Palette,
  ArrowUp,
  ArrowDown,
  Edit3,
  Trash2,
  BookMarked,
} from 'lucide-react'
import { toast } from 'sonner'

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6b7280', // Gray
  '#84cc16', // Lime
]

const ICON_OPTIONS = ['BookOpen', 'Calculator', 'FlaskConical', 'Globe', 'PenLine', 'Music', 'Palette', 'Code', 'BookMarked', 'Brain', 'Star', 'Heart']

interface SubjectFormData {
  name: string
  description: string
  color: string
  icon: string
  display_order: number
  is_active: boolean
}

const defaultForm: SubjectFormData = {
  name: '',
  description: '',
  color: '#6366f1',
  icon: 'BookOpen',
  display_order: 0,
  is_active: true,
}

export default function SubjectsManagement() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<any>(null)
  const [form, setForm] = useState<SubjectFormData>(defaultForm)

  const { data, isLoading, error } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await subjectsApi.list()
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: SubjectFormData) => subjectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      toast.success('Subject created!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create subject'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubjectFormData> }) =>
      subjectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      toast.success('Subject updated!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update subject'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subjectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      toast.success('Subject removed')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete subject'),
  })

  const subjects = Array.isArray(data) ? data : data?.subjects || []

  const openCreate = () => {
    setEditingSubject(null)
    setForm({ ...defaultForm, display_order: subjects.length })
    setDialogOpen(true)
  }

  const openEdit = (subject: any) => {
    setEditingSubject(subject)
    setForm({
      name: subject.name || '',
      description: subject.description || '',
      color: subject.color || '#6366f1',
      icon: subject.icon || 'BookOpen',
      display_order: subject.display_order || 0,
      is_active: subject.is_active ?? true,
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingSubject(null)
    setForm(defaultForm)
  }

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Subject name is required')
      return
    }
    if (editingSubject) {
      updateMutation.mutate({ id: editingSubject.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const moveUp = (idx: number) => {
    if (idx <= 0) return
    const updated = [...subjects]
    const temp = updated[idx]
    updated[idx] = updated[idx - 1]
    updated[idx - 1] = temp
    updated.forEach((s, i) => {
      updateMutation.mutate({ id: s.id, data: { display_order: i } })
    })
  }

  const moveDown = (idx: number) => {
    if (idx >= subjects.length - 1) return
    const updated = [...subjects]
    const temp = updated[idx]
    updated[idx] = updated[idx + 1]
    updated[idx + 1] = temp
    updated.forEach((s, i) => {
      updateMutation.mutate({ id: s.id, data: { display_order: i } })
    })
  }

  if (isLoading) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Subjects">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Subjects">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">Failed to load subjects.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Subjects">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
              <p className="text-muted-foreground">Manage your curriculum subjects</p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Subject
            </Button>
          </div>

          {subjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <BookOpen className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mb-1 text-lg font-medium">No subjects yet</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Create your first subject to start building lessons
                </p>
                <Button onClick={openCreate}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Your First Subject
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject: any, idx: number) => (
                <Card
                  key={subject.id}
                  className={`transition-all hover:shadow-md ${!subject.is_active ? 'opacity-60' : ''}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${subject.color}20` }}
                        >
                          <BookOpen className="h-5 w-5" style={{ color: subject.color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{subject.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {subject.lesson_count || 0} lessons · Order {subject.display_order || 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon-xs" onClick={() => moveUp(idx)} disabled={idx === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => moveDown(idx)} disabled={idx === subjects.length - 1}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {subject.description && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{subject.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color }} />
                        {subject.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(subject)}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            if (window.confirm(`Delete subject "${subject.name}"?`)) {
                              deleteMutation.mutate(subject.id)
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingSubject ? 'Edit Subject' : 'Create Subject'}</DialogTitle>
                <DialogDescription>Configure your subject details</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Mathematics"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    placeholder="Brief description of this subject"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setForm({ ...form, color })}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          form.color === color ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-2">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setForm({ ...form, icon })}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                          form.icon === icon ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                        }`}
                      >
                        <BookOpen className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    min={0}
                    value={form.display_order}
                    onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm font-medium">Active</Label>
                    <p className="text-xs text-muted-foreground">Show this subject in menus</p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingSubject ? 'Save Changes' : 'Create Subject'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
