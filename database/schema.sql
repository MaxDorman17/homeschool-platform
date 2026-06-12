-- ============================================================================
-- Homeschool Learning Platform - Complete PostgreSQL Schema
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('parent', 'child', 'admin')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token UUID,
    reset_token UUID,
    reset_token_expires TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500),
    device_info TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- CHILDREN MANAGEMENT
-- ============================================================================

CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT DEFAULT '/images/avatars/default.png',
    pin_code VARCHAR(6),
    date_of_birth DATE,
    grade_level VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, username)
);

CREATE INDEX idx_children_parent ON children(parent_id);

-- ============================================================================
-- SUBJECTS
-- ============================================================================

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366F1',
    icon VARCHAR(50) DEFAULT 'book',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subjects_parent ON subjects(parent_id);

-- ============================================================================
-- LESSONS
-- ============================================================================

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    notes TEXT,
    duration_minutes INTEGER DEFAULT 30,
    difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    resource_url TEXT,
    resource_type VARCHAR(50),
    video_url TEXT,
    objectives JSONB DEFAULT '[]',
    materials_needed JSONB DEFAULT '[]',
    completion_criteria TEXT,
    is_interactive BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lessons_subject ON lessons(subject_id);
CREATE INDEX idx_lessons_parent ON lessons(parent_id);
CREATE INDEX idx_lessons_status ON lessons(status);

-- ============================================================================
-- LESSON ASSIGNMENTS (links lessons to children)
-- ============================================================================

CREATE TABLE lesson_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    due_date DATE,
    scheduled_date DATE,
    scheduled_slot SMALLINT CHECK (scheduled_slot BETWEEN 1 AND 6),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'partially_completed', 'missed', 'rolled_over')),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    parent_notes TEXT,
    time_spent_minutes INTEGER,
    score DECIMAL(5,2),
    is_extra_credit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id, child_id, assigned_date)
);

CREATE INDEX idx_lesson_assignments_child ON lesson_assignments(child_id);
CREATE INDEX idx_lesson_assignments_date ON lesson_assignments(assigned_date);
CREATE INDEX idx_lesson_assignments_status ON lesson_assignments(status);

-- ============================================================================
-- PLANNER
-- ============================================================================

CREATE TABLE planner_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    slot_number SMALLINT CHECK (slot_number BETWEEN 1 AND 8),
    lesson_assignment_id UUID REFERENCES lesson_assignments(id) ON DELETE SET NULL,
    title VARCHAR(255),
    entry_type VARCHAR(20) DEFAULT 'lesson' CHECK (entry_type IN ('lesson', 'quiz', 'worksheet', 'reading', 'coding', 'break', 'activity')),
    notes TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, date, slot_number)
);

CREATE INDEX idx_planner_child_date ON planner_entries(child_id, date);

-- ============================================================================
-- ATTENDANCE
-- ============================================================================

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'completed', 'partially_completed', 'missed', 'excused', 'holiday')),
    check_in_time TIME,
    check_out_time TIME,
    total_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, date)
);

CREATE INDEX idx_attendance_child ON attendance(child_id);
CREATE INDEX idx_attendance_date ON attendance(date);

-- ============================================================================
-- QUIZZES
-- ============================================================================

CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    time_limit_minutes INTEGER DEFAULT 0,
    passing_score DECIMAL(5,2) DEFAULT 70.00,
    max_attempts INTEGER DEFAULT 3,
    is_randomized BOOLEAN DEFAULT FALSE,
    show_results BOOLEAN DEFAULT TRUE,
    difficulty VARCHAR(20) DEFAULT 'beginner',
    imported_from_oak BOOLEAN DEFAULT FALSE,
    oak_lesson_slug VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_type VARCHAR(30) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'matching', 'drag_drop', 'essay')),
    question_text TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT,
    correct_answers JSONB,
    explanation TEXT,
    points INTEGER DEFAULT 10,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);

CREATE TABLE quiz_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    score DECIMAL(5,2),
    total_points INTEGER,
    earned_points INTEGER,
    time_spent_minutes INTEGER,
    attempts_used INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_assignment_id UUID NOT NULL REFERENCES quiz_assignments(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    score DECIMAL(5,2),
    total_questions INTEGER,
    correct_answers INTEGER,
    answers JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_assignments_child ON quiz_assignments(child_id);
CREATE INDEX idx_quiz_attempts_assignment ON quiz_attempts(quiz_assignment_id);

-- ============================================================================
-- WORKSHEETS
-- ============================================================================

CREATE TABLE worksheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT,
    file_type VARCHAR(50),
    file_size BIGINT,
    is_interactive BOOLEAN DEFAULT FALSE,
    worksheet_type VARCHAR(30) DEFAULT 'upload' CHECK (worksheet_type IN ('upload', 'interactive', 'oak_imported')),
    imported_from_oak BOOLEAN DEFAULT FALSE,
    oak_lesson_slug VARCHAR(255),
    interactive_data JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE worksheet_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    score DECIMAL(5,2),
    answers JSONB,
    time_spent_minutes INTEGER,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- XP & LEVELS
-- ============================================================================

CREATE TABLE xp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    source VARCHAR(50) NOT NULL CHECK (source IN ('lesson', 'quiz', 'worksheet', 'reading', 'coding', 'extra_credit', 'streak_bonus', 'achievement', 'daily_bonus', 'other')),
    source_id UUID,
    description TEXT,
    awarded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_events_child ON xp_events(child_id);
CREATE INDEX idx_xp_events_awarded ON xp_events(awarded_at);

CREATE TABLE levels (
    id SERIAL PRIMARY KEY,
    level_number INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    min_xp INTEGER NOT NULL,
    max_xp INTEGER,
    icon VARCHAR(50) DEFAULT 'star',
    color VARCHAR(7) DEFAULT '#6366F1',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE child_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    current_xp INTEGER DEFAULT 0,
    total_xp_earned INTEGER DEFAULT 0,
    xp_to_next_level INTEGER,
    is_current BOOLEAN DEFAULT TRUE,
    achieved_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, level_id)
);

CREATE INDEX idx_child_levels_child ON child_levels(child_id);

-- ============================================================================
-- BADGES
-- ============================================================================

CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'badge',
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'lesson', 'quiz', 'worksheet', 'reading', 'coding', 'streak', 'science', 'math', 'language', 'achievement', 'special')),
    requirement_type VARCHAR(50),
    requirement_value INTEGER,
    xp_reward INTEGER DEFAULT 0,
    color VARCHAR(7) DEFAULT '#F59E0B',
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE child_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    context JSONB,
    UNIQUE(child_id, badge_id)
);

CREATE INDEX idx_child_badges_child ON child_badges(child_id);

-- ============================================================================
-- STREAKS
-- ============================================================================

CREATE TABLE streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    streak_type VARCHAR(30) NOT NULL CHECK (streak_type IN ('daily_learning', 'reading', 'coding', 'science', 'math')),
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, streak_type)
);

CREATE INDEX idx_streaks_child ON streaks(child_id);

-- ============================================================================
-- REWARDS
-- ============================================================================

CREATE TABLE reward_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    reward_type VARCHAR(30) DEFAULT 'monthly' CHECK (reward_type IN ('weekly', 'monthly', 'quarterly', 'custom')),
    target_percentage DECIMAL(5,2) DEFAULT 75.00,
    reward_amount DECIMAL(10,2) DEFAULT 45.00,
    reward_currency VARCHAR(10) DEFAULT 'GBP',
    reward_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, child_id, reward_type)
);

CREATE TABLE reward_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    reward_config_id UUID REFERENCES reward_configs(id) ON DELETE SET NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    completion_percentage DECIMAL(5,2),
    reward_earned DECIMAL(10,2) DEFAULT 0.00,
    reward_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reward_history_child ON reward_history(child_id);

-- ============================================================================
-- READING LOG
-- ============================================================================

CREATE TABLE reading_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    book_title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    pages INTEGER,
    pages_read INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    finish_date DATE,
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reading_log_child ON reading_log(child_id);

-- ============================================================================
-- CODING PROJECTS
-- ============================================================================

CREATE TABLE coding_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(30) NOT NULL CHECK (language IN ('html', 'css', 'javascript', 'python', 'scratch')),
    difficulty VARCHAR(20) DEFAULT 'beginner',
    instructions TEXT,
    starter_code TEXT,
    solution_code TEXT,
    test_cases JSONB,
    xp_reward INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coding_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES coding_projects(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language VARCHAR(30) NOT NULL,
    score DECIMAL(5,2),
    passed_tests INTEGER,
    total_tests INTEGER,
    feedback TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIMELINE
-- ============================================================================

CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'lesson_completed', 'quiz_completed', 'worksheet_completed',
        'book_completed', 'badge_earned', 'level_up', 'streak_milestone',
        'xp_milestone', 'coding_completed', 'reward_earned', 'extra_credit'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    xp_earned INTEGER DEFAULT 0,
    icon VARCHAR(50),
    color VARCHAR(7),
    metadata JSONB,
    event_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_child ON timeline_events(child_id);
CREATE INDEX idx_timeline_date ON timeline_events(event_date);

-- ============================================================================
-- EXTRA CREDIT TASKS
-- ============================================================================

CREATE TABLE extra_credit_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    xp_reward INTEGER DEFAULT 50,
    task_type VARCHAR(30) DEFAULT 'general' CHECK (task_type IN ('general', 'worksheet', 'project', 'challenge', 'creative')),
    instructions TEXT,
    due_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extra_credit_child ON extra_credit_tasks(child_id);

-- ============================================================================
-- OAK ACADEMY INTEGRATION
-- ============================================================================

CREATE TABLE oak_academy_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    oak_id VARCHAR(255) UNIQUE NOT NULL,
    data_type VARCHAR(30) NOT NULL CHECK (data_type IN ('lesson', 'unit', 'subject', 'quiz', 'worksheet', 'curriculum')),
    title VARCHAR(255) NOT NULL,
    subject_slug VARCHAR(100),
    year_slug VARCHAR(50),
    unit_slug VARCHAR(100),
    lesson_slug VARCHAR(100),
    content JSONB NOT NULL,
    metadata JSONB,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oak_parent ON oak_academy_cache(parent_id);
CREATE INDEX idx_oak_type ON oak_academy_cache(data_type);
CREATE INDEX idx_oak_slugs ON oak_academy_cache(subject_slug, year_slug, unit_slug);

-- ============================================================================
-- REPORTS CACHE
-- ============================================================================

CREATE TABLE report_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    report_data JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, report_type, period_start, period_end)
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    notification_type VARCHAR(30) DEFAULT 'info' CHECK (notification_type IN ('info', 'success', 'warning', 'achievement', 'reminder')),
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON children
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_assignments_updated_at
    BEFORE UPDATE ON lesson_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create timeline event on lesson completion
CREATE OR REPLACE FUNCTION create_lesson_timeline_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO timeline_events (child_id, event_type, title, description, xp_earned, event_date)
        VALUES (
            NEW.child_id,
            'lesson_completed',
            (SELECT title FROM lessons WHERE id = NEW.lesson_id),
            'Completed a lesson',
            NEW.score::INTEGER,
            NEW.completed_at::DATE
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lesson_completion_timeline
    AFTER UPDATE ON lesson_assignments
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION create_lesson_timeline_event();

-- Auto-update streak on daily activity
CREATE OR REPLACE FUNCTION update_daily_streak()
RETURNS TRIGGER AS $$
DECLARE
    yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
    INSERT INTO streaks (child_id, streak_type, current_streak, longest_streak, last_activity_date)
    VALUES (NEW.child_id, 'daily_learning', 1, 1, CURRENT_DATE)
    ON CONFLICT (child_id, streak_type) DO UPDATE SET
        current_streak = CASE
            WHEN streaks.last_activity_date = yesterday THEN streaks.current_streak + 1
            WHEN streaks.last_activity_date = CURRENT_DATE THEN streaks.current_streak
            ELSE 1
        END,
        longest_streak = GREATEST(
            streaks.longest_streak,
            CASE
                WHEN streaks.last_activity_date = yesterday THEN streaks.current_streak + 1
                ELSE 1
            END
        ),
        last_activity_date = CURRENT_DATE,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_streak_update
    AFTER INSERT OR UPDATE ON attendance
    FOR EACH ROW
    WHEN (NEW.status IN ('present', 'completed'))
    EXECUTE FUNCTION update_daily_streak();

-- ============================================================================
-- SEED DATA: LEVELS
-- ============================================================================

INSERT INTO levels (level_number, name, title, min_xp, max_xp, icon, color, description) VALUES
    (1, 'Explorer', 'Curious Explorer', 0, 499, 'compass', '#10B981', 'Just beginning your learning journey!'),
    (2, 'Adventurer', 'Brave Adventurer', 500, 1249, 'backpack', '#3B82F6', 'Exploring new topics and skills!'),
    (3, 'Apprentice', 'Dedicated Apprentice', 1250, 2499, 'tools', '#8B5CF6', 'Building knowledge and understanding!'),
    (4, 'Inventor', 'Creative Inventor', 2500, 4499, 'lightbulb', '#F59E0B', 'Creating and innovating with what you know!'),
    (5, 'Scientist', 'Analytical Scientist', 4500, 6999, 'microscope', '#06B6D4', 'Testing ideas and discovering new things!'),
    (6, 'Engineer', 'Master Engineer', 7000, 9999, 'gear', '#EF4444', 'Solving complex problems with skill!'),
    (7, 'Master Scholar', 'Master Scholar', 10000, 14999, 'graduation-cap', '#EC4899', 'Achieving mastery in your studies!'),
    (8, 'Grand Master', 'Grand Master', 15000, NULL, 'trophy', '#F59E0B', 'The highest level of achievement!');

-- ============================================================================
-- SEED DATA: BADGES
-- ============================================================================

INSERT INTO badges (name, description, icon, category, requirement_type, requirement_value, xp_reward, color) VALUES
    ('First Lesson', 'Complete your first lesson', 'book-open', 'lesson', 'lessons_completed', 1, 50, '#6366F1'),
    ('First Quiz', 'Complete your first quiz', 'clipboard-check', 'quiz', 'quizzes_completed', 1, 50, '#8B5CF6'),
    ('First Book', 'Finish reading your first book', 'book', 'reading', 'books_completed', 1, 50, '#10B981'),
    ('Science Explorer', 'Complete 5 science lessons', 'microscope', 'science', 'science_lessons', 5, 100, '#06B6D4'),
    ('Perfect Week', 'Complete all lessons for a full week', 'calendar-check', 'streak', 'perfect_week', 1, 150, '#F59E0B'),
    ('Perfect Month', 'Complete all lessons for a full month', 'calendar-star', 'streak', 'perfect_month', 1, 300, '#F59E0B'),
    ('Coding Beginner', 'Complete your first coding project', 'code', 'coding', 'coding_projects', 1, 50, '#3B82F6'),
    ('100 Lessons', 'Complete 100 lessons', 'award', 'achievement', 'lessons_completed', 100, 500, '#EF4444'),
    ('30 Day Streak', 'Maintain a 30-day learning streak', 'flame', 'streak', 'daily_streak', 30, 300, '#F97316'),
    ('7 Day Streak', 'Maintain a 7-day learning streak', 'flame', 'streak', 'daily_streak', 7, 100, '#F97316'),
    ('Math Whiz', 'Complete 10 maths lessons', 'calculator', 'achievement', 'math_lessons', 10, 100, '#EC4899'),
    ('Bookworm', 'Read 10 books', 'books', 'reading', 'books_completed', 10, 200, '#10B981'),
    ('Quiz Master', 'Score 100% on 5 quizzes', 'target', 'quiz', 'perfect_quizzes', 5, 200, '#8B5CF6'),
    ('Worksheet Champion', 'Complete 20 worksheets', 'file-text', 'worksheet', 'worksheets_completed', 20, 150, '#6366F1'),
    ('Level 5', 'Reach Level 5 - Scientist', 'trending-up', 'achievement', 'level_reached', 5, 250, '#06B6D4');
