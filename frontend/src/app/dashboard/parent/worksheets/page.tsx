'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { worksheetsApi, subjectsApi, childrenApi } from '@/services/api'
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
import {
  Plus,
  FileText,
  Upload,
  Download,
  Printer,
  Filter,
  HelpCircle,
  PlusCircle,
  MinusCircle,
  GripVertical,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'

type TabType = 'uploaded' | 'interactive' | 'oak_imported'

export default function WorksheetsManagement() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('uploaded')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [interactiveDialogOpen, setInteractiveDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedWorksheet, setSelectedWorksheet] = useState<any>(null)
  const [editingWorksheet, setEditingWorksheet] = useState<any>(null)
  const [assignChildIds, setAssignChildIds] = useState<string[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject_id: '',
    file: null as File | null,
  })
  const [interactiveForm, setInteractiveForm] = useState({
    title: '',
    subject_id: '',
    auto_grade: true,
    questions: [] as any[],
  })

  const { data: worksheetsData, isLoading, error } = useQuery({
    queryKey: ['worksheets', activeTab],
    queryFn: async () => {
      const params: any = { worksheet_type: activeTab }
      const res = await worksheetsApi.list(params)
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
  const worksheets = Array.isArray(worksheetsData) ? worksheetsData : worksheetsData?.worksheets || []

  const createMutation = useMutation({
    mutationFn: (data: any) => worksheetsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheets'] })
      toast.success('Worksheet created!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create worksheet'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => worksheetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheets'] })
      toast.success('Worksheet deleted')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete'),
  })

  const assignMutation = useMutation({
    mutationFn: ({ worksheetId, childIds }: { worksheetId: string; childIds: string[] }) =>
      worksheetsApi.assign(worksheetId, { child_ids: childIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worksheets'] })
      toast.success('Worksheet assigned!')
      setAssignDialogOpen(false)
      setAssignChildIds([])
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to assign'),
  })

  const openUpload = () => {
    setEditingWorksheet(null)
    setForm({ title: '', description: '', subject_id: '', file: null })
    setDialogOpen(true)
  }

  const openInteractive = () => {
    setInteractiveForm({ title: '', subject_id: '', auto_grade: true, questions: [] })
    setInteractiveDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingWorksheet(null)
    setForm({ title: '', description: '', subject_id: '', file: null })
  }

  const handleUpload = () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    createMutation.mutate({
      title: form.title,
      description: form.description,
      subject_id: form.subject_id || undefined,
      worksheet_type: 'upload',
      is_interactive: false,
      status: 'active',
    })
  }

  const handleCreateInteractive = () => {
    if (!interactiveForm.title.trim()) {
      toast.error('Title is required')
      return
    }
    createMutation.mutate({
      title: interactiveForm.title,
      subject_id: interactiveForm.subject_id || undefined,
      worksheet_type: 'interactive',
      is_interactive: true,
      auto_grade: interactiveForm.auto_grade,
      interactive_data: { questions: interactiveForm.questions },
      status: 'active',
    })
    setInteractiveDialogOpen(false)
  }

  const addInteractiveQuestion = () => {
    setInteractiveForm({
      ...interactiveForm,
      questions: [
        ...interactiveForm.questions,
        {
          type: 'multiple_choice',
          question: '',
          options: ['', '', '', ''],
          correct_answer: '',
          points: 1,
        },
      ],
    })
  }

  const getSubject = (id: string) => subjects.find((s: any) => s.id === id)

  const toggleChild = (childId: string) => {
    setAssignChildIds((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    )
  }

  const handleAssign = () => {
    if (!selectedWorksheet || assignChildIds.length === 0) {
      toast.error('Select at least one child')
      return
    }
    assignMutation.mutate({ worksheetId: selectedWorksheet.id, childIds: assignChildIds })
  }

  if (isLoading) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Worksheets">
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
        <AppShell title="Worksheets">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">Failed to load worksheets.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Worksheets">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Worksheets</h1>
              <p className="text-muted-foreground">Create, upload, and manage worksheets</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={openUpload}>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload Worksheet
              </Button>
              <Button variant="outline" onClick={openInteractive}>
                <Lightbulb className="mr-1.5 h-4 w-4" />
                Create Interactive
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border p-0.5 w-fit">
            {(['uploaded', 'interactive', 'oak_imported'] as TabType[]).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className="capitalize"
              >
                {tab === 'oak_imported' ? 'Oak Imported' : tab}
              </Button>
            ))}
          </div>

          {/* Worksheets Grid */}
          {worksheets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="mb-1 text-lg font-medium">No worksheets</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  {activeTab === 'uploaded'
                    ? 'Upload a worksheet file to get started'
                    : activeTab === 'interactive'
                    ? 'Create an interactive worksheet'
                    : 'Import worksheets from Oak Academy'}
                </p>
                {activeTab === 'uploaded' && <Button onClick={openUpload}><Upload className="mr-1.5 h-4 w-4" />Upload Worksheet</Button>}
                {activeTab === 'interactive' && <Button onClick={openInteractive}><Plus className="mr-1.5 h-4 w-4" />Create Interactive</Button>}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {worksheets.map((ws: any) => {
                const subject = getSubject(ws.subject_id)
                return (
                  <Card key={ws.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                          <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{ws.title}</h3>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-xs">
                              {ws.worksheet_type === 'upload' ? 'Uploaded' : ws.worksheet_type === 'interactive' ? 'Interactive' : 'Oak Imported'}
                            </Badge>
                            {ws.file_type && (
                              <Badge variant="secondary" className="text-xs">{ws.file_type}</Badge>
                            )}
                            {subject && (
                              <Badge variant="outline" className="text-xs" style={{ borderColor: subject.color, color: subject.color }}>
                                {subject.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex gap-1">
                          {ws.file_path && (
                            <Button variant="ghost" size="icon-xs">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-xs">
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedWorksheet(ws); setAssignChildIds([]); setAssignDialogOpen(true) }}>
                            Assign
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => { if (window.confirm('Delete this worksheet?')) deleteMutation.mutate(ws.id) }}>
                            <svg className="h-3.5 w-3.5 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Upload Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Worksheet</DialogTitle>
                <DialogDescription>Upload a worksheet file or create a new entry</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Worksheet title" />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <div className="grid gap-2">
                  <Label>Subject</Label>
                  <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>File</Label>
                  <Input
                    type="file"
                    onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">PDF, DOCX, or image files</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleUpload} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Interactive Worksheet Builder Dialog */}
          <Dialog open={interactiveDialogOpen} onOpenChange={setInteractiveDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Interactive Worksheet</DialogTitle>
                <DialogDescription>Build a digital worksheet with auto-grading</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input value={interactiveForm.title} onChange={(e) => setInteractiveForm({ ...interactiveForm, title: e.target.value })} placeholder="Interactive worksheet title" />
                </div>
                <div className="grid gap-2">
                  <Label>Subject</Label>
                  <Select value={interactiveForm.subject_id} onValueChange={(v) => setInteractiveForm({ ...interactiveForm, subject_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={interactiveForm.auto_grade} onCheckedChange={(v) => setInteractiveForm({ ...interactiveForm, auto_grade: v })} />
                  <Label>Auto-grading</Label>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Questions</span>
                    <Button variant="outline" size="sm" onClick={addInteractiveQuestion}>
                      <PlusCircle className="mr-1.5 h-4 w-4" />
                      Add Question
                    </Button>
                  </div>
                  {interactiveForm.questions.map((q: any, idx: number) => (
                    <div key={idx} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Question {idx + 1}</span>
                        <Button variant="ghost" size="icon-xs" onClick={() => {
                          setInteractiveForm({
                            ...interactiveForm,
                            questions: interactiveForm.questions.filter((_: any, i: number) => i !== idx),
                          })
                        }}>
                          <MinusCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <Select
                        value={q.type}
                        onValueChange={(v) => {
                          const updated = [...interactiveForm.questions]
                          updated[idx] = { ...updated[idx], type: v, options: v === 'multiple_choice' ? ['', '', '', ''] : [] }
                          setInteractiveForm({ ...interactiveForm, questions: updated })
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                          <SelectItem value="matching">Matching</SelectItem>
                          <SelectItem value="image_labeling">Image Labeling</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        className="min-h-[60px] text-sm"
                        placeholder="Question text"
                        value={q.question}
                        onChange={(e) => {
                          const updated = [...interactiveForm.questions]
                          updated[idx] = { ...updated[idx], question: e.target.value }
                          setInteractiveForm({ ...interactiveForm, questions: updated })
                        }}
                      />
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="space-y-2">
                          <span className="text-xs text-muted-foreground">Options</span>
                          {q.options.map((opt: string, oIdx: number) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <Input
                                className="h-8 text-sm"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...interactiveForm.questions]
                                  const newOpts = [...updated[idx].options]
                                  newOpts[oIdx] = e.target.value
                                  updated[idx] = { ...updated[idx], options: newOpts }
                                  setInteractiveForm({ ...interactiveForm, questions: updated })
                                }}
                                placeholder={`Option ${oIdx + 1}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => {
                                  const updated = [...interactiveForm.questions]
                                  updated[idx] = { ...updated[idx], correct_answer: opt }
                                  setInteractiveForm({ ...interactiveForm, questions: updated })
                                }}
                              >
                                <CheckCircle2 className={`h-3.5 w-3.5 ${q.correct_answer === opt ? 'text-primary' : 'text-muted-foreground/40'}`} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {interactiveForm.questions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No questions yet</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInteractiveDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateInteractive} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Worksheet'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Assign Dialog */}
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Worksheet</DialogTitle>
                <DialogDescription>Select children</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                {children.map((child: any) => (
                  <div key={child.id} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${
                    assignChildIds.includes(child.id) ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                  }`} onClick={() => toggleChild(child.id)}>
                    <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                      assignChildIds.includes(child.id) ? 'bg-primary border-primary' : 'border-muted-foreground'
                    }`}>
                      {assignChildIds.includes(child.id) && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      )}
                    </div>
                    <p className="text-sm font-medium">{child.display_name}</p>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAssign} disabled={assignChildIds.length === 0}>Assign</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
