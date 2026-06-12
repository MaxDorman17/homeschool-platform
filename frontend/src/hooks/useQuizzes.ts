'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quizzesApi } from '@/services/api'
import { Quiz, QuizAssignment } from '@/types'
import { toast } from 'sonner'

export function useQuizzes(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['quizzes', params],
    queryFn: async () => {
      const { data } = await quizzesApi.list(params)
      return data as Quiz[]
    },
  })
}

export function useQuiz(id: string) {
  return useQuery({
    queryKey: ['quizzes', id],
    queryFn: async () => {
      const { data } = await quizzesApi.get(id)
      return data as Quiz
    },
    enabled: !!id,
  })
}

export function useCreateQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quizData: Partial<Quiz>) => {
      const { data } = await quizzesApi.create(quizData)
      return data as Quiz
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      toast.success('Quiz created successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create quiz'
      toast.error(message)
    },
  })
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<Quiz> }) => {
      const { data } = await quizzesApi.update(id, updateData)
      return data as Quiz
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      queryClient.invalidateQueries({ queryKey: ['quizzes', variables.id] })
      toast.success('Quiz updated successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update quiz'
      toast.error(message)
    },
  })
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await quizzesApi.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      toast.success('Quiz deleted successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete quiz'
      toast.error(message)
    },
  })
}

export function useAssignQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ quizId, data: assignData }: { quizId: string; data: Partial<QuizAssignment> }) => {
      const { data } = await quizzesApi.assign(quizId, assignData)
      return data as QuizAssignment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      queryClient.invalidateQueries({ queryKey: ['quiz-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.success('Quiz assigned successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to assign quiz'
      toast.error(message)
    },
  })
}

export function useSubmitQuizAttempt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (attemptData: Record<string, any>) => {
      const { data } = await quizzesApi.submitAttempt(attemptData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      queryClient.invalidateQueries({ queryKey: ['quiz-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      toast.success('Quiz submitted! 🎉')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to submit quiz'
      toast.error(message)
    },
  })
}

export function useQuizAttempt(attemptId: string) {
  return useQuery({
    queryKey: ['quiz-attempts', attemptId],
    queryFn: async () => {
      const { data } = await quizzesApi.getAttempt(attemptId)
      return data
    },
    enabled: !!attemptId,
  })
}

export function useChildQuizzes(childId: string, params?: Record<string, any>) {
  return useQuery({
    queryKey: ['children', childId, 'quizzes', params],
    queryFn: async () => {
      const { data } = await quizzesApi.getChildQuizzes(childId, params)
      return data as QuizAssignment[]
    },
    enabled: !!childId,
  })
}
