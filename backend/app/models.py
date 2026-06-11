from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey, Text, DateTime,
    Enum, Float, JSON, Date, Time, Table, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import date

from app.database import Base


class UserRole(str, enum.Enum):
    PARENT = "parent"
    CHILD = "child"


class ContentType(str, enum.Enum):
    TEXT = "text"
    VIDEO = "video"
    LINK = "link"


class Difficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class WorksheetType(str, enum.Enum):
    UPLOADED = "uploaded"
    INTERACTIVE = "interactive"


class QuizType(str, enum.Enum):
    MINI = "mini"
    END_OF_DAY = "end_of_day"
    WEEKLY = "weekly"


class ProgressStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class TransactionType(str, enum.Enum):
    EARN = "earn"
    SPEND = "spend"


# ─── User Tables ───

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    full_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    points_balance = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    parent_profile = relationship("ParentProfile", back_populates="user", foreign_keys="ParentProfile.user_id")
    child_profiles = relationship("ChildProfile", back_populates="user", foreign_keys="ChildProfile.user_id")
    child_as_parent = relationship("ChildProfile", back_populates="parent", foreign_keys="ChildProfile.parent_id")
    schedules = relationship("Schedule", back_populates="parent", foreign_keys="Schedule.parent_id")
    created_lessons = relationship("Lesson", back_populates="creator")
    created_worksheets = relationship("Worksheet", back_populates="creator")
    created_quizzes = relationship("Quiz", back_populates="creator")
    created_rewards = relationship("Reward", back_populates="parent")


class ParentProfile(Base):
    __tablename__ = "parent_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="parent_profile")
    # Rewards link via User.parent_id FK (not parent_profiles), so we don't define this relationship here


class ChildProfile(Base):
    __tablename__ = "child_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    avatar_url = Column(String(255), nullable=True)
    avatar_unlocked = Column(JSON, default=list)
    level = Column(Integer, default=1)
    experience = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_active_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
    parent = relationship("User", foreign_keys=[parent_id], back_populates="child_as_parent")

    progress = relationship("ProgressRecord", back_populates="child")
    worksheet_submissions = relationship("WorksheetSubmission", back_populates="child")
    quiz_results = relationship("QuizResult", back_populates="child")
    badges = relationship("UserBadge", back_populates="child")
    point_transactions = relationship("PointTransaction", back_populates="child")
    reward_redemptions = relationship("RewardRedemption", back_populates="child")


# ─── Learning Tables ───

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(50), nullable=False)  # e.g., Math, Science, English
    topic = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    content_type = Column(Enum(ContentType), default=ContentType.TEXT)
    content_url = Column(String(500), nullable=True)  # Video URL or external link
    content_body = Column(Text, nullable=True)  # Text content / instructions
    difficulty = Column(Enum(Difficulty), default=Difficulty.MEDIUM)
    points_reward = Column(Integer, default=10)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="created_lessons")


class Worksheet(Base):
    __tablename__ = "worksheets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    worksheet_type = Column(Enum(WorksheetType), default=WorksheetType.UPLOADED)
    file_path = Column(String(500), nullable=True)  # For uploaded PDFs/images
    questions = Column(JSON, nullable=True)  # For interactive worksheets
    points_reward = Column(Integer, default=5)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="created_worksheets")
    submissions = relationship("WorksheetSubmission", back_populates="worksheet")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    quiz_type = Column(Enum(QuizType), default=QuizType.MINI)
    questions = Column(JSON, nullable=False)  # Array of question objects
    pass_score = Column(Integer, default=70)
    points_reward = Column(Integer, default=15)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="created_quizzes")
    results = relationship("QuizResult", back_populates="quiz")


# ─── Schedule Tables ───

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("child_profiles.id"), nullable=False)
    title = Column(String(200), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    parent = relationship("User", back_populates="schedules")
    child = relationship("ChildProfile")
    schedule_items = relationship("ScheduleItem", back_populates="schedule", cascade="all, delete-orphan")


class ScheduleItem(Base):
    __tablename__ = "schedule_items"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    worksheet_id = Column(Integer, ForeignKey("worksheets.id"), nullable=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 4=Friday
    order_index = Column(Integer, nullable=False)  # Position in the day
    time_slot = Column(Time, nullable=True)

    schedule = relationship("Schedule", back_populates="schedule_items")
    lesson = relationship("Lesson")
    worksheet = relationship("Worksheet")
    quiz = relationship("Quiz")


# ─── Progress & Submissions ───

class ProgressRecord(Base):
    __tablename__ = "progress_records"

    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("child_profiles.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    worksheet_id = Column(Integer, ForeignKey("worksheets.id"), nullable=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=True)
    status = Column(Enum(ProgressStatus), default=ProgressStatus.NOT_STARTED)
    score = Column(Float, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)  # Parent/teacher notes

    child = relationship("ChildProfile", back_populates="progress")


class WorksheetSubmission(Base):
    __tablename__ = "worksheet_submissions"

    id = Column(Integer, primary_key=True, index=True)
    worksheet_id = Column(Integer, ForeignKey("worksheets.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("child_profiles.id"), nullable=False)
    answers = Column(JSON, nullable=True)  # For interactive worksheets
    file_path = Column(String(500), nullable=True)  # For uploaded worksheet uploads
    score = Column(Float, nullable=True)
    teacher_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    worksheet = relationship("Worksheet", back_populates="submissions")
    child = relationship("ChildProfile", back_populates="worksheet_submissions")


class QuizResult(Base):
    __tablename__ = "quiz_results"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    child_id = Column(Integer, ForeignKey("child_profiles.id"), nullable=False)
    score = Column(Float, nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    passed = Column(Boolean, default=False)
    answers = Column(JSON, nullable=True)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    quiz = relationship("Quiz", back_populates="results")
    child = relationship("ChildProfile", back_populates="quiz_results")


# ─── Gamification & Rewards ───

class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    points_cost = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    parent = relationship("User", back_populates="created_rewards")
    redemptions = relationship("RewardRedemption", back_populates="reward")


class RewardRedemption(Base):
    __tablename__ = "reward_redemptions"
    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("child_profiles.id"), nullable=False)
    reward_id = Column(Integer, ForeignKey("rewards.id"), nullable=False)
    redeemed_at = Column(DateTime(timezone=True), server_default=func.now())
    is_fulfilled = Column(Boolean, default=False)

    child = relationship("ChildProfile")
    reward = relationship("Reward", back_populates="redemptions")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User")
    units = relationship("Unit", back_populates="subject", cascade="all, delete-orphan")


class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    subject = relationship("Subject", back_populates="units")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("child_profiles.id"), nullable=False)
    badge_name = Column(String(100), nullable=False)
    badge_type = Column(Enum("lesson", "streak", "quiz", "worksheet"), nullable=False)
    badge_level = Column(String(20), nullable=False)  # bronze, silver, gold, platinum
    earned_at = Column(DateTime(timezone=True), server_default=func.now())

    child = relationship("ChildProfile", back_populates="badges")


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("child_profiles.id"), nullable=False)
    points = Column(Integer, nullable=False)  # Positive = earn, Negative = spend
    transaction_type = Column(Enum(TransactionType), nullable=False)
    description = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    child = relationship("ChildProfile", back_populates="point_transactions")


# ─── Password Reset ───

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
