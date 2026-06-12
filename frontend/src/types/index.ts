export type UserRole = 'parent' | 'child' | 'admin'

export interface User {
  id: string
  email: string
  username: string
  full_name: string
  role: UserRole
  avatar_url?: string
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface Child {
  id: string
  parent_id: string
  username: string
  display_name: string
  avatar_url: string
  pin_code?: string
  date_of_birth?: string
  grade_level?: string
  is_active: boolean
  created_at: string
}

export interface Subject {
  id: string
  parent_id: string
  name: string
  description?: string
  color: string
  icon: string
  display_order: number
  is_active: boolean
  created_at: string
}

export interface Lesson {
  id: string
  parent_id: string
  subject_id: string
  title: string
  description?: string
  content?: string
  notes?: string
  duration_minutes: number
  difficulty: string
  resource_url?: string
  resource_type?: string
  video_url?: string
  objectives: string[]
  materials_needed: string[]
  display_order: number
  status: string
  created_at: string
  subject?: Subject
}

export interface LessonAssignment {
  id: string
  lesson_id: string
  child_id: string
  assigned_date: string
  due_date?: string
  scheduled_date?: string
  scheduled_slot?: number
  status: 'pending' | 'in_progress' | 'completed' | 'partially_completed' | 'missed' | 'rolled_over'
  completed_at?: string
  time_spent_minutes?: number
  score?: number
  is_extra_credit: boolean
  lesson?: Lesson
  child?: Child
}

export interface PlannerEntry {
  id: string
  child_id: string
  date: string
  slot_number: number
  lesson_assignment_id?: string
  title?: string
  entry_type: 'lesson' | 'quiz' | 'worksheet' | 'reading' | 'coding' | 'break' | 'activity'
  notes?: string
  is_recurring: boolean
  lesson_assignment?: LessonAssignment
}

export interface Attendance {
  id: string
  child_id: string
  date: string
  status: 'present' | 'completed' | 'partially_completed' | 'missed' | 'excused' | 'holiday'
  check_in_time?: string
  check_out_time?: string
  total_minutes?: number
  notes?: string
}

export interface Quiz {
  id: string
  parent_id: string
  subject_id?: string
  title: string
  description?: string
  instructions?: string
  time_limit_minutes: number
  passing_score: number
  max_attempts: number
  is_randomized: boolean
  show_results: boolean
  difficulty: string
  status: string
  questions?: QuizQuestion[]
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'matching' | 'drag_drop' | 'essay'
  question_text: string
  options?: string[]
  correct_answer?: string
  correct_answers?: string[]
  explanation?: string
  points: number
  image_url?: string
  display_order: number
}

export interface QuizAssignment {
  id: string
  quiz_id: string
  child_id: string
  assigned_date: string
  due_date?: string
  status: 'pending' | 'in_progress' | 'completed'
  score?: number
  total_points: number
  earned_points: number
  attempts_used: number
  completed_at?: string
  quiz?: Quiz
}

export interface Worksheet {
  id: string
  parent_id: string
  subject_id?: string
  title: string
  description?: string
  file_path?: string
  file_type?: string
  file_size?: number
  is_interactive: boolean
  worksheet_type: 'upload' | 'interactive' | 'oak_imported'
  interactive_data?: any
  status: string
}

export interface WorksheetAssignment {
  id: string
  worksheet_id: string
  child_id: string
  assigned_date: string
  due_date?: string
  status: 'pending' | 'in_progress' | 'completed'
  score?: number
  time_spent_minutes?: number
  completed_at?: string
  worksheet?: Worksheet
}

export interface Level {
  id: number
  level_number: number
  name: string
  title: string
  min_xp: number
  max_xp?: number
  icon: string
  color: string
  description?: string
}

export interface ChildLevel {
  id: string
  child_id: string
  level_id: number
  current_xp: number
  total_xp_earned: number
  xp_to_next_level?: number
  is_current: boolean
  achieved_at: string
  level?: Level
}

export interface Badge {
  id: string
  name: string
  description?: string
  icon: string
  category: string
  xp_reward: number
  color: string
  is_hidden: boolean
}

export interface ChildBadge {
  id: string
  child_id: string
  badge_id: string
  awarded_at: string
  badge?: Badge
}

export interface Streak {
  id: string
  child_id: string
  streak_type: 'daily_learning' | 'reading' | 'coding' | 'science' | 'math'
  current_streak: number
  longest_streak: number
  last_activity_date?: string
}

export interface RewardConfig {
  id: string
  parent_id: string
  child_id: string
  reward_type: 'weekly' | 'monthly' | 'quarterly' | 'custom'
  target_percentage: number
  reward_amount: number
  reward_currency: string
  reward_name?: string
  is_active: boolean
}

export interface RewardHistory {
  id: string
  child_id: string
  period_start: string
  period_end: string
  completion_percentage: number
  reward_earned: number
  reward_paid: boolean
  paid_at?: string
}

export interface ReadingLog {
  id: string
  child_id: string
  book_title: string
  author?: string
  pages?: number
  pages_read: number
  start_date: string
  finish_date?: string
  rating?: number
  notes?: string
  is_completed: boolean
}

export interface TimelineEvent {
  id: string
  child_id: string
  event_type: string
  title: string
  description?: string
  xp_earned: number
  icon?: string
  color?: string
  metadata?: any
  event_date: string
  created_at: string
}

export interface CodingProject {
  id: string
  parent_id: string
  child_id?: string
  title: string
  description?: string
  language: 'html' | 'css' | 'javascript' | 'python' | 'scratch'
  difficulty: string
  instructions?: string
  starter_code?: string
  xp_reward: number
  is_active: boolean
}

export interface ExtraCreditTask {
  id: string
  parent_id: string
  child_id: string
  subject_id?: string
  title: string
  description?: string
  xp_reward: number
  task_type: string
  instructions?: string
  due_date?: string
  is_completed: boolean
  completed_at?: string
}

export interface ParentDashboard {
  children_overview: ChildDashboardSummary[]
  upcoming_lessons: LessonAssignment[]
  recent_achievements: TimelineEvent[]
  attendance_stats: AttendanceStats
  reward_tracking: any[]
}

export interface ChildDashboardSummary {
  child: Child
  current_level?: Level
  current_xp: number
  total_xp: number
  streak: number
  badges_count: number
  completion_rate: number
}

export interface ChildDashboard {
  todays_lessons: LessonAssignment[]
  current_streak: number
  xp_total: number
  current_level: Level
  badges: ChildBadge[]
  monthly_reward_progress: number
  projected_reward: number
  recent_events: TimelineEvent[]
}

export interface AttendanceStats {
  total_days: number
  completed: number
  partially_completed: number
  missed: number
  excused: number
  completion_rate: number
}

export interface ReportData {
  period: string
  lessons_completed: number
  quizzes_completed: number
  worksheets_completed: number
  books_read: number
  total_xp_earned: number
  attendance_rate: number
  subject_breakdown: SubjectPerformance[]
  daily_activity: DailyActivity[]
}

export interface SubjectPerformance {
  subject_name: string
  subject_color: string
  total_lessons: number
  completed_lessons: number
  completion_rate: number
  quiz_scores: number
}

export interface DailyActivity {
  date: string
  lessons_completed: number
  xp_earned: number
  minutes_spent: number
}
