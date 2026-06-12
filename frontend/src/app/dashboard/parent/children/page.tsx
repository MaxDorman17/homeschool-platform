'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { childrenApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { AvatarPicker } from '@/components/ui/AvatarPicker'
import {
  Users,
  Plus,
  Award,
  Zap,
  Flame,
  Edit3,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'

interface ChildFormData {
  username: string
  display_name: string
  pin_code: string
  date_of_birth: string
  grade_level: string
  is_active: boolean
  avatar_url: string
}

const defaultForm: ChildFormData = {
  username: '',
  display_name: '',
  pin_code: '',
  date_of_birth: '',
  grade_level: '',
  is_active: true,
  avatar_url: '👦',
}

export default function ChildrenManagement() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChild, setEditingChild] = useState<any>(null)
  const [form, setForm] = useState<ChildFormData>(defaultForm)

  const { data, isLoading, error } = useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const res = await childrenApi.list()
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: ChildFormData) => childrenApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] })
      toast.success('Child created successfully!')
      closeDialog()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to create child')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChildFormData> }) =>
      childrenApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] })
      toast.success('Child updated successfully!')
      closeDialog()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update child')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => childrenApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] })
      toast.success('Child removed')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete child')
    },
  })

  const children = Array.isArray(data) ? data : data?.children || []

  const openCreate = () => {
    setEditingChild(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  const openEdit = (child: any) => {
    setEditingChild(child)
    setForm({
      username: child.username || '',
      display_name: child.display_name || '',
      pin_code: '',
      date_of_birth: child.date_of_birth ? child.date_of_birth.split('T')[0] : '',
      grade_level: child.grade_level || '',
      is_active: child.is_active ?? true,
      avatar_url: child.avatar_url || '👦',
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingChild(null)
    setForm(defaultForm)
  }

  const handleSubmit = () => {
    if (!form.username.trim() || !form.display_name.trim()) {
      toast.error('Username and display name are required')
      return
    }
    if (editingChild) {
      updateMutation.mutate({ id: editingChild.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleToggleActive = (child: any, active: boolean) => {
    updateMutation.mutate({ id: child.id, data: { is_active: active } })
  }

  const handleDelete = (child: any) => {
    if (window.confirm(`Remove ${child.display_name}? This cannot be undone.`)) {
      deleteMutation.mutate(child.id)
    }
  }

  if (isLoading) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Children">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-14 w-14 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
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
        <AppShell title="Children">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">Failed to load children.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Children">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Children</h1>
              <p className="text-muted-foreground">Manage your children&apos;s profiles</p>
            </div>
            <Button onClick={openCreate}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Add Child
            </Button>
          </div>

          {/* Children Grid */}
          {children.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Users className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mb-1 text-lg font-medium">No children added yet</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Add your first child to get started with homeschooling
                </p>
                <Button onClick={openCreate}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Your First Child
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {children.map((child: any) => (
                <Card
                  key={child.id}
                  className={`transition-all hover:shadow-md cursor-pointer ${!child.is_active ? 'opacity-60' : ''}`}
                  onClick={() => openEdit(child)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                          <AvatarImage src={child.avatar_url} alt={child.display_name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-base">
                            {child.display_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{child.display_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {child.grade_level || 'No grade set'} · @{child.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(child)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 dark:bg-indigo-950/20">
                        <Award className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="font-medium text-indigo-700 dark:text-indigo-300">
                          Lvl {child.level || 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 dark:bg-amber-950/20">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span className="font-medium text-amber-700 dark:text-amber-300">
                          {child.current_xp || child.xp || 0} XP
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 dark:bg-orange-950/20">
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        <span className="font-medium text-orange-700 dark:text-orange-300">
                          {child.streak || 0}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant={child.is_active ? 'default' : 'secondary'} className="text-xs">
                        {child.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={child.is_active}
                          onCheckedChange={(checked) => handleToggleActive(child, checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingChild ? 'Edit Child' : 'Add Child'}</DialogTitle>
                <DialogDescription>
                  {editingChild ? 'Update your child\'s profile information.' : 'Create a new profile for your child.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    placeholder="e.g. johnny_smith"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    placeholder="e.g. Johnny Smith"
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pin_code">PIN Code (for child login)</Label>
                  <Input
                    id="pin_code"
                    type="password"
                    placeholder="4-6 digit PIN"
                    maxLength={6}
                    value={form.pin_code}
                    onChange={(e) => setForm({ ...form, pin_code: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="grade_level">Grade Level</Label>
                    <Input
                      id="grade_level"
                      placeholder="e.g. 3rd Grade"
                      value={form.grade_level}
                      onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                    />
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <AvatarPicker
                    value={form.avatar_url}
                    onChange={(avatar) => setForm({ ...form, avatar_url: avatar })}
                    avatars={['👦','👧','🧒','👨‍🎓','👩‍🎓','🎨','🧪','🔭','📚','🎵','🌍','💻','🤖','🐶','🐱','🦊','🐼','🦄']}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm font-medium">Active</Label>
                    <p className="text-xs text-muted-foreground">Allow child to log in</p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingChild
                    ? 'Save Changes'
                    : 'Create Child'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
