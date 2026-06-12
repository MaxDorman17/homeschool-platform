'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { childrenApi } from '@/services/api'
import { Child } from '@/types'
import { toast } from 'sonner'

export function useChildren() {
  return useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const { data } = await childrenApi.list()
      return data as Child[]
    },
  })
}

export function useChild(id: string) {
  return useQuery({
    queryKey: ['children', id],
    queryFn: async () => {
      const { data } = await childrenApi.get(id)
      return data as Child
    },
    enabled: !!id,
  })
}

export function useCreateChild() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (childData: Partial<Child>) => {
      const { data } = await childrenApi.create(childData)
      return data as Child
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] })
      toast.success('Child profile created successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create child profile'
      toast.error(message)
    },
  })
}

export function useUpdateChild() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<Child> }) => {
      const { data } = await childrenApi.update(id, updateData)
      return data as Child
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['children'] })
      queryClient.invalidateQueries({ queryKey: ['children', variables.id] })
      toast.success('Child profile updated successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update child profile'
      toast.error(message)
    },
  })
}

export function useDeleteChild() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await childrenApi.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] })
      toast.success('Child profile deleted successfully!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete child profile'
      toast.error(message)
    },
  })
}
