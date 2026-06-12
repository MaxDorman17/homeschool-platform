'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { codingApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Code,
  Plus,
  Zap,
  Globe,
  Terminal,
  FileCode,
  ExternalLink,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'

const LANGUAGES = [
  { value: 'html', label: 'HTML', icon: '🌐' },
  { value: 'css', label: 'CSS', icon: '🎨' },
  { value: 'javascript', label: 'JavaScript', icon: '📜' },
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'scratch', label: 'Scratch', icon: '🧩' },
]

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

interface ProjectFormData {
  title: string
  description: string
  language: string
  difficulty: string
  instructions: string
  starter_code: string
  xp_reward: number
}

const defaultForm: ProjectFormData = {
  title: '',
  description: '',
  language: 'python',
  difficulty: 'beginner',
  instructions: '',
  starter_code: '',
  xp_reward: 50,
}

export default function CodingProjects() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [form, setForm] = useState<ProjectFormData>(defaultForm)

  const { data, isLoading, error } = useQuery({
    queryKey: ['coding-projects'],
    queryFn: async () => {
      const res = await codingApi.listProjects()
      return res.data
    },
  })

  const projects = Array.isArray(data) ? data : data?.projects || []

  const createMutation = useMutation({
    mutationFn: (data: ProjectFormData) => codingApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coding-projects'] })
      toast.success('Project created!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create project'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectFormData> }) =>
      codingApi.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coding-projects'] })
      toast.success('Project updated!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => codingApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coding-projects'] })
      toast.success('Project deleted')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete'),
  })

  const openCreate = () => {
    setEditingProject(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  const openEdit = (project: any) => {
    setEditingProject(project)
    setForm({
      title: project.title || '',
      description: project.description || '',
      language: project.language || 'python',
      difficulty: project.difficulty || 'beginner',
      instructions: project.instructions || '',
      starter_code: project.starter_code || '',
      xp_reward: project.xp_reward || 50,
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingProject(null)
    setForm(defaultForm)
  }

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const getLanguageLabel = (lang: string) => LANGUAGES.find((l) => l.value === lang)?.label || lang

  if (isLoading) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Coding">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-28 w-full" /></CardContent></Card>
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
        <AppShell title="Coding">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">Failed to load projects.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Coding">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Coding Projects</h1>
              <p className="text-muted-foreground">Create and manage coding challenges</p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Project
            </Button>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Code className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="mb-1 text-lg font-medium">No coding projects yet</h3>
                <p className="mb-6 text-sm text-muted-foreground">Create coding challenges for your children</p>
                <Button onClick={openCreate}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project: any) => (
                <Card key={project.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                        <Code className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{project.title}</h3>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs">
                            {getLanguageLabel(project.language)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{project.difficulty}</Badge>
                        </div>
                      </div>
                    </div>
                    {project.description && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400">
                        <Zap className="h-4 w-4" />
                        {project.xp_reward} XP
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => { setSelectedProject(project); setSubmissionsDialogOpen(true) }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(project)}>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => { if (window.confirm('Delete project?')) deleteMutation.mutate(project.id) }}>
                          <svg className="h-3.5 w-3.5 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Create Coding Project'}</DialogTitle>
                <DialogDescription>Set up a coding challenge for children</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project title" />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Language</Label>
                    <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                      <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>{l.icon} {l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                      <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map((d) => (
                          <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>XP Reward</Label>
                  <Input type="number" min={0} value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="grid gap-2">
                  <Label>Instructions</Label>
                  <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={4} placeholder="Step-by-step instructions for the student..." />
                </div>
                <div className="grid gap-2">
                  <Label>Starter Code</Label>
                  <Textarea value={form.starter_code} onChange={(e) => setForm({ ...form, starter_code: e.target.value })} rows={6} placeholder="// Starter code here..." className="font-mono text-sm" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Submissions Dialog */}
          <Dialog open={submissionsDialogOpen} onOpenChange={setSubmissionsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Submissions: {selectedProject?.title}</DialogTitle>
                <DialogDescription>View student submissions for this project</DialogDescription>
              </DialogHeader>
              <div className="py-4 text-center text-sm text-muted-foreground">
                No submissions yet.
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSubmissionsDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
