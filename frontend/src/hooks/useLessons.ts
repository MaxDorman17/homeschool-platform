'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lessonsApi } from '@/services/api'
import { Lesson, LessonAssignment } from '@/types'
import { toast } from 'sonner'

export function useLessons(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['lessons', params],
    queryFn: async () => {
      const { data } = await lessonsApi.list(params)
      return data as Lesson[]
    },
  })
}

export function useLesson(id: string) {
  return useQuery({
    queryKey: ['lessons', id],
    queryFn: async () => {
      const { data } = await lessonsApi.get(id)
      return data as Lesson
    },
    enabled: !!id,
  })
}

export function useCreateLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lessonData: Partial<Lesson>) => {
      const { data } = await lessonsApi.create(lessonData)
      return data as Lesson
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      toast.success('Lesson created successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create lesson'
      toast.error(message)
    },
  })
}

export function useUpdateLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<Lesson> }) => {
      const { data } = await lessonsApi.update(id, updateData)
      return data as Lesson
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      queryClient.invalidateQueries({ queryKey: ['lessons', variables.id] })
      toast.success('Lesson updated successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update lesson'
      toast.error(message)
    },
  })
}

export function useDeleteLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await lessonsApi.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      toast.success('Lesson deleted successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete lesson'
      toast.error(message)
    },
  })
}

export function useAssignLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lessonId, data: assignData }: { lessonId: string; data: Partial<LessonAssignment> }) => {
      const { data } = await lessonsApi.assign(lessonId, assignData)
      return data as LessonAssignment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      queryClient.invalidateQueries({ queryKey: ['lesson-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.success('Lesson assigned successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to assign lesson'
      toast.error(message)
    },
  })
}

export function useCompleteLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ assignmentId, data: completeData }: { assignmentId: string; data: Record<string, any> }) => {
      const { data } = await lessonsApi.completeAssignment(assignmentId, completeData)
      return data as LessonAssignment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      queryClient.invalidateQueries({ queryKey: ['lesson-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Lesson completed! 🎉')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to complete lesson'
      toast.error(message)
    },
  })
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ assignmentId, data: updateData }: { assignmentId: string; data: Partial<LessonAssignment> }) => {
      const { data } = await lessonsApi.updateAssignment(assignmentId, updateData)
      return data as LessonAssignment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.success('Assignment updated!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update assignment'
      toast.error(message)
    },
  })
}

export function useRolloverLessons() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data?: Record<string, any>) => {
      const { data: result } = await lessonsApi.rollover(data)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      queryClient.invalidateQueries({ queryKey: ['lesson-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.success('Lessons rolled over!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to roll over lessons'
      toast.error(message)
    },
  })
}

export function useChildLessons(childId: string, params?: Record<string, any>) {
  return useQuery({
    queryKey: ['children', childId, 'lessons', params],
    queryFn: async () => {
      const { data } = await lessonsApi.getChildLessons(childId, params)
      return data as LessonAssignment[]
    },
    enabled: !!childId,
  })
}
