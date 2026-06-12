'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plannerApi, childrenApi, lessonsApi } from '@/services/api'
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
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  BookOpen,
  FileQuestion,
  FileText,
  RefreshCw,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

type ViewMode = 'day' | 'week' | 'month'

const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
]

const ENTRY_TYPES = [
  { value: 'lesson', label: 'Lesson', icon: 'BookOpen' },
  { value: 'quiz', label: 'Quiz', icon: 'FileQuestion' },
  { value: 'worksheet', label: 'Worksheet', icon: 'FileText' },
  { value: 'reading', label: 'Reading', icon: 'BookOpen' },
  { value: 'coding', label: 'Coding', icon: 'BookOpen' },
  { value: 'break', label: 'Break', icon: 'Clock' },
  { value: 'activity', label: 'Activity', icon: 'Clock' },
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = getDaysInMonth(year, month)
  const grid: (number | null)[][] = []
  let week: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) week.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day)
    if (week.length === 7) {
      grid.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    grid.push(week)
  }
  return grid
}

function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export default function PlannerPage() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedChildId, setSelectedChildId] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>(formatDateString(new Date()))

  const [form, setForm] = useState({
    title: '',
    entry_type: 'lesson' as string,
    notes: '',
    slot_number: 0,
  })

  const { data: childrenData } = useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const res = await childrenApi.list()
      return res.data
    },
  })

  const children = useMemo(() => {
    const d = Array.isArray(childrenData) ? childrenData : childrenData?.children || []
    if (!selectedChildId && d.length > 0) {
      setSelectedChildId(d[0].id)
    }
    return d
  }, [childrenData, selectedChildId])

  const dateStr = formatDateString(currentDate)
  const weekStart = new Date(currentDate)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = formatDateString(weekStart)
  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

  const { data: dayData, isLoading: dayLoading } = useQuery({
    queryKey: ['planner', 'day', selectedChildId, dateStr],
    queryFn: async () => {
      if (!selectedChildId) return []
      const res = await plannerApi.getDaily(selectedChildId, dateStr)
      return res.data
    },
    enabled: viewMode === 'day' && !!selectedChildId,
  })

  const { data: weekData, isLoading: weekLoading } = useQuery({
    queryKey: ['planner', 'week', selectedChildId, weekStartStr],
    queryFn: async () => {
      if (!selectedChildId) return []
      const res = await plannerApi.getWeekly(selectedChildId, weekStartStr)
      return res.data
    },
    enabled: viewMode === 'week' && !!selectedChildId,
  })

  const { data: monthData, isLoading: monthLoading } = useQuery({
    queryKey: ['planner', 'month', selectedChildId, monthStr],
    queryFn: async () => {
      if (!selectedChildId) return []
      const res = await plannerApi.getMonthly(selectedChildId, monthStr)
      return res.data
    },
    enabled: viewMode === 'month' && !!selectedChildId,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => plannerApi.createEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.success('Entry added!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to add entry'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => plannerApi.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.success('Entry removed')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to remove entry'),
  })

  const rolloverMutation = useMutation({
    mutationFn: (data?: any) => lessonsApi.rollover(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.success('Incomplete lessons rolled over!')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to rollover'),
  })

  const dayEntries = Array.isArray(dayData) ? dayData : []
  const weekEntries = Array.isArray(weekData) ? weekData : []
  const monthEntries = Array.isArray(monthData) ? monthData : []

  const navigatePrev = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') newDate.setDate(newDate.getDate() - 1)
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7)
    else newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') newDate.setDate(newDate.getDate() + 1)
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7)
    else newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const goToday = () => setCurrentDate(new Date())

  const openAddEntry = (slot?: number, day?: string) => {
    setEditingEntry(null)
    setForm({
      title: '',
      entry_type: 'lesson',
      notes: '',
      slot_number: slot ?? 0,
    })
    setSelectedSlot(slot ?? 0)
    setSelectedDay(day || dateStr)
    setDialogOpen(true)
  }

  const openEditEntry = (entry: any) => {
    setEditingEntry(entry)
    setForm({
      title: entry.title || '',
      entry_type: entry.entry_type || 'lesson',
      notes: entry.notes || '',
      slot_number: entry.slot_number || 0,
    })
    setSelectedSlot(entry.slot_number || 0)
    setSelectedDay(entry.date || dateStr)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingEntry(null)
  }

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    const payload = {
      child_id: selectedChildId,
      date: selectedDay,
      slot_number: selectedSlot ?? 0,
      title: form.title,
      entry_type: form.entry_type,
      notes: form.notes,
    }
    if (editingEntry) {
      plannerApi.updateEntry(editingEntry.id, payload).then(() => {
        queryClient.invalidateQueries({ queryKey: ['planner'] })
        toast.success('Entry updated!')
        closeDialog()
      }).catch((err) => toast.error(err?.response?.data?.detail || 'Failed to update'))
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleRollover = () => {
    rolloverMutation.mutate(selectedChildId ? { child_id: selectedChildId } : undefined)
  }

  const getEntriesForSlot = (slot: number, entries: any[]) =>
    entries.filter((e: any) => e.slot_number === slot)

  const getEntriesForDay = (day: number, entries: any[]) => {
    const targetDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return entries.filter((e: any) => e.date?.startsWith(targetDate))
  }

  const headerDate =
    viewMode === 'day'
      ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : viewMode === 'week'
      ? `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const isLoading = viewMode === 'day' ? dayLoading : viewMode === 'week' ? weekLoading : monthLoading

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Planner">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-[180px]">
                  <User className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 rounded-lg border p-0.5">
                {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="capitalize"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-xs" onClick={navigatePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[180px] text-center text-sm font-medium">{headerDate}</span>
                <Button variant="ghost" size="icon-xs" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleRollover} disabled={rolloverMutation.isPending}>
                <RefreshCw className={`mr-1.5 h-4 w-4 ${rolloverMutation.isPending ? 'animate-spin' : ''}`} />
                Rollover
              </Button>
            </div>
          </div>

          {!selectedChildId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <User className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">Select a child to view their schedule</p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Day View */}
              {viewMode === 'day' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Time Slots</h3>
                    <Button variant="outline" size="sm" onClick={() => openAddEntry(0)}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Entry
                    </Button>
                  </div>
                  {TIME_SLOTS.map((slotLabel, idx) => {
                    const entries = getEntriesForSlot(idx, dayEntries)
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                          entries.length === 0 ? 'hover:bg-accent/30 cursor-pointer' : ''
                        }`}
                        onClick={() => entries.length === 0 && openAddEntry(idx)}
                      >
                        <div className="flex w-20 shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {slotLabel}
                        </div>
                        <div className="flex-1 space-y-2">
                          {entries.length === 0 ? (
                            <p className="text-sm text-muted-foreground/50 italic">Empty slot — click to add</p>
                          ) : (
                            entries.map((entry: any) => (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between rounded-md bg-primary/5 p-2 cursor-pointer hover:bg-primary/10"
                                onClick={(e) => { e.stopPropagation(); openEditEntry(entry) }}
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {entry.entry_type}
                                  </Badge>
                                  <span className="text-sm font-medium">{entry.title}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (window.confirm('Remove this entry?')) deleteMutation.mutate(entry.id)
                                  }}
                                >
                                  <svg className="h-3.5 w-3.5 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Week View */}
              {viewMode === 'week' && (
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, dayIdx) => {
                    const d = new Date(weekStart)
                    d.setDate(d.getDate() + dayIdx)
                    const dateStr = formatDateString(d)
                    const isToday = formatDateString(new Date()) === dateStr
                    const dayEntries = weekEntries.filter((e: any) => e.date?.startsWith(dateStr))
                    return (
                      <div key={dayIdx} className={`rounded-lg border ${isToday ? 'border-primary ring-1 ring-primary' : ''}`}>
                        <div className={`p-2 text-center text-sm font-medium ${isToday ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                          {d.toLocaleDateString('en-US', { weekday: 'short' })}
                          <br />
                          {d.getDate()}
                        </div>
                        <div className="space-y-1 p-1.5 min-h-[120px]">
                          {dayEntries.slice(0, 3).map((entry: any) => (
                            <div
                              key={entry.id}
                              className="rounded bg-primary/10 p-1 text-xs cursor-pointer hover:bg-primary/20 truncate"
                              onClick={() => openEditEntry(entry)}
                            >
                              {entry.title}
                            </div>
                          ))}
                          {dayEntries.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center">+{dayEntries.length - 3} more</p>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="mt-1 w-full"
                            onClick={() => openAddEntry(0, dateStr)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Month View */}
              {viewMode === 'month' && (
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-7 gap-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                          {day}
                        </div>
                      ))}
                      {getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()).flat().map((day, idx) => {
                        if (day === null) return <div key={`empty-${idx}`} />
                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const isToday = formatDateString(new Date()) === dateStr
                        const dayEntries = monthEntries.filter((e: any) => e.date?.startsWith(dateStr))
                        return (
                          <div
                            key={idx}
                            className={`min-h-[80px] rounded-lg border p-1 cursor-pointer transition-colors hover:bg-accent/30 ${
                              isToday ? 'border-primary ring-1 ring-primary bg-primary/5' : ''
                            }`}
                            onClick={() => {
                              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
                              setViewMode('day')
                            }}
                          >
                            <div className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                              {day}
                            </div>
                            <div className="mt-1 space-y-0.5">
                              {dayEntries.slice(0, 2).map((entry: any) => (
                                <div
                                  key={entry.id}
                                  className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px]"
                                >
                                  {entry.title}
                                </div>
                              ))}
                              {dayEntries.length > 2 && (
                                <p className="text-[10px] text-muted-foreground">+{dayEntries.length - 2}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Add/Edit Entry Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingEntry ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
                <DialogDescription>Schedule an activity for this time slot</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="entry-title">Title *</Label>
                  <Input
                    id="entry-title"
                    placeholder="e.g. Math Lesson 5"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select
                    value={form.entry_type}
                    onValueChange={(v) => setForm({ ...form, entry_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Entry type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTRY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Time Slot</Label>
                  <Select
                    value={String(selectedSlot ?? 0)}
                    onValueChange={(v) => setSelectedSlot(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot, idx) => (
                        <SelectItem key={idx} value={String(idx)}>{slot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="entry-notes">Notes</Label>
                  <Textarea
                    id="entry-notes"
                    rows={3}
                    placeholder="Optional notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : editingEntry ? 'Save Changes' : 'Add Entry'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
