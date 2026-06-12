'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  FileQuestion,
  FileText,
  BookMarked,
  Code,
  BarChart3,
  Gift,
  TreePine,
  ChevronLeft,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const parentNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/parent', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Children', href: '/dashboard/parent/children', icon: <Users className="h-5 w-5" /> },
  { label: 'Subjects', href: '/dashboard/parent/subjects', icon: <BookOpen className="h-5 w-5" /> },
  { label: 'Lessons', href: '/dashboard/parent/lessons', icon: <GraduationCap className="h-5 w-5" /> },
  { label: 'Planner', href: '/dashboard/parent/planner', icon: <Calendar className="h-5 w-5" /> },
  { label: 'Quizzes', href: '/dashboard/parent/quizzes', icon: <FileQuestion className="h-5 w-5" /> },
  { label: 'Worksheets', href: '/dashboard/parent/worksheets', icon: <FileText className="h-5 w-5" /> },
  { label: 'Reading Log', href: '/dashboard/parent/reading-log', icon: <BookMarked className="h-5 w-5" /> },
  { label: 'Coding', href: '/dashboard/parent/coding', icon: <Code className="h-5 w-5" /> },
  { label: 'Reports', href: '/dashboard/parent/reports', icon: <BarChart3 className="h-5 w-5" /> },
  { label: 'Rewards', href: '/dashboard/parent/rewards', icon: <Gift className="h-5 w-5" /> },
  { label: 'Oak Academy', href: '/dashboard/parent/oak-academy', icon: <TreePine className="h-5 w-5" /> },
]

const childNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/child', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'My Lessons', href: '/dashboard/child/lessons', icon: <GraduationCap className="h-5 w-5" /> },
  { label: 'My Quizzes', href: '/dashboard/child/quizzes', icon: <FileQuestion className="h-5 w-5" /> },
  { label: 'Worksheets', href: '/dashboard/child/worksheets', icon: <FileText className="h-5 w-5" /> },
  { label: 'Reading Log', href: '/dashboard/child/reading-log', icon: <BookMarked className="h-5 w-5" /> },
  { label: 'Coding', href: '/dashboard/child/coding', icon: <Code className="h-5 w-5" /> },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ collapsed = false, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, isParent, isChild, logout } = useAuth()

  const navItems = isParent ? parentNavItems : isChild ? childNavItems : parentNavItems

  const isActive = (href: string) => {
    if (href === '/dashboard/parent' || href === '/dashboard/child') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-xp">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-heading text-lg font-bold text-sidebar-foreground">
              Homeschool
            </span>
          )}
        </Link>
        {onToggle && (
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive(item.href)
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:h-6 before:w-1 before:rounded-r-full before:bg-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-3">
        {user ? (
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-sidebar-primary/20">
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
              <AvatarFallback className="bg-sidebar-primary/10 text-sidebar-primary text-xs">
                {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.full_name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60 capitalize">
                  {user.role}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={logout}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-muted animate-pulse" />
            {!collapsed && (
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 rounded bg-sidebar-muted animate-pulse" />
                <div className="h-2 w-16 rounded bg-sidebar-muted animate-pulse" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return sidebarContent
}
