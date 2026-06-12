'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subjectsApi } from '@/services/api'
import { Subject } from '@/types'
import { toast } from 'sonner'

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await subjectsApi.list()
      return data as Subject[]
    },
  })
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: ['subjects', id],
    queryFn: async () => {
      const { data } = await subjectsApi.get(id)
      return data as Subject
    },
    enabled: !!id,
  })
}

export function useCreateSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (subjectData: Partial<Subject>) => {
      const { data } = await subjectsApi.create(subjectData)
      return data as Subject
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      toast.success('Subject created successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create subject'
      toast.error(message)
    },
  })
}

export function useUpdateSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<Subject> }) => {
      const { data } = await subjectsApi.update(id, updateData)
      return data as Subject
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      queryClient.invalidateQueries({ queryKey: ['subjects', variables.id] })
      toast.success('Subject updated successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update subject'
      toast.error(message)
    },
  })
}

export function useDeleteSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await subjectsApi.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      toast.success('Subject deleted successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete subject'
      toast.error(message)
    },
  })
}
