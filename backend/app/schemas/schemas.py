from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
from uuid import UUID
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ============================================================
# AUTH
# ============================================================

class UserCreate(BaseModel):
    email: str = Field(..., max_length=255)
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=255)
    full_name: str = Field(..., max_length=255)
    role: str = Field(default="parent")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("parent", "child", "admin"):
            raise ValueError("Role must be parent, child, or admin")
        return v


class UserLogin(BaseModel):
    username: str = Field(..., max_length=100)
    password: str = Field(..., max_length=255)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    username: str
    full_name: str
    role: str
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdate(BaseModel):
    email: Optional[str] = Field(None, max_length=255)
    full_name: Optional[str] = Field(None, max_length=255)
    avatar_url: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: str


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=255)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ============================================================
# CHILDREN
# ============================================================

class ChildCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    display_name: str = Field(..., max_length=255)
    avatar_url: Optional[str] = None
    pin_code: Optional[str] = Field(None, max_length=6)
    date_of_birth: Optional[date] = None
    grade_level: Optional[str] = Field(None, max_length=50)


class ChildUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=255)
    avatar_url: Optional[str] = None
    pin_code: Optional[str] = Field(None, max_length=6)
    date_of_birth: Optional[date] = None
    grade_level: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class ChildResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID
    username: str
    display_name: str
    avatar_url: str
    pin_code: Optional[str] = None
    date_of_birth: Optional[date] = None
    grade_level: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None


# ============================================================
# SUBJECTS
# ============================================================

class SubjectCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    color: str = "#6366F1"
    icon: str = "book"
    display_order: int = 0
    is_active: bool = True


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class SubjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID
    name: str
    description: Optional[str] = None
    color: str
    icon: str
    display_order: int
    is_active: bool
    created_at: Optional[datetime] = None


# ============================================================
# LESSONS
# ============================================================

class LessonCreate(BaseModel):
    subject_id: UUID
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    content: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: int = 30
    difficulty: str = "beginner"
    resource_url: Optional[str] = None
    resource_type: Optional[str] = None
    video_url: Optional[str] = None
    objectives: Optional[List[str]] = None
    materials_needed: Optional[List[str]] = None
    completion_criteria: Optional[str] = None
    is_interactive: bool = False
    display_order: int = 0
    status: str = "active"

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str) -> str:
        allowed = ("beginner", "intermediate", "advanced")
        if v not in allowed:
            raise ValueError(f"Difficulty must be one of {allowed}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = ("active", "draft", "archived")
        if v not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return v


class LessonUpdate(BaseModel):
    subject_id: Optional[UUID] = None
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    content: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: Optional[int] = None
    difficulty: Optional[str] = None
    resource_url: Optional[str] = None
    resource_type: Optional[str] = None
    video_url: Optional[str] = None
    objectives: Optional[List[str]] = None
    materials_needed: Optional[List[str]] = None
    completion_criteria: Optional[str] = None
    is_interactive: Optional[bool] = None
    display_order: Optional[int] = None
    status: Optional[str] = None


class LessonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID
    subject_id: UUID
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: int
    difficulty: str
    resource_url: Optional[str] = None
    resource_type: Optional[str] = None
    video_url: Optional[str] = None
    objectives: Optional[Any] = None
    materials_needed: Optional[Any] = None
    completion_criteria: Optional[str] = None
    is_interactive: bool
    display_order: int
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LessonAssignmentCreate(BaseModel):
    lesson_id: UUID
    child_id: UUID
    assigned_date: date
    due_date: Optional[date] = None
    scheduled_date: Optional[date] = None
    scheduled_slot: Optional[int] = Field(None, ge=1, le=6)
    notes: Optional[str] = None
    is_extra_credit: bool = False


class LessonAssignmentUpdate(BaseModel):
    due_date: Optional[date] = None
    scheduled_date: Optional[date] = None
    scheduled_slot: Optional[int] = Field(None, ge=1, le=6)
    notes: Optional[str] = None
    parent_notes: Optional[str] = None
    time_spent_minutes: Optional[int] = None
    score: Optional[float] = None
    status: Optional[str] = None


class LessonAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lesson_id: UUID
    child_id: UUID
    assigned_date: date
    due_date: Optional[date] = None
    scheduled_date: Optional[date] = None
    scheduled_slot: Optional[int] = None
    status: str
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    parent_notes: Optional[str] = None
    time_spent_minutes: Optional[int] = None
    score: Optional[float] = None
    is_extra_credit: bool
    created_at: Optional[datetime] = None
    lesson: Optional[LessonResponse] = None


class LessonCompleteRequest(BaseModel):
    time_spent_minutes: Optional[int] = None
    score: Optional[float] = None
    notes: Optional[str] = None


class RolloverRequest(BaseModel):
    child_id: UUID
    from_date: date
    to_date: date


# ============================================================
# PLANNER
# ============================================================

class PlannerEntryCreate(BaseModel):
    child_id: UUID
    date: date
    slot_number: int = Field(..., ge=1, le=8)
    lesson_assignment_id: Optional[UUID] = None
    title: Optional[str] = None
    entry_type: str = "lesson"
    notes: Optional[str] = None
    is_recurring: bool = False

    @field_validator("entry_type")
    @classmethod
    def validate_entry_type(cls, v: str) -> str:
        allowed = ("lesson", "quiz", "worksheet", "reading", "coding", "break", "activity")
        if v not in allowed:
            raise ValueError(f"Entry type must be one of {allowed}")
        return v


class PlannerEntryUpdate(BaseModel):
    slot_number: Optional[int] = Field(None, ge=1, le=8)
    title: Optional[str] = None
    entry_type: Optional[str] = None
    notes: Optional[str] = None
    is_recurring: Optional[bool] = None


class PlannerEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    date: date
    slot_number: int
    lesson_assignment_id: Optional[UUID] = None
    title: Optional[str] = None
    entry_type: str
    notes: Optional[str] = None
    is_recurring: bool
    created_at: Optional[datetime] = None


class RearrangeSlotsRequest(BaseModel):
    child_id: UUID
    date: date
    slot_order: List[UUID]


# ============================================================
# ATTENDANCE
# ============================================================

class AttendanceCreate(BaseModel):
    child_id: UUID
    date: date
    status: str = "present"
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    total_minutes: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = ("present", "completed", "partially_completed", "missed", "excused", "holiday")
        if v not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return v


class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    total_minutes: Optional[int] = None
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    date: date
    status: str
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    total_minutes: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class AttendanceStats(BaseModel):
    total_days: int
    present_days: int
    missed_days: int
    excused_days: int
    holiday_days: int
    completion_rate: float


# ============================================================
# QUIZZES
# ============================================================

class QuizCreate(BaseModel):
    subject_id: Optional[UUID] = None
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    instructions: Optional[str] = None
    time_limit_minutes: int = 0
    passing_score: float = 70.00
    max_attempts: int = 3
    is_randomized: bool = False
    show_results: bool = True
    difficulty: str = "beginner"
    status: str = "active"


class QuizUpdate(BaseModel):
    subject_id: Optional[UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    time_limit_minutes: Optional[int] = None
    passing_score: Optional[float] = None
    max_attempts: Optional[int] = None
    is_randomized: Optional[bool] = None
    show_results: Optional[bool] = None
    difficulty: Optional[str] = None
    status: Optional[str] = None


class QuizQuestionCreate(BaseModel):
    question_type: str
    question_text: str
    options: Optional[Dict[str, Any]] = None
    correct_answer: Optional[str] = None
    correct_answers: Optional[Dict[str, Any]] = None
    explanation: Optional[str] = None
    points: int = 10
    image_url: Optional[str] = None
    display_order: int = 0

    @field_validator("question_type")
    @classmethod
    def validate_question_type(cls, v: str) -> str:
        allowed = ("multiple_choice", "true_false", "short_answer", "fill_blank", "matching", "drag_drop", "essay")
        if v not in allowed:
            raise ValueError(f"Question type must be one of {allowed}")
        return v


class QuizQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    quiz_id: UUID
    question_type: str
    question_text: str
    options: Optional[Any] = None
    correct_answer: Optional[str] = None
    correct_answers: Optional[Any] = None
    explanation: Optional[str] = None
    points: int
    image_url: Optional[str] = None
    display_order: int


class QuizResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID
    subject_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    time_limit_minutes: int
    passing_score: float
    max_attempts: int
    is_randomized: bool
    show_results: bool
    difficulty: str
    imported_from_oak: bool
    oak_lesson_slug: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    questions: Optional[List[QuizQuestionResponse]] = None


class QuizAssignmentCreate(BaseModel):
    quiz_id: UUID
    child_id: UUID
    assigned_date: date
    due_date: Optional[date] = None


class QuizAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    quiz_id: UUID
    child_id: UUID
    assigned_date: date
    due_date: Optional[date] = None
    status: str
    score: Optional[float] = None
    total_points: Optional[int] = None
    earned_points: Optional[int] = None
    time_spent_minutes: Optional[int] = None
    attempts_used: int
    completed_at: Optional[datetime] = None
    quiz: Optional[QuizResponse] = None


class QuizAttemptCreate(BaseModel):
    quiz_assignment_id: UUID
    answers: Dict[str, Any]


class QuizAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    quiz_assignment_id: UUID
    child_id: UUID
    attempt_number: int
    score: Optional[float] = None
    total_questions: Optional[int] = None
    correct_answers: Optional[int] = None
    answers: Optional[Any] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ============================================================
# WORKSHEETS
# ============================================================

class WorksheetCreate(BaseModel):
    subject_id: Optional[UUID] = None
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    is_interactive: bool = False
    worksheet_type: str = "upload"
    interactive_data: Optional[Dict[str, Any]] = None
    status: str = "active"

    @field_validator("worksheet_type")
    @classmethod
    def validate_worksheet_type(cls, v: str) -> str:
        allowed = ("upload", "interactive", "oak_imported")
        if v not in allowed:
            raise ValueError(f"Worksheet type must be one of {allowed}")
        return v


class WorksheetUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_interactive: Optional[bool] = None
    worksheet_type: Optional[str] = None
    interactive_data: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class WorksheetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID
    subject_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    is_interactive: bool
    worksheet_type: str
    imported_from_oak: bool
    oak_lesson_slug: Optional[str] = None
    interactive_data: Optional[Any] = None
    status: str
    created_at: Optional[datetime] = None


class WorksheetAssignmentCreate(BaseModel):
    worksheet_id: UUID
    child_id: UUID
    assigned_date: date
    due_date: Optional[date] = None


class WorksheetAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    worksheet_id: UUID
    child_id: UUID
    assigned_date: date
    due_date: Optional[date] = None
    status: str
    score: Optional[float] = None
    answers: Optional[Any] = None
    time_spent_minutes: Optional[int] = None
    completed_at: Optional[datetime] = None
    worksheet: Optional[WorksheetResponse] = None


class InteractiveSubmit(BaseModel):
    answers: Dict[str, Any]
    time_spent_minutes: Optional[int] = None


# ============================================================
# XP / LEVELS / BADGES
# ============================================================

class XPEventCreate(BaseModel):
    amount: int = Field(..., gt=0)
    source: str
    source_id: Optional[UUID] = None
    description: Optional[str] = None

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        allowed = ("lesson", "quiz", "worksheet", "reading", "coding", "extra_credit", "streak_bonus", "achievement", "daily_bonus", "other")
        if v not in allowed:
            raise ValueError(f"Source must be one of {allowed}")
        return v


class XPEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    amount: int
    source: str
    source_id: Optional[UUID] = None
    description: Optional[str] = None
    awarded_at: Optional[datetime] = None


class LevelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    level_number: int
    name: str
    title: str
    min_xp: int
    max_xp: Optional[int] = None
    icon: str
    color: str
    description: Optional[str] = None


class ChildLevelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    level_id: int
    current_xp: int
    total_xp_earned: int
    xp_to_next_level: Optional[int] = None
    is_current: bool
    achieved_at: Optional[datetime] = None
    level: Optional[LevelResponse] = None


class BadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    icon: str
    category: str
    requirement_type: Optional[str] = None
    requirement_value: Optional[int] = None
    xp_reward: int
    color: str
    is_hidden: bool


class ChildBadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    badge_id: UUID
    awarded_at: Optional[datetime] = None
    context: Optional[Any] = None
    badge: Optional[BadgeResponse] = None


class StreakResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    streak_type: str
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date] = None
    updated_at: Optional[datetime] = None


# ============================================================
# REWARDS
# ============================================================

class RewardConfigCreate(BaseModel):
    child_id: UUID
    reward_type: str = "monthly"
    target_percentage: float = 75.00
    reward_amount: float = 45.00
    reward_currency: str = "GBP"
    reward_name: Optional[str] = None
    is_active: bool = True
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @field_validator("reward_type")
    @classmethod
    def validate_reward_type(cls, v: str) -> str:
        allowed = ("weekly", "monthly", "quarterly", "custom")
        if v not in allowed:
            raise ValueError(f"Reward type must be one of {allowed}")
        return v


class RewardConfigUpdate(BaseModel):
    target_percentage: Optional[float] = None
    reward_amount: Optional[float] = None
    reward_currency: Optional[str] = None
    reward_name: Optional[str] = None
    is_active: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class RewardConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID
    child_id: UUID
    reward_type: str
    target_percentage: float
    reward_amount: float
    reward_currency: str
    reward_name: Optional[str] = None
    is_active: bool
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    created_at: Optional[datetime] = None


class RewardHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    reward_config_id: Optional[UUID] = None
    period_start: date
    period_end: date
    completion_percentage: Optional[float] = None
    reward_earned: float
    reward_paid: bool
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class CurrentRewardResponse(BaseModel):
    config: RewardConfigResponse
    completion_percentage: float
    projected_reward: float
    days_remaining: int
    total_days: int
    completed_days: int


# ============================================================
# READING LOG
# ============================================================

class ReadingLogCreate(BaseModel):
    child_id: UUID
    book_title: str = Field(..., max_length=255)
    author: Optional[str] = Field(None, max_length=255)
    pages: Optional[int] = None
    pages_read: int = 0
    start_date: date
    finish_date: Optional[date] = None
    notes: Optional[str] = None


class ReadingLogUpdate(BaseModel):
    pages_read: Optional[int] = None
    finish_date: Optional[date] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None
    is_completed: Optional[bool] = None


class ReadingLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    book_title: str
    author: Optional[str] = None
    pages: Optional[int] = None
    pages_read: int
    start_date: date
    finish_date: Optional[date] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    is_completed: bool
    created_at: Optional[datetime] = None


# ============================================================
# CODING PROJECTS
# ============================================================

class CodingProjectCreate(BaseModel):
    child_id: Optional[UUID] = None
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    language: str
    difficulty: str = "beginner"
    instructions: Optional[str] = None
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[Dict[str, Any]] = None
    xp_reward: int = 50

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        allowed = ("html", "css", "javascript", "python", "scratch")
        if v not in allowed:
            raise ValueError(f"Language must be one of {allowed}")
        return v


class CodingProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    difficulty: Optional[str] = None
    instructions: Optional[str] = None
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[Dict[str, Any]] = None
    xp_reward: Optional[int] = None
    is_active: Optional[bool] = None


class CodingProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID
    child_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    language: str
    difficulty: str
    instructions: Optional[str] = None
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[Any] = None
    xp_reward: int
    is_active: bool
    created_at: Optional[datetime] = None


class CodingSubmissionCreate(BaseModel):
    project_id: UUID
    code: str
    language: str


class CodingSubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    child_id: UUID
    code: str
    language: str
    score: Optional[float] = None
    passed_tests: Optional[int] = None
    total_tests: Optional[int] = None
    feedback: Optional[str] = None
    is_completed: bool
    submitted_at: Optional[datetime] = None


# ============================================================
# TIMELINE
# ============================================================

class TimelineEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    event_type: str
    title: str
    description: Optional[str] = None
    xp_earned: int
    icon: Optional[str] = None
    color: Optional[str] = None
    event_metadata: Optional[Any] = Field(None, alias="event_metadata")
    event_date: date
    created_at: Optional[datetime] = None


# ============================================================
# EXTRA CREDIT
# ============================================================

class ExtraCreditTaskCreate(BaseModel):
    child_id: UUID
    subject_id: Optional[UUID] = None
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    xp_reward: int = 50
    task_type: str = "general"
    instructions: Optional[str] = None
    due_date: Optional[date] = None

    @field_validator("task_type")
    @classmethod
    def validate_task_type(cls, v: str) -> str:
        allowed = ("general", "worksheet", "project", "challenge", "creative")
        if v not in allowed:
            raise ValueError(f"Task type must be one of {allowed}")
        return v


class ExtraCreditTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    xp_reward: Optional[int] = None
    task_type: Optional[str] = None
    instructions: Optional[str] = None
    due_date: Optional[date] = None


class ExtraCreditTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID
    child_id: UUID
    subject_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    xp_reward: int
    task_type: str
    instructions: Optional[str] = None
    due_date: Optional[date] = None
    is_completed: bool
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ============================================================
# NOTIFICATIONS
# ============================================================

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: str
    message: Optional[str] = None
    notification_type: str
    is_read: bool
    link: Optional[str] = None
    created_at: Optional[datetime] = None


# ============================================================
# OAK ACADEMY
# ============================================================

class OakImportLesson(BaseModel):
    oak_id: str
    title: str
    subject_slug: Optional[str] = None
    year_slug: Optional[str] = None
    unit_slug: Optional[str] = None
    lesson_slug: Optional[str] = None
    content: Dict[str, Any]


class OakImportQuiz(BaseModel):
    oak_id: str
    title: str
    subject_slug: Optional[str] = None
    year_slug: Optional[str] = None
    unit_slug: Optional[str] = None
    lesson_slug: Optional[str] = None
    content: Dict[str, Any]


class OakCachedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    oak_id: str
    data_type: str
    title: str
    subject_slug: Optional[str] = None
    year_slug: Optional[str] = None
    unit_slug: Optional[str] = None
    lesson_slug: Optional[str] = None
    imported_at: Optional[datetime] = None


# ============================================================
# DASHBOARD
# ============================================================

class DashboardLesson(BaseModel):
    id: UUID
    title: str
    subject_name: str
    subject_color: str
    status: str
    scheduled_slot: Optional[int] = None
    duration_minutes: int
    assignment_id: UUID


class DashboardResponse(BaseModel):
    children: List[Dict[str, Any]]
    today_lessons: List[DashboardLesson]
    upcoming: List[DashboardLesson]
    weekly_completion: float
    attendance_rate: float
    rewards: List[RewardConfigResponse]
    achievements: List[ChildBadgeResponse]
    recent_activity: List[TimelineEventResponse]


class ChildDashboardResponse(BaseModel):
    today_lessons: List[DashboardLesson]
    streak: Optional[StreakResponse] = None
    xp: int
    level: Optional[ChildLevelResponse] = None
    badges: List[ChildBadgeResponse]
    monthly_reward: Optional[CurrentRewardResponse] = None
    timeline: List[TimelineEventResponse]
    attendance_today: Optional[AttendanceResponse] = None


# ============================================================
# REPORTS
# ============================================================

class SubjectPerformance(BaseModel):
    subject_id: UUID
    subject_name: str
    subject_color: str
    total_lessons: int
    completed_lessons: int
    completion_rate: float
    average_score: Optional[float] = None


class AttendanceTrend(BaseModel):
    date: date
    status: str
    total_minutes: Optional[int] = None


class CompletionRate(BaseModel):
    date: date
    completed: int
    total: int
    rate: float
