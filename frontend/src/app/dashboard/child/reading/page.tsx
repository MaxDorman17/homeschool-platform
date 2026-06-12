'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { readingApi, progressApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Book,
  BookOpen,
  BookMarked,
  Plus,
  Star,
  Flame,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import { format } from 'date-fns'

export default function ChildReadingPage() {
  const queryClient = useQueryClient()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingBook, setEditingBook] = useState<any>(null)
  const [formData, setFormData] = useState({
    book_title: '',
    author: '',
    pages: '',
    pages_read: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    finish_date: '',
    rating: 0,
    notes: '',
  })

  const { data: readingData, isLoading } = useQuery({
    queryKey: ['child-reading'],
    queryFn: () => readingApi.list('me'),
  })

  const { data: streaksData } = useQuery({
    queryKey: ['child-streaks'],
    queryFn: () => progressApi.getStreaks('me'),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => readingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-reading'] })
      setShowAddDialog(false)
      resetForm()
      toast.success('Book added to reading log!')
    },
    onError: () => toast.error('Failed to add book'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => readingApi.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-reading'] })
      setEditingBook(null)
      toast.success('Book updated!')
    },
    onError: () => toast.error('Failed to update book'),
  })

  const resetForm = () => {
    setFormData({
      book_title: '',
      author: '',
      pages: '',
      pages_read: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      finish_date: '',
      rating: 0,
      notes: '',
    })
  }

  const handleSubmit = () => {
    if (!formData.book_title.trim()) {
      toast.error('Please enter a book title')
      return
    }
    const payload = {
      ...formData,
      pages: formData.pages ? parseInt(formData.pages) : null,
      pages_read: formData.pages_read ? parseInt(formData.pages_read) : 0,
      rating: formData.rating || null,
      is_completed: !!formData.finish_date,
    }
    if (editingBook) {
      updateMutation.mutate({ id: editingBook.id, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const books = readingData?.data || []
  const readingStreak = streaksData?.data?.find((s: any) => s.streak_type === 'reading')
  const completedBooks = books.filter((b: any) => b.is_completed)
  const totalPages = books.reduce((sum: number, b: any) => sum + (b.pages || 0), 0)

  const RatingStars = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className={`transition-colors ${star <= value ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
        >
          <Star className="h-5 w-5 fill-current" />
        </button>
      ))}
    </div>
  )

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">My Reading Log</h1>
              <p className="text-muted-foreground">Track your reading journey!</p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Add Book</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingBook ? 'Edit Book' : 'Add a New Book'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Book Title *</Label>
                    <Input
                      value={formData.book_title}
                      onChange={(e) => setFormData((p) => ({ ...p, book_title: e.target.value }))}
                      placeholder="Enter book title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Author</Label>
                      <Input
                        value={formData.author}
                        onChange={(e) => setFormData((p) => ({ ...p, author: e.target.value }))}
                        placeholder="Author name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Pages</Label>
                      <Input
                        type="number"
                        value={formData.pages}
                        onChange={(e) => setFormData((p) => ({ ...p, pages: e.target.value }))}
                        placeholder="Total pages"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Finish Date (optional)</Label>
                      <Input
                        type="date"
                        value={formData.finish_date}
                        onChange={(e) => setFormData((p) => ({ ...p, finish_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <RatingStars value={formData.rating} onChange={(v) => setFormData((p) => ({ ...p, rating: v }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="What did you think of this book?"
                    />
                  </div>
                  <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingBook ? 'Update Book' : 'Add to Reading Log'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{books.length}</p>
                  <p className="text-xs text-muted-foreground">Total Books</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <BookMarked className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedBooks.length}</p>
                  <p className="text-xs text-muted-foreground">Books Finished</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Book className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPages}</p>
                  <p className="text-xs text-muted-foreground">Total Pages</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Flame className={`h-5 w-5 ${readingStreak?.current_streak > 0 ? 'text-orange-500' : 'text-orange-300'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{readingStreak?.current_streak || 0}</p>
                  <p className="text-xs text-muted-foreground">Day Reading Streak</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Book List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : books.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No books yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Start your reading journey by adding your first book!</p>
                <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Your First Book
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {books.map((book: any) => (
                <Card key={book.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{book.book_title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {book.author && `by ${book.author} · `}
                        {book.pages && `${book.pages} pages`}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(book.start_date), 'MMM d, yyyy')}
                        </span>
                        {book.is_completed && book.finish_date && (
                          <Badge variant="secondary" className="text-xs">
                            Finished {format(new Date(book.finish_date), 'MMM d')}
                          </Badge>
                        )}
                        {book.rating > 0 && <RatingStars value={book.rating} />}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingBook(book)
                        setFormData({
                          book_title: book.book_title,
                          author: book.author || '',
                          pages: book.pages?.toString() || '',
                          pages_read: book.pages_read?.toString() || '',
                          start_date: book.start_date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
                          finish_date: book.finish_date?.split('T')[0] || '',
                          rating: book.rating || 0,
                          notes: book.notes || '',
                        })
                        setShowAddDialog(true)
                      }}
                    >
                      Edit
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  )
}
