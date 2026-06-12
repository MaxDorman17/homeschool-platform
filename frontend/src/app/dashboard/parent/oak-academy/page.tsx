'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { oakApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TreePine,
  Search,
  Download,
  BookOpen,
  FileQuestion,
  FileText,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

export default function OakAcademy() {
  const queryClient = useQueryClient()
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('browse')

  const { data: oakSubjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['oak-subjects'],
    queryFn: async () => {
      const res = await oakApi.getSubjects()
      return res.data
    },
  })

  const subjects = Array.isArray(oakSubjects) ? oakSubjects : oakSubjects?.subjects || []

  const { data: oakUnits } = useQuery({
    queryKey: ['oak-units', selectedSubject],
    queryFn: async () => {
      if (!selectedSubject) return []
      const res = await oakApi.getUnits(selectedSubject)
      return res.data
    },
    enabled: !!selectedSubject,
  })

  const units = Array.isArray(oakUnits) ? oakUnits : oakUnits?.units || []

  const { data: oakLessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['oak-lessons', selectedSubject, selectedYear, selectedUnit, searchQuery],
    queryFn: async () => {
      const params: any = {}
      if (selectedSubject) params.subject = selectedSubject
      if (selectedYear) params.year = selectedYear
      if (selectedUnit) params.unit = selectedUnit
      if (searchQuery) params.search = searchQuery
      const res = await oakApi.getLessons(params)
      return res.data
    },
    enabled: !!selectedSubject,
  })

  const lessons = Array.isArray(oakLessons) ? oakLessons : oakLessons?.lessons || []

  const { data: cachedData } = useQuery({
    queryKey: ['oak-cached'],
    queryFn: async () => {
      const res = await oakApi.getCached()
      return res.data
    },
    enabled: activeTab === 'imported',
  })

  const cachedContent = Array.isArray(cachedData) ? cachedData : cachedData?.items || []

  const importLessonMutation = useMutation({
    mutationFn: (data: any) => oakApi.importLesson(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oak-cached'] })
      toast.success('Lesson imported successfully!')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to import lesson'),
  })

  const importQuizMutation = useMutation({
    mutationFn: (data: any) => oakApi.importQuiz(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oak-cached'] })
      toast.success('Quiz imported successfully!')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to import quiz'),
  })

  const handleImportLesson = (lesson: any) => {
    importLessonMutation.mutate({
      oak_lesson_id: lesson.id,
      title: lesson.title,
      subject: selectedSubject,
    })
  }

  const YEARS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Oak Academy">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Oak Academy</h1>
              <p className="text-muted-foreground">Browse, search, and import Oak National Academy content</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="browse">
                <Search className="mr-2 h-4 w-4" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="imported">
                <Download className="mr-2 h-4 w-4" />
                Imported Content
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search Oak lessons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedUnit('') }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s: any) => (
                      <SelectItem key={s.id || s} value={s.slug || s}>{s.name || s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>Year {y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u: any) => (
                      <SelectItem key={u.id || u} value={u.slug || u}>{u.name || u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lessons */}
              {!selectedSubject ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <TreePine className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Select a subject to browse Oak Academy lessons</p>
                  </CardContent>
                </Card>
              ) : lessonsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-3 text-muted-foreground">Loading lessons...</p>
                </div>
              ) : lessons.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No lessons found. Try different filters.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {lessons.map((lesson: any) => (
                    <Card key={lesson.id} className="transition-all hover:shadow-md">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{lesson.title}</h3>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {lesson.year && <Badge variant="secondary" className="text-xs">Year {lesson.year}</Badge>}
                              {lesson.difficulty && <Badge variant="outline" className="text-xs">{lesson.difficulty}</Badge>}
                            </div>
                          </div>
                        </div>
                        {lesson.description && (
                          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{lesson.description}</p>
                        )}
                        <div className="mt-4">
                          {lesson.has_quiz && (
                            <Badge variant="outline" className="text-xs mr-1">
                              <FileQuestion className="mr-1 h-3 w-3" />
                              Quiz
                            </Badge>
                          )}
                          {lesson.has_worksheet && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="mr-1 h-3 w-3" />
                              Worksheet
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => handleImportLesson(lesson)}
                          disabled={importLessonMutation.isPending}
                        >
                          <Download className="mr-1.5 h-4 w-4" />
                          Import Lesson
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="imported" className="space-y-4">
              {cachedContent.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Download className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <h3 className="mb-1 text-lg font-medium">No imported content</h3>
                    <p className="text-sm text-muted-foreground">Browse and import lessons from Oak Academy</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cachedContent.map((item: any, idx: number) => (
                    <Card key={item.id || idx} className="transition-all hover:shadow-md">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            item.type === 'lesson' ? 'bg-blue-100 dark:bg-blue-900/30' :
                            item.type === 'quiz' ? 'bg-purple-100 dark:bg-purple-900/30' :
                            'bg-amber-100 dark:bg-amber-900/30'
                          }`}>
                            {item.type === 'lesson' ? <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" /> :
                             item.type === 'quiz' ? <FileQuestion className="h-5 w-5 text-purple-600 dark:text-purple-400" /> :
                             <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                            <Badge variant="outline" className="text-xs mt-1 capitalize">{item.type}</Badge>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Imported {item.imported_at ? new Date(item.imported_at).toLocaleDateString() : 'recently'}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
