'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { readingApi, childrenApi } from '@/services/api'
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
  BookMarked,
  Plus,
  Star,
  Flame,
  BookOpen,
  Calendar,
  TrendingUp,
  Edit3,
  Trash2,
  User,
  BookmarkPlus,
} from 'lucide-react'
import { toast } from 'sonner'

export default function ReadingLog() {
  const queryClient = useQueryClient()
  const [selectedChildId, setSelectedChildId] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<any>(null)
  const [form, setForm] = useState({
    book_title: '',
    author: '',
    pages: 0,
    pages_read: 0,
    start_date: '',
    finish_date: '',
    rating: 0,
    notes: '',
    is_completed: false,
  })

  const { data: childrenData } = useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const res = await childrenApi.list()
      return res.data
    },
  })

  const children = Array.isArray(childrenData) ? childrenData : childrenData?.children || []

  const { data: booksData, isLoading } = useQuery({
    queryKey: ['reading-log', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return []
      const res = await readingApi.list(selectedChildId)
      return res.data
    },
    enabled: !!selectedChildId,
  })

  const books = Array.isArray(booksData) ? booksData : booksData?.books || booksData?.reading_logs || []

  const createMutation = useMutation({
    mutationFn: (data: any) => readingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-log'] })
      toast.success('Book added!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to add book'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => readingApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-log'] })
      toast.success('Book updated!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => readingApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-log'] })
      toast.success('Book removed')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete'),
  })

  const openCreate = () => {
    setEditingBook(null)
    setForm({
      book_title: '',
      author: '',
      pages: 0,
      pages_read: 0,
      start_date: '',
      finish_date: '',
      rating: 0,
      notes: '',
      is_completed: false,
    })
    setDialogOpen(true)
  }

  const openEdit = (book: any) => {
    setEditingBook(book)
    setForm({
      book_title: book.book_title || '',
      author: book.author || '',
      pages: book.pages || 0,
      pages_read: book.pages_read || 0,
      start_date: book.start_date ? book.start_date.split('T')[0] : '',
      finish_date: book.finish_date ? book.finish_date.split('T')[0] : '',
      rating: book.rating || 0,
      notes: book.notes || '',
      is_completed: book.is_completed || false,
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingBook(null)
  }

  const handleSubmit = () => {
    if (!form.book_title.trim()) {
      toast.error('Book title is required')
      return
    }
    const payload = {
      ...form,
      child_id: selectedChildId,
      pages: form.pages || undefined,
      pages_read: form.pages_read || undefined,
    }
    if (editingBook) {
      updateMutation.mutate({ id: editingBook.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const completedBooks = books.filter((b: any) => b.is_completed)
  const totalPages = books.reduce((sum: number, b: any) => sum + (b.pages || 0), 0)
  const streak = 3 // placeholder

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
      />
    ))
  }

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Reading Log">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Reading Log</h1>
              <p className="text-muted-foreground">Track your children&apos;s reading progress</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="w-[220px]">
                <User className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedChildId && (
              <Button onClick={openCreate}>
                <BookmarkPlus className="mr-1.5 h-4 w-4" />
                Add Book
              </Button>
            )}
          </div>

          {!selectedChildId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BookMarked className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">Select a child to view their reading log</p>
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
              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Books</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{books.length}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Completed</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{completedBooks.length}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Pages</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{totalPages}</p></CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100 dark:from-orange-950/20 dark:to-background dark:border-orange-900/30">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-1.5 text-sm text-muted-foreground"><Flame className="h-4 w-4 text-orange-500" /> Streak</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{streak} days</p></CardContent>
                </Card>
              </div>

              {/* Books List */}
              {books.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <h3 className="mb-1 text-lg font-medium">No books logged yet</h3>
                    <p className="mb-6 text-sm text-muted-foreground">Start tracking your child&apos;s reading journey</p>
                    <Button onClick={openCreate}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add First Book
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {books.map((book: any) => (
                    <Card key={book.id} className="transition-all hover:shadow-md">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                          <BookMarked className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{book.book_title}</h3>
                            <Badge variant={book.is_completed ? 'default' : 'secondary'} className="text-xs shrink-0">
                              {book.is_completed ? 'Completed' : 'Reading'}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {book.author && <span>by {book.author}</span>}
                            {book.pages > 0 && <span>{book.pages} pages</span>}
                            {book.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(book.start_date).toLocaleDateString()}
                              </span>
                            )}
                            {book.rating > 0 && (
                              <span className="flex items-center gap-0.5">{renderStars(book.rating)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="icon-xs" onClick={() => openEdit(book)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => {
                            if (window.confirm('Remove this book?')) deleteMutation.mutate(book.id)
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

          {/* Add/Edit Book Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingBook ? 'Edit Book' : 'Add Book'}</DialogTitle>
                <DialogDescription>Log a book your child is reading</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Book Title *</Label>
                  <Input value={form.book_title} onChange={(e) => setForm({ ...form, book_title: e.target.value })} placeholder="Book title" />
                </div>
                <div className="grid gap-2">
                  <Label>Author</Label>
                  <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Total Pages</Label>
                    <Input type="number" min={0} value={form.pages || ''} onChange={(e) => setForm({ ...form, pages: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Pages Read</Label>
                    <Input type="number" min={0} value={form.pages_read || ''} onChange={(e) => setForm({ ...form, pages_read: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Finish Date</Label>
                    <Input type="date" value={form.finish_date} onChange={(e) => setForm({ ...form, finish_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Rating</Label>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} type="button" onClick={() => setForm({ ...form, rating: i + 1 })}>
                        <Star className={`h-6 w-6 cursor-pointer transition-colors ${
                          i < form.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30 hover:text-muted-foreground/50'
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Any notes about this book..." />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="completed"
                    checked={form.is_completed}
                    onChange={(e) => setForm({ ...form, is_completed: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="completed" className="text-sm">Mark as completed</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingBook ? 'Save Changes' : 'Add Book'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
