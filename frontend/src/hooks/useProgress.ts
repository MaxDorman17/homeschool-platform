'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { progressApi } from '@/services/api'
import { ChildLevel, ChildBadge, Streak, TimelineEvent } from '@/types'
import { toast } from 'sonner'

export function useChildXp(childId: string) {
  return useQuery({
    queryKey: ['progress', childId, 'xp'],
    queryFn: async () => {
      const { data } = await progressApi.getXp(childId)
      return data as { current_xp: number; total_xp_earned: number }
    },
    enabled: !!childId,
  })
}

export function useChildLevel(childId: string) {
  return useQuery({
    queryKey: ['progress', childId, 'level'],
    queryFn: async () => {
      const { data } = await progressApi.getLevel(childId)
      return data as ChildLevel
    },
    enabled: !!childId,
  })
}

export function useChildBadges(childId: string) {
  return useQuery({
    queryKey: ['progress', childId, 'badges'],
    queryFn: async () => {
      const { data } = await progressApi.getBadges(childId)
      return data as ChildBadge[]
    },
    enabled: !!childId,
  })
}

export function useChildStreaks(childId: string) {
  return useQuery({
    queryKey: ['progress', childId, 'streaks'],
    queryFn: async () => {
      const { data } = await progressApi.getStreaks(childId)
      return data as Streak[]
    },
    enabled: !!childId,
  })
}

export function useChildTimeline(childId: string, params?: Record<string, any>) {
  return useQuery({
    queryKey: ['progress', childId, 'timeline', params],
    queryFn: async () => {
      const { data } = await progressApi.getTimeline(childId, params)
      return data as TimelineEvent[]
    },
    enabled: !!childId,
  })
}

export function useAwardXp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ childId, data: awardData }: { childId: string; data: Record<string, any> }) => {
      const { data } = await progressApi.awardXp(childId, awardData)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['progress', variables.childId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`XP awarded! 🎉`)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Failed to award XP'
      toast.error(message)
    },
  })
}

export function useChildProgress(childId: string) {
  const xpQuery = useChildXp(childId)
  const levelQuery = useChildLevel(childId)
  const badgesQuery = useChildBadges(childId)
  const streaksQuery = useChildStreaks(childId)

  return {
    xp: xpQuery.data,
    level: levelQuery.data,
    badges: badgesQuery.data,
    streaks: streaksQuery.data,
    isLoading: xpQuery.isLoading || levelQuery.isLoading || badgesQuery.isLoading || streaksQuery.isLoading,
    isError: xpQuery.isError || levelQuery.isError || badgesQuery.isError || streaksQuery.isError,
    error: xpQuery.error || levelQuery.error || badgesQuery.error || streaksQuery.error,
    refetch: () => {
      xpQuery.refetch()
      levelQuery.refetch()
      badgesQuery.refetch()
      streaksQuery.refetch()
    },
  }
}
