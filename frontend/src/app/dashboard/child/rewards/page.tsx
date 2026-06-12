'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { rewardsApi, progressApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Gift,
  Trophy,
  TrendingUp,
  Calendar,
  Sparkles,
  Star,
} from 'lucide-react'
import { format } from 'date-fns'

export default function ChildRewardsPage() {
  const { data: currentData, isLoading: loadingCurrent } = useQuery({
    queryKey: ['child-reward-current', 'me'],
    queryFn: () => rewardsApi.getCurrent('me'),
  })

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['child-reward-history', 'me'],
    queryFn: () => rewardsApi.getHistory('me'),
  })

  const current = currentData?.data
  const history = historyData?.data || []
  const isLoading = loadingCurrent || loadingHistory

  if (isLoading) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  const completionPercent = current?.completion_percentage || 0
  const projectedReward = current?.projected_reward || 0
  const rewardAmount = current?.reward_config?.reward_amount || 45

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">My Rewards</h1>
            <p className="text-muted-foreground">Keep learning to earn your rewards!</p>
          </div>

          {/* Current Reward Progress */}
          <Card className="border-2 border-primary/20 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500" />
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                    <Gift className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Monthly Reward</h2>
                    <p className="text-sm text-muted-foreground">
                      Complete {current?.reward_config?.target_percentage || 75}% of lessons to earn £{rewardAmount}
                    </p>
                  </div>
                </div>
                <Badge className="text-lg px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
                  £{projectedReward.toFixed(2)}
                </Badge>
              </div>

              {/* Circular progress */}
              <div className="flex justify-center py-4">
                <div className="relative h-40 w-40">
                  <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/20"
                    />
                    <circle
                      cx="50" cy="50" r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${completionPercent * 2.827} 282.7`}
                      className="text-primary transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{Math.round(completionPercent)}%</span>
                    <span className="text-xs text-muted-foreground">complete</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Progress to target</span>
                  <span className="font-medium">{Math.round(completionPercent)}% / {current?.reward_config?.target_percentage || 75}%</span>
                </div>
                <Progress value={completionPercent} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Projected reward</span>
                  <span className="font-semibold text-foreground">£{projectedReward.toFixed(2)}</span>
                </div>
              </div>

              {completionPercent >= (current?.reward_config?.target_percentage || 75) && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                  <Sparkles className="h-6 w-6 mx-auto text-green-500 mb-2" />
                  <p className="font-semibold text-green-700 dark:text-green-300">
                    🎉 You&apos;re on track to earn your reward! Keep going!
                  </p>
                </div>
              )}

              {completionPercent < 25 && (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Complete more lessons to start earning towards your reward!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Monthly History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No reward history yet. Start completing lessons!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry: any) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {format(new Date(entry.period_start), 'MMM d')} - {format(new Date(entry.period_end), 'MMM d, yyyy')}
                        </p>
                        <div className="flex items-center gap-2">
                          <Progress value={entry.completion_percentage} className="h-2 w-32" />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(entry.completion_percentage)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">£{Number(entry.reward_earned).toFixed(2)}</p>
                        <Badge variant={entry.reward_paid ? 'default' : 'secondary'} className="text-xs">
                          {entry.reward_paid ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Motivation */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6 text-center space-y-2">
              <Trophy className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-semibold text-lg">Keep up the great work!</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Every lesson, quiz, and worksheet you complete brings you closer to your goal. 
                Stay consistent and you&apos;ll reach your reward in no time!
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
