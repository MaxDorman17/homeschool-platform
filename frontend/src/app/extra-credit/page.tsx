'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { extraCreditApi, childrenApi, subjectsApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Sparkles,
  Plus,
  Zap,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Edit3,
  Trash2,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'

const TASK_TYPES = ['bonus', 'challenge', 'creative', 'research', 'project', 'other']

export default function ExtraCredit() {
  const queryClient = useQueryClient()
  const [selectedChildId, setSelectedChildId] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject_id: '',
    xp_reward: 20,
    task_type: 'bonus' as string,
    instructions: '',
    due_date: '',
  })

  const { data: childrenData } = useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const res = await childrenApi.list()
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

  const children = Array.isArray(childrenData) ? childrenData : childrenData?.children || []
  const subjects = Array.isArray(subjectsData) ? subjectsData : subjectsData?.subjects || []

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['extra-credit', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return []
      const res = await extraCreditApi.list(selectedChildId)
      return res.data
    },
    enabled: !!selectedChildId,
  })

  const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.tasks || []

  const createMutation = useMutation({
    mutationFn: (data: any) => extraCreditApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extra-credit'] })
      toast.success('Task created!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create task'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => extraCreditApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extra-credit'] })
      toast.success('Task updated!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => extraCreditApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extra-credit'] })
      toast.success('Task removed')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete'),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => extraCreditApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extra-credit'] })
      toast.success('Task marked complete!')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to complete'),
  })

  const openCreate = () => {
    setEditingTask(null)
    setForm({ title: '', description: '', subject_id: '', xp_reward: 20, task_type: 'bonus', instructions: '', due_date: '' })
    setDialogOpen(true)
  }

  const openEdit = (task: any) => {
    setEditingTask(task)
    setForm({
      title: task.title || '',
      description: task.description || '',
      subject_id: task.subject_id || '',
      xp_reward: task.xp_reward || 20,
      task_type: task.task_type || 'bonus',
      instructions: task.instructions || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingTask(null)
  }

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    const payload = {
      child_id: selectedChildId,
      ...form,
      subject_id: form.subject_id || undefined,
    }
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: form })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Extra Credit">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Extra Credit Tasks</h1>
              <p className="text-muted-foreground">Create bonus assignments and challenges</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="w-[220px]">
                <User className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedChildId && (
              <Button onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Task
              </Button>
            )}
          </div>

          {!selectedChildId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Sparkles className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">Select a child to view or create extra credit tasks</p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <>
              {tasks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Star className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <h3 className="mb-1 text-lg font-medium">No extra credit tasks</h3>
                    <p className="mb-6 text-sm text-muted-foreground">Create bonus challenges to motivate your child</p>
                    <Button onClick={openCreate}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Create First Task
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task: any) => (
                    <Card key={task.id} className={`transition-all hover:shadow-md ${task.is_completed ? 'opacity-70' : ''}`}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          task.is_completed
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-amber-100 dark:bg-amber-900/30'
                        }`}>
                          {task.is_completed
                            ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            : <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{task.title}</h3>
                            <Badge variant="outline" className="text-xs capitalize">{task.task_type}</Badge>
                            <Badge variant={task.is_completed ? 'default' : 'secondary'} className="text-xs">
                              {task.is_completed ? 'Completed' : 'Pending'}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <Zap className="h-3 w-3" />
                              +{task.xp_reward} XP
                            </span>
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {!task.is_completed && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => completeMutation.mutate(task.id)}
                              disabled={completeMutation.isPending}
                            >
                              <CheckCircle2 className="mr-1.5 h-4 w-4" />
                              Complete
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-xs" onClick={() => openEdit(task)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => {
                            if (window.confirm('Delete task?')) deleteMutation.mutate(task.id)
                          }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Create Extra Credit Task'}</DialogTitle>
                <DialogDescription>Set up a bonus task or challenge</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Subject</Label>
                    <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {subjects.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Task Type</Label>
                    <Select value={form.task_type} onValueChange={(v) => setForm({ ...form, task_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>XP Reward</Label>
                    <Input type="number" min={0} value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Instructions</Label>
                  <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={4} placeholder="Detailed instructions for the student..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
