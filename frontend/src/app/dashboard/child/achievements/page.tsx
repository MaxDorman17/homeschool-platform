'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { progressApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Award,
  Lock,
  Sparkles,
  Zap,
  Star,
  Trophy,
  Medal,
  Shield,
  Target,
  BookOpen,
  Flame,
  Gem,
} from 'lucide-react'

const CATEGORIES = ['all', 'academic', 'streak', 'challenge', 'special', 'social']

export default function AchievementsPage() {
  const { user } = useAuth()
  const childId = user?.id || ''
  const [selectedBadge, setSelectedBadge] = useState<any>(null)
  const [category, setCategory] = useState('all')

  const { data: badgesData } = useQuery({
    queryKey: ['badges', childId],
    queryFn: async () => {
      const res = await progressApi.getBadges(childId)
      return res.data
    },
    enabled: !!childId,
  })

  const childrenBadges = Array.isArray(badgesData) ? badgesData : badgesData?.badges || []
  const earnedBadgeIds = new Set(childrenBadges.map((cb: any) => cb.badge_id || cb.badge?.id))

  // Build a list of all possible badges
  const allBadges: any[] = [
    { id: 'first_lesson', name: 'First Steps', description: 'Complete your first lesson', icon: 'BookOpen', category: 'academic', xp_reward: 10, color: '#6366f1' },
    { id: 'five_lessons', name: 'Getting Started', description: 'Complete 5 lessons', icon: 'BookOpen', category: 'academic', xp_reward: 25, color: '#8b5cf6' },
    { id: 'ten_lessons', name: 'Dedicated Learner', description: 'Complete 10 lessons', icon: 'Award', category: 'academic', xp_reward: 50, color: '#ec4899' },
    { id: 'first_quiz', name: 'Quiz Master', description: 'Pass your first quiz', icon: 'Target', category: 'academic', xp_reward: 15, color: '#10b981' },
    { id: 'streak_3', name: 'Three in a Row', description: 'Maintain a 3-day streak', icon: 'Flame', category: 'streak', xp_reward: 20, color: '#f59e0b' },
    { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'Flame', category: 'streak', xp_reward: 50, color: '#f97316' },
    { id: 'streak_30', name: 'Monthly Champion', description: 'Maintain a 30-day streak', icon: 'Flame', category: 'streak', xp_reward: 200, color: '#ef4444' },
    { id: 'level_5', name: 'Rising Star', description: 'Reach Level 5', icon: 'Star', category: 'challenge', xp_reward: 100, color: '#f59e0b' },
    { id: 'level_10', name: 'Super Learner', description: 'Reach Level 10', icon: 'Trophy', category: 'challenge', xp_reward: 250, color: '#8b5cf6' },
    { id: 'first_coding', name: 'Code Explorer', description: 'Complete your first coding project', icon: 'Gem', category: 'special', xp_reward: 30, color: '#14b8a6' },
    { id: 'reading_5', name: 'Bookworm', description: 'Read 5 books', icon: 'BookOpen', category: 'special', xp_reward: 30, color: '#3b82f6' },
    { id: 'all_subjects', name: 'Well Rounded', description: 'Complete lessons in every subject', icon: 'Medal', category: 'challenge', xp_reward: 100, color: '#6366f1' },
    { id: 'perfect_week', name: 'Perfect Week', description: 'Complete all scheduled lessons for a week', icon: 'Star', category: 'challenge', xp_reward: 75, color: '#10b981' },
    { id: 'helper', name: 'Helping Hand', description: 'Help a sibling with their learning', icon: 'Shield', category: 'social', xp_reward: 20, color: '#ec4899' },
  ]

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      BookOpen: <BookOpen className="h-6 w-6" />,
      Award: <Award className="h-6 w-6" />,
      Target: <Target className="h-6 w-6" />,
      Flame: <Flame className="h-6 w-6" />,
      Star: <Star className="h-6 w-6" />,
      Trophy: <Trophy className="h-6 w-6" />,
      Medal: <Medal className="h-6 w-6" />,
      Shield: <Shield className="h-6 w-6" />,
      Gem: <Gem className="h-6 w-6" />,
    }
    return icons[iconName] || <Award className="h-6 w-6" />
  }

  const filteredBadges = category === 'all' ? allBadges : allBadges.filter((b) => b.category === category)

  const earnedBadges = allBadges.filter((b) => earnedBadgeIds.has(b.id))
  const lockedBadges = allBadges.filter((b) => !earnedBadgeIds.has(b.id))

  return (
    <AuthGuard requiredRole="child">
      <AppShell title="Achievements">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">🏆 Achievements</h1>
            <p className="text-muted-foreground">
              {earnedBadges.length} / {allBadges.length} badges earned
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{earnedBadges.length}</p>
                <p className="text-xs text-muted-foreground">Earned</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-400">{lockedBadges.length}</p>
                <p className="text-xs text-muted-foreground">Locked</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round((earnedBadges.length / allBadges.length) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Completion</p>
              </CardContent>
            </Card>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat)}
                className="capitalize"
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {filteredBadges.map((badge) => {
              const earned = earnedBadgeIds.has(badge.id)
              const earnedData = childrenBadges.find((cb: any) => (cb.badge_id || cb.badge?.id) === badge.id)
              return (
                <Card
                  key={badge.id}
                  className={`transition-all cursor-pointer hover:shadow-md ${
                    earned ? 'border-amber-200 dark:border-amber-700' : 'opacity-60'
                  }`}
                  onClick={() => setSelectedBadge({ ...badge, earned, earned_at: earnedData?.awarded_at, earnedData })}
                >
                  <CardContent className="flex flex-col items-center p-4 text-center">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full mb-2 ${
                        earned
                          ? 'bg-gradient-to-br from-amber-300 to-amber-500 shadow-md'
                          : 'bg-muted'
                      }`}
                      style={earned ? {} : { backgroundColor: `${badge.color}15` }}
                    >
                      {earned ? (
                        <div className="text-white">{getIcon(badge.icon)}</div>
                      ) : (
                        <Lock className="h-6 w-6 text-muted-foreground/50" />
                      )}
                    </div>
                    <p className="text-xs font-medium truncate w-full">{badge.name}</p>
                    {earned ? (
                      <Badge variant="default" className="mt-1 text-[10px] h-5 bg-amber-500">Earned</Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1 text-[10px] h-5">Locked</Badge>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Badge Detail Dialog */}
          <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-center">{selectedBadge?.name}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center py-6">
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full mb-4 ${
                    selectedBadge?.earned
                      ? 'bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg'
                      : 'bg-muted'
                  }`}
                >
                  {selectedBadge?.earned ? (
                    <div className="text-white scale-125">{selectedBadge && getIcon(selectedBadge.icon)}</div>
                  ) : (
                    <Lock className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center mb-2">
                  {selectedBadge?.description}
                </p>
                <Badge variant="outline" className="capitalize mb-3">{selectedBadge?.category}</Badge>
                <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
                  <Zap className="h-4 w-4" />
                  +{selectedBadge?.xp_reward} XP
                </div>
                {selectedBadge?.earned_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Earned on {new Date(selectedBadge.earned_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </AuthGuard>
  )
}
