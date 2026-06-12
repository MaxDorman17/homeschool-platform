'use client'

import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/services/api'
import { ReportData, SubjectPerformance, AttendanceStats } from '@/types'

export function useDailyReport(childId: string, date: string) {
  return useQuery({
    queryKey: ['reports', 'daily', childId, date],
    queryFn: async () => {
      const { data } = await reportsApi.getDaily(childId, date)
      return data as ReportData
    },
    enabled: !!childId && !!date,
  })
}

export function useWeeklyReport(childId: string, weekStart: string) {
  return useQuery({
    queryKey: ['reports', 'weekly', childId, weekStart],
    queryFn: async () => {
      const { data } = await reportsApi.getWeekly(childId, weekStart)
      return data as ReportData
    },
    enabled: !!childId && !!weekStart,
  })
}

export function useMonthlyReport(childId: string, month: string) {
  return useQuery({
    queryKey: ['reports', 'monthly', childId, month],
    queryFn: async () => {
      const { data } = await reportsApi.getMonthly(childId, month)
      return data as ReportData
    },
    enabled: !!childId && !!month,
  })
}

export function useSubjectPerformance(childId: string) {
  return useQuery({
    queryKey: ['reports', 'subject-performance', childId],
    queryFn: async () => {
      const { data } = await reportsApi.getSubjectPerformance(childId)
      return data as SubjectPerformance[]
    },
    enabled: !!childId,
  })
}

export function useAttendanceTrends(childId: string) {
  return useQuery({
    queryKey: ['reports', 'attendance-trends', childId],
    queryFn: async () => {
      const { data } = await reportsApi.getAttendanceTrends(childId)
      return data as AttendanceStats[]
    },
    enabled: !!childId,
  })
}

export function useCompletionRates(childId: string) {
  return useQuery({
    queryKey: ['reports', 'completion-rates', childId],
    queryFn: async () => {
      const { data } = await reportsApi.getCompletionRates(childId)
      return data as Record<string, number>
    },
    enabled: !!childId,
  })
}

export function useChildReports(childId: string, period: 'daily' | 'weekly' | 'monthly', dateOrMonth: string) {
  const dailyReport = useDailyReport(childId, period === 'daily' ? dateOrMonth : '')
  const weeklyReport = useWeeklyReport(childId, period === 'weekly' ? dateOrMonth : '')
  const monthlyReport = useMonthlyReport(childId, period === 'monthly' ? dateOrMonth : '')

  return period === 'daily' ? dailyReport
    : period === 'weekly' ? weeklyReport
    : monthlyReport
}
