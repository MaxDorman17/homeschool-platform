from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

settings = get_settings()

# SQLite doesn't need pool settings
if "sqlite" in settings.DATABASE_URL:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Yield a database session for each request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize the database - create all tables."""
    from app.models import User, ParentProfile, ChildProfile, Lesson, Worksheet, Quiz, Schedule, ScheduleItem, \
        ProgressRecord, WorksheetSubmission, QuizResult, Reward, RewardRedemption, UserBadge, PointTransaction
    Base.metadata.create_all(bind=engine)
