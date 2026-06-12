'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, childrenApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import {
  BookOpen,
  FileQuestion,
  Award,
  TrendingUp,
  BookMarked,
  Calendar,
  Download,
  Printer,
  User,
  BarChart3,
  PieChartIcon,
  LineChart as LineChartIcon,
  CheckCircle2,
} from 'lucide-react'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

const DATE_RANGES = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
]

export default function ReportsAnalytics() {
  const [selectedChildId, setSelectedChildId] = useState('')
  const [dateRange, setDateRange] = useState('30')
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('weekly')

  const { data: childrenData } = useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const res = await childrenApi.list()
      return res.data
    },
  })

  const children = Array.isArray(childrenData) ? childrenData : childrenData?.children || []

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports', selectedChildId, reportType, dateRange],
    queryFn: async () => {
      if (!selectedChildId) return null
      const now = new Date()
      let dateParam = ''
      if (reportType === 'daily') dateParam = now.toISOString().split('T')[0]
      else if (reportType === 'weekly') {
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        dateParam = weekStart.toISOString().split('T')[0]
      } else {
        dateParam = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      }

      let res
      if (reportType === 'daily') res = await reportsApi.getDaily(selectedChildId, dateParam)
      else if (reportType === 'weekly') res = await reportsApi.getWeekly(selectedChildId, dateParam)
      else res = await reportsApi.getMonthly(selectedChildId, dateParam)
      return res.data
    },
    enabled: !!selectedChildId,
  })

  const { data: subjectData } = useQuery({
    queryKey: ['subject-performance', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return []
      const res = await reportsApi.getSubjectPerformance(selectedChildId)
      return res.data
    },
    enabled: !!selectedChildId,
  })

  const { data: attendanceData } = useQuery({
    queryKey: ['attendance-trends', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return []
      const res = await reportsApi.getAttendanceTrends(selectedChildId)
      return res.data
    },
    enabled: !!selectedChildId,
  })

  const subjectPerformance = Array.isArray(subjectData) ? subjectData : subjectData?.subjects || []
  const attendanceTrends = Array.isArray(attendanceData) ? attendanceData : []

  const weeklyActivity = reportData?.daily_activity || []
  const xpData = weeklyActivity.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    xp: d.xp_earned || 0,
    minutes: d.minutes_spent || 0,
  }))

  const donutData = subjectPerformance.length > 0
    ? subjectPerformance.map((s: any) => ({
        name: s.subject_name,
        value: s.completion_rate || 0,
      }))
    : [{ name: 'No Data', value: 100 }]

  const handlePrint = () => window.print()

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Reports">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
              <p className="text-muted-foreground">Track progress and performance</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-1.5 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="w-[200px]">
                <User className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1 rounded-lg border p-0.5">
              {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                <Button
                  key={type}
                  variant={reportType === type ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setReportType(type)}
                  className="capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {!selectedChildId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20">
                <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">Select a child to view reports</p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Lessons Completed</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{reportData?.lessons_completed || 0}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Quizzes Passed</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{reportData?.quizzes_completed || 0}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">XP Earned</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{reportData?.total_xp_earned || 0}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Attendance</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{reportData?.attendance_rate ? `${Math.round(reportData.attendance_rate)}%` : '--'}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Books Read</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{reportData?.books_read || 0}</p></CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Subject Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Subject Performance
                    </CardTitle>
                    <CardDescription>Completion rate by subject</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {subjectPerformance.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No subject data yet</p>
                    ) : (
                      <div className="space-y-4">
                        {subjectPerformance.map((s: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.subject_color || CHART_COLORS[idx % CHART_COLORS.length] }} />
                                <span>{s.subject_name}</span>
                              </div>
                              <span className="font-medium">{Math.round(s.completion_rate || 0)}%</span>
                            </div>
                            <Progress value={s.completion_rate || 0} className="h-2" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* XP Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      XP Trend
                    </CardTitle>
                    <CardDescription>XP earned over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={xpData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))' }} />
                        <Line type="monotone" dataKey="xp" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Attendance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                      Attendance
                    </CardTitle>
                    <CardDescription>Present / Partial / Missed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {attendanceTrends.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No attendance data yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={attendanceTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))' }} />
                          <Bar dataKey="present" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="partial" stackId="a" fill="#f59e0b" />
                          <Bar dataKey="missed" stackId="a" fill="#ef4444" radius={[0, 0, 4, 4]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Completion Rate Donut */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <PieChartIcon className="h-5 w-5 text-primary" />
                      Overall Completion
                    </CardTitle>
                    <CardDescription>Total completion rate</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {donutData.map((_: any, idx: number) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {donutData.map((d: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <span className="text-muted-foreground">{d.name}</span>
                          <span className="font-medium">{Math.round(d.value)}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  )
}
