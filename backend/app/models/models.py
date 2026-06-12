import uuid
from datetime import datetime, date, time
from typing import Optional, List

from sqlalchemy import (
    Column, String, Integer, Boolean, Text, DateTime, Date, Time,
    Numeric, SmallInteger, ForeignKey, UniqueConstraint, Index, JSON,
    DECIMAL,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.database import Base


# ============================================================
# USERS & AUTHENTICATION
# ============================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # parent, child, admin
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_token: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    reset_token: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    reset_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    children = relationship("Child", back_populates="parent", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="parent", cascade="all, delete-orphan")
    lessons = relationship("Lesson", back_populates="parent", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="parent", cascade="all, delete-orphan")
    worksheets = relationship("Worksheet", back_populates="parent", cascade="all, delete-orphan")
    reward_configs = relationship("RewardConfig", back_populates="parent", cascade="all, delete-orphan")
    coding_projects = relationship("CodingProject", back_populates="parent", cascade="all, delete-orphan")
    extra_credit_tasks = relationship("ExtraCreditTask", back_populates="parent", cascade="all, delete-orphan")
    oak_cache = relationship("OakAcademyCache", back_populates="parent", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token: Mapped[str] = mapped_column(String(500), nullable=False)
    refresh_token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    device_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="sessions")

    __table_args__ = (
        Index("idx_sessions_user_id", "user_id"),
        Index("idx_sessions_token", "token"),
        Index("idx_sessions_expires", "expires_at"),
    )


# ============================================================
# CHILDREN
# ============================================================

class Child(Base):
    __tablename__ = "children"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str] = mapped_column(Text, default="/images/avatars/default.png")
    pin_code: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    grade_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    parent = relationship("User", back_populates="children")
    lesson_assignments = relationship("LessonAssignment", back_populates="child", cascade="all, delete-orphan")
    planner_entries = relationship("PlannerEntry", back_populates="child", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="child", cascade="all, delete-orphan")
    quiz_assignments = relationship("QuizAssignment", back_populates="child", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="child", cascade="all, delete-orphan")
    worksheet_assignments = relationship("WorksheetAssignment", back_populates="child", cascade="all, delete-orphan")
    xp_events = relationship("XPEvent", back_populates="child", cascade="all, delete-orphan")
    child_levels = relationship("ChildLevel", back_populates="child", cascade="all, delete-orphan")
    child_badges = relationship("ChildBadge", back_populates="child", cascade="all, delete-orphan")
    streaks = relationship("Streak", back_populates="child", cascade="all, delete-orphan")
    reward_configs = relationship("RewardConfig", back_populates="child", cascade="all, delete-orphan")
    reward_history = relationship("RewardHistory", back_populates="child", cascade="all, delete-orphan")
    reading_logs = relationship("ReadingLog", back_populates="child", cascade="all, delete-orphan")
    coding_submissions = relationship("CodingSubmission", back_populates="child", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="child", cascade="all, delete-orphan")
    extra_credit_tasks = relationship("ExtraCreditTask", back_populates="child", cascade="all, delete-orphan")
    report_cache = relationship("ReportCache", back_populates="child", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("parent_id", "username"),
        Index("idx_children_parent", "parent_id"),
    )


# ============================================================
# SUBJECTS
# ============================================================

class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(7), default="#6366F1")
    icon: Mapped[str] = mapped_column(String(50), default="book")
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    parent = relationship("User", back_populates="subjects")
    lessons = relationship("Lesson", back_populates="subject", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_subjects_parent", "parent_id"),
    )


# ============================================================
# LESSONS
# ============================================================

class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    difficulty: Mapped[str] = mapped_column(String(20), default="beginner")
    resource_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    video_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    objectives: Mapped[Optional[dict]] = mapped_column(JSONB, default=list)
    materials_needed: Mapped[Optional[dict]] = mapped_column(JSONB, default=list)
    completion_criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_interactive: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    parent = relationship("User", back_populates="lessons")
    subject = relationship("Subject", back_populates="lessons")
    assignments = relationship("LessonAssignment", back_populates="lesson", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_lessons_subject", "subject_id"),
        Index("idx_lessons_parent", "parent_id"),
        Index("idx_lessons_status", "status"),
    )


class LessonAssignment(Base):
    __tablename__ = "lesson_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    assigned_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    scheduled_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    scheduled_slot: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_spent_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    score: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 2), nullable=True)
    is_extra_credit: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    lesson = relationship("Lesson", back_populates="assignments")
    child = relationship("Child", back_populates="lesson_assignments")
    planner_entries = relationship("PlannerEntry", back_populates="lesson_assignment")

    __table_args__ = (
        UniqueConstraint("lesson_id", "child_id", "assigned_date"),
        Index("idx_lesson_assignments_child", "child_id"),
        Index("idx_lesson_assignments_date", "assigned_date"),
        Index("idx_lesson_assignments_status", "status"),
    )


# ============================================================
# PLANNER
# ============================================================

class PlannerEntry(Base):
    __tablename__ = "planner_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    slot_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    lesson_assignment_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("lesson_assignments.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    entry_type: Mapped[str] = mapped_column(String(20), default="lesson")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    child = relationship("Child", back_populates="planner_entries")
    lesson_assignment = relationship("LessonAssignment", back_populates="planner_entries")

    __table_args__ = (
        UniqueConstraint("child_id", "date", "slot_number"),
        Index("idx_planner_child_date", "child_id", "date"),
    )


# ============================================================
# ATTENDANCE
# ============================================================

class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # present, completed, partially_completed, missed, excused, holiday
    check_in_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    check_out_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    total_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    child = relationship("Child", back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint("child_id", "date"),
        Index("idx_attendance_child", "child_id"),
        Index("idx_attendance_date", "date"),
    )


# ============================================================
# QUIZZES
# ============================================================

class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=0)
    passing_score: Mapped[float] = mapped_column(DECIMAL(5, 2), default=70.00)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    is_randomized: Mapped[bool] = mapped_column(Boolean, default=False)
    show_results: Mapped[bool] = mapped_column(Boolean, default=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="beginner")
    imported_from_oak: Mapped[bool] = mapped_column(Boolean, default=False)
    oak_lesson_slug: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    parent = relationship("User", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    assignments = relationship("QuizAssignment", back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question_type: Mapped[str] = mapped_column(String(30), nullable=False)  # multiple_choice, true_false, short_answer, fill_blank, matching, drag_drop, essay
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    correct_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    correct_answers: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=10)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    quiz = relationship("Quiz", back_populates="questions")

    __table_args__ = (
        Index("idx_quiz_questions_quiz", "quiz_id"),
    )


class QuizAssignment(Base):
    __tablename__ = "quiz_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    assigned_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    score: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 2), nullable=True)
    total_points: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    earned_points: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    time_spent_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    attempts_used: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    quiz = relationship("Quiz", back_populates="assignments")
    child = relationship("Child", back_populates="quiz_assignments")
    attempts = relationship("QuizAttempt", back_populates="quiz_assignment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_quiz_assignments_child", "child_id"),
    )


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_assignment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("quiz_assignments.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 2), nullable=True)
    total_questions: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    correct_answers_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    answers: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    quiz_assignment = relationship("QuizAssignment", back_populates="attempts")
    child = relationship("Child", back_populates="quiz_attempts")

    __table_args__ = (
        Index("idx_quiz_attempts_assignment", "quiz_assignment_id"),
    )


# ============================================================
# WORKSHEETS
# ============================================================

class Worksheet(Base):
    __tablename__ = "worksheets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_interactive: Mapped[bool] = mapped_column(Boolean, default=False)
    worksheet_type: Mapped[str] = mapped_column(String(30), default="upload")
    imported_from_oak: Mapped[bool] = mapped_column(Boolean, default=False)
    oak_lesson_slug: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    interactive_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    parent = relationship("User", back_populates="worksheets")
    assignments = relationship("WorksheetAssignment", back_populates="worksheet", cascade="all, delete-orphan")


class WorksheetAssignment(Base):
    __tablename__ = "worksheet_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    worksheet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("worksheets.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    assigned_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    score: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 2), nullable=True)
    answers: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    time_spent_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    worksheet = relationship("Worksheet", back_populates="assignments")
    child = relationship("Child", back_populates="worksheet_assignments")


# ============================================================
# XP & LEVELS
# ============================================================

class XPEvent(Base):
    __tablename__ = "xp_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    awarded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    child = relationship("Child", back_populates="xp_events")

    __table_args__ = (
        Index("idx_xp_events_child", "child_id"),
        Index("idx_xp_events_awarded", "awarded_at"),
    )


class Level(Base):
    __tablename__ = "levels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    level_number: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    min_xp: Mapped[int] = mapped_column(Integer, nullable=False)
    max_xp: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="star")
    color: Mapped[str] = mapped_column(String(7), default="#6366F1")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    child_levels = relationship("ChildLevel", back_populates="level")


class ChildLevel(Base):
    __tablename__ = "child_levels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    level_id: Mapped[int] = mapped_column(Integer, ForeignKey("levels.id", ondelete="CASCADE"), nullable=False)
    current_xp: Mapped[int] = mapped_column(Integer, default=0)
    total_xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    xp_to_next_level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    achieved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    child = relationship("Child", back_populates="child_levels")
    level = relationship("Level", back_populates="child_levels")

    __table_args__ = (
        UniqueConstraint("child_id", "level_id"),
        Index("idx_child_levels_child", "child_id"),
    )


# ============================================================
# BADGES
# ============================================================

class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="badge")
    category: Mapped[str] = mapped_column(String(50), default="general")
    requirement_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    requirement_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    xp_reward: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[str] = mapped_column(String(7), default="#F59E0B")
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    child_badges = relationship("ChildBadge", back_populates="badge")


class ChildBadge(Base):
    __tablename__ = "child_badges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    badge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("badges.id", ondelete="CASCADE"), nullable=False)
    awarded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    context: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    child = relationship("Child", back_populates="child_badges")
    badge = relationship("Badge", back_populates="child_badges")

    __table_args__ = (
        UniqueConstraint("child_id", "badge_id"),
        Index("idx_child_badges_child", "child_id"),
    )


# ============================================================
# STREAKS
# ============================================================

class Streak(Base):
    __tablename__ = "streaks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    streak_type: Mapped[str] = mapped_column(String(30), nullable=False)  # daily_learning, reading, coding, science, math
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    child = relationship("Child", back_populates="streaks")

    __table_args__ = (
        UniqueConstraint("child_id", "streak_type"),
        Index("idx_streaks_child", "child_id"),
    )


# ============================================================
# REWARDS
# ============================================================

class RewardConfig(Base):
    __tablename__ = "reward_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    reward_type: Mapped[str] = mapped_column(String(30), default="monthly")
    target_percentage: Mapped[float] = mapped_column(DECIMAL(5, 2), default=75.00)
    reward_amount: Mapped[float] = mapped_column(DECIMAL(10, 2), default=45.00)
    reward_currency: Mapped[str] = mapped_column(String(10), default="GBP")
    reward_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    parent = relationship("User", back_populates="reward_configs")
    child = relationship("Child", back_populates="reward_configs")

    __table_args__ = (
        UniqueConstraint("parent_id", "child_id", "reward_type"),
    )


class RewardHistory(Base):
    __tablename__ = "reward_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    reward_config_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("reward_configs.id", ondelete="SET NULL"), nullable=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    completion_percentage: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 2), nullable=True)
    reward_earned: Mapped[float] = mapped_column(DECIMAL(10, 2), default=0.00)
    reward_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    child = relationship("Child", back_populates="reward_history")

    __table_args__ = (
        Index("idx_reward_history_child", "child_id"),
    )


# ============================================================
# READING LOG
# ============================================================

class ReadingLog(Base):
    __tablename__ = "reading_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    book_title: Mapped[str] = mapped_column(String(255), nullable=False)
    author: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pages: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pages_read: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    finish_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    child = relationship("Child", back_populates="reading_logs")

    __table_args__ = (
        Index("idx_reading_log_child", "child_id"),
    )


# ============================================================
# CODING PROJECTS
# ============================================================

class CodingProject(Base):
    __tablename__ = "coding_projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(30), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), default="beginner")
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    starter_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    solution_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    test_cases: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    xp_reward: Mapped[int] = mapped_column(Integer, default=50)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    parent = relationship("User", back_populates="coding_projects")
    submissions = relationship("CodingSubmission", back_populates="project", cascade="all, delete-orphan")


class CodingSubmission(Base):
    __tablename__ = "coding_submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("coding_projects.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(30), nullable=False)
    score: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 2), nullable=True)
    passed_tests: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_tests: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    project = relationship("CodingProject", back_populates="submissions")
    child = relationship("Child", back_populates="coding_submissions")


# ============================================================
# TIMELINE
# ============================================================

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    event_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    child = relationship("Child", back_populates="timeline_events")

    __table_args__ = (
        Index("idx_timeline_child", "child_id"),
        Index("idx_timeline_date", "event_date"),
    )


# ============================================================
# EXTRA CREDIT
# ============================================================

class ExtraCreditTask(Base):
    __tablename__ = "extra_credit_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    xp_reward: Mapped[int] = mapped_column(Integer, default=50)
    task_type: Mapped[str] = mapped_column(String(30), default="general")
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    parent = relationship("User", back_populates="extra_credit_tasks")
    child = relationship("Child", back_populates="extra_credit_tasks")

    __table_args__ = (
        Index("idx_extra_credit_child", "child_id"),
    )


# ============================================================
# OAK ACADEMY CACHE
# ============================================================

class OakAcademyCache(Base):
    __tablename__ = "oak_academy_cache"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    oak_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    data_type: Mapped[str] = mapped_column(String(30), nullable=False)  # lesson, unit, subject, quiz, worksheet, curriculum
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subject_slug: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    year_slug: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    unit_slug: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lesson_slug: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    import_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
    imported_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    parent = relationship("User", back_populates="oak_cache")

    __table_args__ = (
        Index("idx_oak_parent", "parent_id"),
        Index("idx_oak_type", "data_type"),
        Index("idx_oak_slugs", "subject_slug", "year_slug", "unit_slug"),
    )


# ============================================================
# REPORT CACHE
# ============================================================

class ReportCache(Base):
    __tablename__ = "report_cache"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    report_type: Mapped[str] = mapped_column(String(20), nullable=False)  # daily, weekly, monthly, custom
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    report_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    child = relationship("Child", back_populates="report_cache")

    __table_args__ = (
        UniqueConstraint("child_id", "report_type", "period_start", "period_end"),
    )


# ============================================================
# NOTIFICATIONS
# ============================================================

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notification_type: Mapped[str] = mapped_column(String(30), default="info")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    link: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=datetime.now)

    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("idx_notifications_user", "user_id"),
        Index("idx_notifications_read", "user_id", "is_read"),
    )
