'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quizzesApi, subjectsApi, childrenApi } from '@/services/api'
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
  FileQuestion,
  Filter,
  Clock,
  Award,
  HelpCircle,
  PlusCircle,
  MinusCircle,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
]

interface QuestionForm {
  question_type: string
  question_text: string
  options: string[]
  correct_answer: string
  points: number
  explanation: string
  display_order: number
}

interface QuizFormData {
  title: string
  description: string
  subject_id: string
  instructions: string
  time_limit_minutes: number
  passing_score: number
  max_attempts: number
  is_randomized: boolean
  show_results: boolean
  difficulty: string
  questions: QuestionForm[]
}

const defaultQuestion: QuestionForm = {
  question_type: 'multiple_choice',
  question_text: '',
  options: ['', '', '', ''],
  correct_answer: '',
  points: 1,
  explanation: '',
  display_order: 0,
}

const defaultForm: QuizFormData = {
  title: '',
  description: '',
  subject_id: '',
  instructions: '',
  time_limit_minutes: 15,
  passing_score: 70,
  max_attempts: 3,
  is_randomized: false,
  show_results: true,
  difficulty: 'beginner',
  questions: [],
}

export default function QuizzesManagement() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null)
  const [editingQuiz, setEditingQuiz] = useState<any>(null)
  const [form, setForm] = useState<QuizFormData>(defaultForm)
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [assignChildIds, setAssignChildIds] = useState<string[]>([])

  const { data: quizzesData, isLoading, error } = useQuery({
    queryKey: ['quizzes', filterSubject, filterDifficulty],
    queryFn: async () => {
      const params: any = {}
      if (filterSubject !== 'all') params.subject_id = filterSubject
      if (filterDifficulty !== 'all') params.difficulty = filterDifficulty
      const res = await quizzesApi.list(params)
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
  const quizzes = Array.isArray(quizzesData) ? quizzesData : quizzesData?.quizzes || []

  const createMutation = useMutation({
    mutationFn: (data: QuizFormData) => quizzesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      toast.success('Quiz created!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create quiz'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuizFormData> }) =>
      quizzesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      toast.success('Quiz updated!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update quiz'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quizzesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      toast.success('Quiz deleted')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete quiz'),
  })

  const assignMutation = useMutation({
    mutationFn: ({ quizId, childIds }: { quizId: string; childIds: string[] }) =>
      quizzesApi.assign(quizId, { child_ids: childIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      toast.success('Quiz assigned!')
      setAssignDialogOpen(false)
      setAssignChildIds([])
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to assign'),
  })

  const openCreate = () => {
    setEditingQuiz(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  const openEdit = (quiz: any) => {
    setEditingQuiz(quiz)
    setForm({
      title: quiz.title || '',
      description: quiz.description || '',
      subject_id: quiz.subject_id || '',
      instructions: quiz.instructions || '',
      time_limit_minutes: quiz.time_limit_minutes || 15,
      passing_score: quiz.passing_score || 70,
      max_attempts: quiz.max_attempts || 3,
      is_randomized: quiz.is_randomized ?? false,
      show_results: quiz.show_results ?? true,
      difficulty: quiz.difficulty || 'beginner',
      questions: quiz.questions?.length
        ? quiz.questions.map((q: any) => ({
            question_type: q.question_type || 'multiple_choice',
            question_text: q.question_text || '',
            options: q.options?.length ? q.options : ['', '', '', ''],
            correct_answer: q.correct_answer || '',
            points: q.points || 1,
            explanation: q.explanation || '',
            display_order: q.display_order || 0,
          }))
        : [],
    })
    setDialogOpen(true)
  }

  const openDetail = (quiz: any) => {
    setSelectedQuiz(quiz)
    setDetailDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingQuiz(null)
    setForm(defaultForm)
  }

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error('Quiz title is required')
      return
    }
    const validQuestions = form.questions.filter((q) => q.question_text.trim())
    if (validQuestions.length === 0) {
      toast.error('Add at least one question')
      return
    }
    const payload = {
      ...form,
      questions: validQuestions.map((q, i) => ({ ...q, display_order: i })),
    }
    if (editingQuiz) {
      updateMutation.mutate({ id: editingQuiz.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const addQuestion = () => {
    setForm({
      ...form,
      questions: [...form.questions, { ...defaultQuestion, display_order: form.questions.length }],
    })
  }

  const removeQuestion = (idx: number) => {
    setForm({
      ...form,
      questions: form.questions.filter((_, i) => i !== idx),
    })
  }

  const updateQuestion = (idx: number, data: Partial<QuestionForm>) => {
    const updated = [...form.questions]
    updated[idx] = { ...updated[idx], ...data }
    setForm({ ...form, questions: updated })
  }

  const getSubject = (id: string) => subjects.find((s: any) => s.id === id)

  const toggleChild = (childId: string) => {
    setAssignChildIds((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    )
  }

  const handleAssign = () => {
    if (!selectedQuiz || assignChildIds.length === 0) {
      toast.error('Select at least one child')
      return
    }
    assignMutation.mutate({ quizId: selectedQuiz.id, childIds: assignChildIds })
  }

  if (isLoading) {
    return (
      <AuthGuard requiredRole="parent">
        <AppShell title="Quizzes">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
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
        <AppShell title="Quizzes">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">Failed to load quizzes.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Quizzes">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
              <p className="text-muted-foreground">Create and manage quizzes</p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Quiz
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-[180px]">
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
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quiz List */}
          {quizzes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="mb-1 text-lg font-medium">No quizzes yet</h3>
                <p className="mb-6 text-sm text-muted-foreground">Create your first quiz to assess learning</p>
                <Button onClick={openCreate}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Quiz
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz: any) => {
                const subject = getSubject(quiz.subject_id)
                return (
                  <Card
                    key={quiz.id}
                    className="transition-all hover:shadow-md cursor-pointer"
                    onClick={() => openDetail(quiz)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: subject?.color ? `${subject.color}20` : '#6366f120' }}
                        >
                          <FileQuestion className="h-5 w-5" style={{ color: subject?.color || '#6366f1' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{quiz.title}</h3>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {subject && (
                              <Badge variant="outline" className="text-xs font-normal"
                                style={{ borderColor: subject.color, color: subject.color }}
                              >
                                {subject.name}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">{quiz.difficulty}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" />
                          {quiz.questions?.length || 0} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {quiz.time_limit_minutes} min
                        </span>
                        <Badge variant={quiz.status === 'active' ? 'default' : 'outline'} className="text-xs">
                          {quiz.status || 'draft'}
                        </Badge>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); openEdit(quiz) }}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); setSelectedQuiz(quiz); setAssignChildIds([]); setAssignDialogOpen(true) }}>
                          Assign
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this quiz?')) deleteMutation.mutate(quiz.id) }}>
                          <svg className="h-4 w-4 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Create/Edit Quiz Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingQuiz ? 'Edit Quiz' : 'Create Quiz'}</DialogTitle>
                <DialogDescription>Configure quiz details and questions</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Quiz title" />
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
                        {subjects.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
                  <Label>Instructions</Label>
                  <Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Time Limit (min)</Label>
                    <Input type="number" min={1} value={form.time_limit_minutes} onChange={(e) => setForm({ ...form, time_limit_minutes: parseInt(e.target.value) || 15 })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Passing Score (%)</Label>
                    <Input type="number" min={0} max={100} value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: parseInt(e.target.value) || 70 })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Max Attempts</Label>
                    <Input type="number" min={1} value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: parseInt(e.target.value) || 3 })} />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_randomized} onCheckedChange={(v) => setForm({ ...form, is_randomized: v })} />
                    <Label className="text-sm">Randomize questions</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.show_results} onCheckedChange={(v) => setForm({ ...form, show_results: v })} />
                    <Label className="text-sm">Show results</Label>
                  </div>
                </div>

                {/* Questions Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Questions</Label>
                    <Button variant="outline" size="sm" onClick={addQuestion}>
                      <PlusCircle className="mr-1.5 h-4 w-4" />
                      Add Question
                    </Button>
                  </div>
                  {form.questions.map((q, qIdx) => (
                    <div key={qIdx} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Question {qIdx + 1}</span>
                        <Button variant="ghost" size="icon-xs" onClick={() => removeQuestion(qIdx)}>
                          <MinusCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label className="text-xs">Type</Label>
                          <Select value={q.question_type} onValueChange={(v) => updateQuestion(qIdx, { question_type: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {QUESTION_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs">Points</Label>
                          <Input type="number" min={1} className="h-8 text-xs" value={q.points} onChange={(e) => updateQuestion(qIdx, { points: parseInt(e.target.value) || 1 })} />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs">Question Text</Label>
                        <Textarea className="min-h-[60px] text-sm" value={q.question_text} onChange={(e) => updateQuestion(qIdx, { question_text: e.target.value })} />
                      </div>

                      {/* Options for multiple_choice */}
                      {(q.question_type === 'multiple_choice') && (
                        <div className="space-y-2">
                          <Label className="text-xs">Options</Label>
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                                q.correct_answer === opt ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground'
                              }`}>
                                {String.fromCharCode(65 + oIdx)}
                              </div>
                              <Input
                                className="h-8 text-sm flex-1"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...q.options]
                                  newOpts[oIdx] = e.target.value
                                  updateQuestion(qIdx, { options: newOpts })
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => updateQuestion(qIdx, { correct_answer: opt })}
                                title="Mark as correct answer"
                              >
                                <Award className={`h-3.5 w-3.5 ${q.correct_answer === opt ? 'text-primary' : 'text-muted-foreground/40'}`} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* True/False */}
                      {q.question_type === 'true_false' && (
                        <div className="space-y-2">
                          <Label className="text-xs">Correct Answer</Label>
                          <div className="flex gap-2">
                            {['True', 'False'].map((val) => (
                              <Button
                                key={val}
                                variant={q.correct_answer === val ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateQuestion(qIdx, { correct_answer: val })}
                              >
                                {val}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Short Answer */}
                      {q.question_type === 'short_answer' && (
                        <div className="grid gap-2">
                          <Label className="text-xs">Correct Answer</Label>
                          <Input className="h-8 text-sm" value={q.correct_answer} onChange={(e) => updateQuestion(qIdx, { correct_answer: e.target.value })} placeholder="Expected answer" />
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label className="text-xs">Explanation (optional)</Label>
                        <Input className="h-8 text-sm" value={q.explanation} onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })} placeholder="Explain why this answer is correct" />
                      </div>
                    </div>
                  ))}
                  {form.questions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No questions added yet. Click &quot;Add Question&quot; to start.</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingQuiz ? 'Save Changes' : 'Create Quiz'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Detail Dialog */}
          <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{selectedQuiz?.title}</DialogTitle>
                <DialogDescription>
                  {selectedQuiz?.description}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selectedQuiz?.subject_id && (
                    <Badge variant="outline" style={{ borderColor: getSubject(selectedQuiz.subject_id)?.color, color: getSubject(selectedQuiz.subject_id)?.color }}>
                      {getSubject(selectedQuiz.subject_id)?.name}
                    </Badge>
                  )}
                  <Badge variant="secondary">{selectedQuiz?.difficulty}</Badge>
                  <Badge>{selectedQuiz?.status}</Badge>
                </div>
                {selectedQuiz?.instructions && (
                  <div>
                    <p className="text-sm font-medium">Instructions</p>
                    <p className="text-sm text-muted-foreground">{selectedQuiz.instructions}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-lg font-bold">{selectedQuiz?.time_limit_minutes}</p>
                    <p className="text-xs text-muted-foreground">Minutes</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-lg font-bold">{selectedQuiz?.passing_score}%</p>
                    <p className="text-xs text-muted-foreground">Pass Score</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-lg font-bold">{selectedQuiz?.questions?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Questions</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Close</Button>
                <Button onClick={() => { setDetailDialogOpen(false); openEdit(selectedQuiz) }}>Edit Quiz</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Assign Dialog */}
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Quiz</DialogTitle>
                <DialogDescription>Select children to assign this quiz to</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                {children.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">No children available</p>
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
                      <p className="text-sm font-medium">{child.display_name}</p>
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
