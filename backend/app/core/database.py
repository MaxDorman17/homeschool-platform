from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session_maker = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with async_engine.begin() as conn:
        from app.models.models import (  # noqa: F401 - ensure all models loaded
            User, Session, Child, Subject, Lesson, LessonAssignment,
            PlannerEntry, Attendance, Quiz, QuizQuestion, QuizAssignment,
            QuizAttempt, Worksheet, WorksheetAssignment, XPEvent, Level,
            ChildLevel, Badge, ChildBadge, Streak, RewardConfig, RewardHistory,
            ReadingLog, CodingProject, CodingSubmission, TimelineEvent,
            ExtraCreditTask, OakAcademyCache, ReportCache, Notification,
        )
        await conn.run_sync(Base.metadata.create_all)
