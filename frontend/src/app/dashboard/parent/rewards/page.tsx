'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rewardsApi, childrenApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
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
  Gift,
  Target,
  DollarSign,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Edit3,
  Trash2,
  Plus,
  User,
  PiggyBank,
} from 'lucide-react'
import { toast } from 'sonner'

export default function RewardsManagement() {
  const queryClient = useQueryClient()
  const [selectedChildId, setSelectedChildId] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<any>(null)
  const [form, setForm] = useState({
    target_percentage: 75,
    reward_amount: 30,
    reward_type: 'monthly' as string,
    reward_name: '',
    is_active: true,
  })

  const getTieredReward = (completionPct: number) => {
    if (completionPct >= 90) return 40
    if (completionPct >= 75) return 30
    if (completionPct >= 50) return 15
    return 0
  }

  const TIERS = [
    { range: '0-49%', amount: '$0', color: 'text-red-500', label: 'No reward' },
    { range: '50-74%', amount: '$15', color: 'text-yellow-500', label: 'Half reward' },
    { range: '75-89%', amount: '$30', color: 'text-green-500', label: 'Full reward' },
    { range: '90-100%', amount: '$40', color: 'text-emerald-500', label: 'Bonus tier! 🎉' },
  ]

  const { data: childrenData } = useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const res = await childrenApi.list()
      return res.data
    },
  })

  const children = Array.isArray(childrenData) ? childrenData : childrenData?.children || []

  const { data: configsData } = useQuery({
    queryKey: ['reward-configs'],
    queryFn: async () => {
      const res = await rewardsApi.getConfigs()
      return res.data
    },
  })

  const configs = Array.isArray(configsData) ? configsData : configsData?.configs || []

  const currentConfig = configs.find((c: any) => c.child_id === selectedChildId)

  const { data: currentData } = useQuery({
    queryKey: ['reward-current', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return null
      const res = await rewardsApi.getCurrent(selectedChildId)
      return res.data
    },
    enabled: !!selectedChildId,
  })

  const { data: historyData } = useQuery({
    queryKey: ['reward-history', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return []
      const res = await rewardsApi.getHistory(selectedChildId)
      return res.data
    },
    enabled: !!selectedChildId,
  })

  const history = Array.isArray(historyData) ? historyData : []

  const createMutation = useMutation({
    mutationFn: (data: any) => rewardsApi.createConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-configs'] })
      queryClient.invalidateQueries({ queryKey: ['reward-current'] })
      toast.success('Reward config created!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create reward config'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      rewardsApi.updateConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-configs'] })
      queryClient.invalidateQueries({ queryKey: ['reward-current'] })
      toast.success('Reward config updated!')
      closeDialog()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rewardsApi.deleteConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-configs'] })
      toast.success('Reward config deleted')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to delete'),
  })

  const openCreate = () => {
    setEditingConfig(null)
    setForm({
      target_percentage: 75,
      reward_amount: 30,
      reward_type: 'monthly',
      reward_name: '',
      is_active: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (config: any) => {
    setEditingConfig(config)
    setForm({
      target_percentage: config.target_percentage || 80,
      reward_amount: config.reward_amount || 10,
      reward_type: config.reward_type || 'monthly',
      reward_name: config.reward_name || '',
      is_active: config.is_active ?? true,
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingConfig(null)
  }

  const handleSubmit = () => {
    const payload = {
      child_id: selectedChildId,
      ...form,
    }
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data: form })
    } else {
      createMutation.mutate(payload)
    }
  }

  const child = children.find((c: any) => c.id === selectedChildId)

  return (
    <AuthGuard requiredRole="parent">
      <AppShell title="Rewards">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Rewards</h1>
              <p className="text-muted-foreground">Configure rewards to motivate your children</p>
            </div>
          </div>

          {/* Child Selector */}
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
              <Button onClick={openCreate} variant={currentConfig ? 'outline' : 'default'}>
                <Plus className="mr-1.5 h-4 w-4" />
                {currentConfig ? 'Edit Config' : 'Create Reward Config'}
              </Button>
            )}
          </div>

          {!selectedChildId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Gift className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">Select a child to view and configure rewards</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Current Reward Config & Progress */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Config Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Reward Configuration
                    </CardTitle>
                    <CardDescription>{child?.display_name}&apos;s reward settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentConfig ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Status</span>
                          <Badge variant={currentConfig.is_active ? 'default' : 'secondary'}>
                            {currentConfig.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Target Completion</span>
                          <span className="text-sm">{currentConfig.target_percentage}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Reward Amount</span>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            ${currentConfig.reward_amount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Frequency</span>
                          <Badge variant="outline" className="capitalize">{currentConfig.reward_type}</Badge>
                        </div>
                        {currentConfig.reward_name && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Reward Name</span>
                            <span className="text-sm">{currentConfig.reward_name}</span>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(currentConfig)}>
                            <Edit3 className="mr-1.5 h-4 w-4" />
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" className="flex-1" onClick={() => {
                            if (window.confirm('Delete reward config?')) deleteMutation.mutate(currentConfig.id)
                          }}>
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <PiggyBank className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No reward configuration yet</p>
                        <Button onClick={openCreate}>
                          <Plus className="mr-1.5 h-4 w-4" />
                          Create Reward Config
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Current Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Current Progress
                    </CardTitle>
                    <CardDescription>This {currentConfig?.reward_type || 'month'}&apos;s progress</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentData ? (
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="relative mx-auto mb-3 flex h-28 w-28 items-center justify-center">
                            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
                              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                              <circle
                                cx="60" cy="60" r="52"
                                fill="none"
                                stroke="hsl(var(--primary))"
                                strokeWidth="8"
                                strokeDasharray={`${2 * Math.PI * 52}`}
                                strokeDashoffset={`${2 * Math.PI * 52 * (1 - (currentData.completion_percentage || 0) / 100)}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-2xl font-bold">
                              {Math.round(currentData.completion_percentage || 0)}%
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">Completion</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress to target</span>
                            <span className="font-medium">{Math.round(currentData.completion_percentage || 0)}% / {currentConfig?.target_percentage || 80}%</span>
                          </div>
                          <Progress value={(currentData.completion_percentage || 0) / (currentConfig?.target_percentage || 80) * 100} className="h-2.5" />
                        </div>
                        <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 text-center">
                          <p className="text-sm text-muted-foreground">Projected Reward</p>
                          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                            ${getTieredReward(currentData.completion_percentage || 0)}
                          </p>
                          {(currentData.completion_percentage || 0) >= 75 ? (
                            <Badge className="mt-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              ✅ Full reward unlocked!
                            </Badge>
                          ) : (currentData.completion_percentage || 0) >= 50 ? (
                            <Badge className="mt-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                              ⚡ Half reward available
                            </Badge>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">Need 50%+ to unlock reward</p>
                          )}
                        </div>

                        {/* Tiered Rewards Explanation */}
                        <div className="rounded-lg border p-4">
                          <p className="text-sm font-medium mb-3">Reward Tiers</p>
                          <div className="space-y-2">
                            {TIERS.map((tier) => (
                              <div key={tier.range} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`w-3 h-3 rounded-full ${
                                    tier.amount === '$0' ? 'bg-red-400' :
                                    tier.amount === '$15' ? 'bg-yellow-400' :
                                    tier.amount === '$30' ? 'bg-green-400' :
                                    'bg-emerald-400'
                                  }`} />
                                  <span>{tier.range}</span>
                                </div>
                                <span className={`font-semibold ${tier.color}`}>
                                  {tier.amount} {tier.label && <span className="text-xs text-muted-foreground font-normal">— {tier.label}</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10">
                        <p className="text-sm text-muted-foreground">No progress data yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* History Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Reward History
                  </CardTitle>
                  <CardDescription>Past reward periods and payouts</CardDescription>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <Calendar className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No reward history yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="py-3 text-left font-medium text-muted-foreground">Period</th>
                            <th className="py-3 text-left font-medium text-muted-foreground">Completion %</th>
                            <th className="py-3 text-left font-medium text-muted-foreground">Reward Earned</th>
                            <th className="py-3 text-left font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((entry: any, idx: number) => (
                            <tr key={entry.id || idx} className="border-b last:border-0">
                              <td className="py-3">
                                {new Date(entry.period_start).toLocaleDateString()} - {new Date(entry.period_end).toLocaleDateString()}
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <Progress value={entry.completion_percentage || 0} className="h-2 w-20" />
                                  <span className="font-medium">{Math.round(entry.completion_percentage || 0)}%</span>
                                </div>
                              </td>
                              <td className="py-3 font-semibold text-green-600 dark:text-green-400">
                                ${entry.reward_earned || 0}
                              </td>
                              <td className="py-3">
                                <Badge variant={entry.reward_paid ? 'default' : 'secondary'}>
                                  {entry.reward_paid ? 'Paid' : 'Pending'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingConfig ? 'Edit Reward Config' : 'Create Reward Config'}</DialogTitle>
                <DialogDescription>Set up rewards for {child?.display_name}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Target Completion: {form.target_percentage}%</Label>
                  <Slider
                    value={[form.target_percentage]}
                    onValueChange={([v]) => setForm({ ...form, target_percentage: v })}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Reward Amount ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.reward_amount}
                    onChange={(e) => setForm({ ...form, reward_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Reward Name (optional)</Label>
                  <Input
                    value={form.reward_name}
                    onChange={(e) => setForm({ ...form, reward_name: e.target.value })}
                    placeholder="e.g. Weekly Allowance"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Select value={form.reward_type} onValueChange={(v) => setForm({ ...form, reward_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm font-medium">Active</Label>
                    <p className="text-xs text-muted-foreground">Enable this reward configuration</p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingConfig ? 'Save Changes' : 'Create Config'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
