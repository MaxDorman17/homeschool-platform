from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date, time
from typing import Optional, List, Any
from enum import Enum


# ─── Enums (mirrors models) ───

class UserRole(str, Enum):
    PARENT = "parent"
    CHILD = "child"


class ContentType(str, Enum):
    TEXT = "text"
    VIDEO = "video"
    LINK = "link"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class WorksheetType(str, Enum):
    UPLOADED = "uploaded"
    INTERACTIVE = "interactive"


class QuizType(str, Enum):
    MINI = "mini"
    END_OF_DAY = "end_of_day"
    WEEKLY = "weekly"


class ProgressStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class TransactionType(str, Enum):
    EARN = "earn"
    SPEND = "spend"


# ─── Auth Schemas ───

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    points_balance: Optional[int] = 0
    current_streak: Optional[int] = 0
    children: Optional[list] = []
    created_at: datetime

    class Config:
        from_attributes = True


class RegisterParentRequest(BaseModel):
    username: str
    email: str
    full_name: str
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None


# ─── Child Profile Schemas ───

class CreateChildRequest(BaseModel):
    username: str
    email: str
    full_name: str
    password: str = Field(..., min_length=4)
    avatar_url: Optional[str] = None


class ChildProfileResponse(BaseModel):
    id: int
    user_id: int
    username: str
    full_name: str
    avatar_url: Optional[str] = None
    level: int
    experience: int
    current_streak: int
    longest_streak: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Lesson Schemas ───

class LessonCreate(BaseModel):
    title: str
    subject: str
    topic: Optional[str] = None
    description: Optional[str] = None
    content_type: ContentType = ContentType.TEXT
    content_url: Optional[str] = None
    content_body: Optional[str] = None
    difficulty: Difficulty = Difficulty.MEDIUM
    points_reward: int = 10


class LessonResponse(BaseModel):
    id: int
    title: str
    subject: str
    topic: Optional[str] = None
    description: Optional[str] = None
    content_type: str
    content_url: Optional[str] = None
    content_body: Optional[str] = None
    difficulty: str
    points_reward: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    description: Optional[str] = None
    content_type: Optional[ContentType] = None
    content_url: Optional[str] = None
    content_body: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    points_reward: Optional[int] = None


# ─── Worksheet Schemas ───

class QuestionItem(BaseModel):
    question_type: str  # "multiple_choice", "true_false", "short_answer", "matching"
    question_text: str
    options: Optional[List[str]] = None  # For multiple choice / true false
    correct_answer: Any = None  # string index, bool, or text
    explanation: Optional[str] = None
    points: int = 1


class WorksheetCreate(BaseModel):
    title: str
    description: Optional[str] = None
    worksheet_type: WorksheetType = WorksheetType.UPLOADED
    questions: Optional[List[QuestionItem]] = None
    subject_id: Optional[int] = None
    unit_id: Optional[int] = None


class WorksheetResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    worksheet_type: str
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    subject_id: Optional[int] = None
    unit_id: Optional[int] = None
    subject_name: Optional[str] = None
    unit_title: Optional[str] = None
    points_reward: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class WorksheetUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    worksheet_type: Optional[WorksheetType] = None
    questions: Optional[List[QuestionItem]] = None
    subject_id: Optional[int] = None
    unit_id: Optional[int] = None


# ─── Quiz Schemas ───

class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    quiz_type: QuizType = QuizType.MINI
    questions: List[QuestionItem]
    pass_score: int = 70
    points_reward: int = 15


class QuizResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    quiz_type: str
    questions: List[QuestionItem]
    pass_score: int
    points_reward: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class QuizAnswerRequest(BaseModel):
    answers: List[Any]  # List of answers in order


class QuizResultResponse(BaseModel):
    id: int
    quiz_id: int
    quiz_title: Optional[str] = None
    score: float
    total_questions: int
    correct_answers: int
    passed: bool
    completed_at: datetime

    class Config:
        from_attributes = True


# ─── Schedule Schemas ───

class ScheduleItemCreate(BaseModel):
    lesson_id: Optional[int] = None
    worksheet_id: Optional[int] = None
    quiz_id: Optional[int] = None
    day_of_week: int = Field(..., ge=0, le=4)  # Mon-Fri
    order_index: int
    time_slot: Optional[str] = None  # "09:00", "10:00", etc.


class ScheduleCreate(BaseModel):
    title: str
    child_id: int
    start_date: str  # YYYY-MM-DD
    end_date: Optional[str] = None  # YYYY-MM-DD
    items: List[ScheduleItemCreate]


class ScheduleResponse(BaseModel):
    id: int
    title: str
    child_id: int
    child_name: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    is_active: bool
    created_at: datetime
    items: List["ScheduleItemResponse"] = []

    class Config:
        from_attributes = True


class ScheduleItemResponse(BaseModel):
    id: int
    lesson_id: Optional[int] = None
    worksheet_id: Optional[int] = None
    quiz_id: Optional[int] = None
    day_of_week: int
    order_index: int
    time_slot: Optional[str] = None
    lesson: Optional[LessonResponse] = None
    worksheet: Optional[WorksheetResponse] = None
    quiz: Optional[QuizResponse] = None

    class Config:
        from_attributes = True


# ─── Progress & Submissions ───

class ProgressResponse(BaseModel):
    id: int
    lesson_id: Optional[int] = None
    worksheet_id: Optional[int] = None
    quiz_id: Optional[int] = None
    status: str
    score: Optional[float] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class WorksheetSubmissionCreate(BaseModel):
    answers: Optional[List[Any]] = None  # For interactive
    file_path: Optional[str] = None  # For uploaded


class WorksheetSubmissionResponse(BaseModel):
    id: int
    worksheet_title: Optional[str] = None
    answers: Optional[Any] = None
    file_path: Optional[str] = None
    score: Optional[float] = None
    teacher_notes: Optional[str] = None
    submitted_at: datetime

    class Config:
        from_attributes = True


# ─── Reward Schemas ───

class RewardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    points_cost: int = Field(..., gt=0)
    is_active: bool = True


class RewardResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    points_cost: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RedeemRewardRequest(BaseModel):
    reward_id: int


class RedemptionResponse(BaseModel):
    id: int
    reward_title: str
    points_cost: int
    redeemed_at: datetime
    is_fulfilled: bool

    class Config:
        from_attributes = True


# ─── Reward Schemas ───

class RewardCreate(BaseModel):
    name: str
    points_cost: int
    description: Optional[str] = None


class RewardResponse(BaseModel):
    id: int
    title: str
    points_cost: int
    description: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Badge Schemas ───

class BadgeResponse(BaseModel):
    id: int
    badge_name: str
    badge_type: str
    badge_level: str
    earned_at: datetime

    class Config:
        from_attributes = True


# ─── Dashboard Response ───

class LessonOfDay(BaseModel):
    lesson_id: int
    lesson_title: str
    subject: str
    completed: bool
    worksheet_available: bool
    worksheet_completed: bool
    quiz_available: bool
    quiz_completed: bool
    quiz_score: Optional[float] = None


class ParentDashboard(BaseModel):
    total_children: int
    active_schedules: int
    today_submissions: int
    recent_quizzes: List[QuizResultResponse]
    weak_subjects: List[str]
    weekly_completion_rate: float


class ChildDashboard(BaseModel):
    profile: Optional[ChildProfileResponse] = None
    points_balance: int
    today_lessons: List[LessonOfDay]
    pending_worksheets: int
    pending_quizzes: int
    recent_badges: List[BadgeResponse]
    available_rewards: List[RewardResponse]
    current_streak: int
    level_progress: float  # XP toward next level
    total_lessons: int = 0
    average_quiz_score: float = 0.0
    subject_progress: List[dict] = []
    recent_activity: List[dict] = []


# ─── Utility Schemas ───

class MessageResponse(BaseModel):
    message: str


class BulkCompleteRequest(BaseModel):
    item_ids: List[int]  # Schedule item IDs to mark complete


# ─── Subject/Unit Schemas ───

class SubjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class SubjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class UnitCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: Optional[int] = 0


class UnitResponse(BaseModel):
    id: int
    subject_id: int
    title: str
    description: Optional[str] = None
    order_index: int
    created_at: datetime

    class Config:
        from_attributes = True
