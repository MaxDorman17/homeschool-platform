'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plannerApi } from '@/services/api'
import { PlannerEntry } from '@/types'
import { toast } from 'sonner'

export function useDailyPlanner(childId: string, date: string) {
  return useQuery({
    queryKey: ['planner', 'daily', childId, date],
    queryFn: async () => {
      const { data } = await plannerApi.getDaily(childId, date)
      return data as PlannerEntry[]
    },
    enabled: !!childId && !!date,
  })
}

export function useWeeklyPlanner(childId: string, weekStart: string) {
  return useQuery({
    queryKey: ['planner', 'weekly', childId, weekStart],
    queryFn: async () => {
      const { data } = await plannerApi.getWeekly(childId, weekStart)
      return data as PlannerEntry[]
    },
    enabled: !!childId && !!weekStart,
  })
}

export function useMonthlyPlanner(childId: string, month: string) {
  return useQuery({
    queryKey: ['planner', 'monthly', childId, month],
    queryFn: async () => {
      const { data } = await plannerApi.getMonthly(childId, month)
      return data as PlannerEntry[]
    },
    enabled: !!childId && !!month,
  })
}

export function useCreatePlannerEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entryData: Partial<PlannerEntry>) => {
      const { data } = await plannerApi.createEntry(entryData)
      return data as PlannerEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.success('Planner entry created!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to create planner entry'
      toast.error(message)
    },
  })
}

export function useUpdatePlannerEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<PlannerEntry> }) => {
      const { data } = await plannerApi.updateEntry(id, updateData)
      return data as PlannerEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.success('Planner entry updated!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to update planner entry'
      toast.error(message)
    },
  })
}

export function useDeletePlannerEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await plannerApi.deleteEntry(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.success('Planner entry deleted!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to delete planner entry'
      toast.error(message)
    },
  })
}

export function useRearrangePlanner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rearrangeData: Record<string, any>) => {
      const { data } = await plannerApi.rearrange(rearrangeData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      toast.success('Planner rearranged!')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to rearrange planner'
      toast.error(message)
    },
  })
}
