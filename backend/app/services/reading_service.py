from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import ReadingLog, Streak


async def create_entry(
    db: AsyncSession,
    child_id: UUID,
    book_title: str,
    start_date: date,
    **kwargs,
) -> ReadingLog:
    entry = ReadingLog(child_id=child_id, book_title=book_title, start_date=start_date, **kwargs)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def update_entry(db: AsyncSession, entry_id: UUID, **kwargs) -> ReadingLog:
    result = await db.execute(select(ReadingLog).where(ReadingLog.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading log entry not found")

    for key, value in kwargs.items():
        if value is not None and hasattr(entry, key):
            setattr(entry, key, value)
    await db.commit()
    await db.refresh(entry)
    return entry


async def get_entries(
    db: AsyncSession,
    child_id: UUID,
    is_completed: Optional[bool] = None,
) -> List[ReadingLog]:
    query = select(ReadingLog).where(ReadingLog.child_id == child_id)
    if is_completed is not None:
        query = query.where(ReadingLog.is_completed == is_completed)
    query = query.order_by(desc(ReadingLog.created_at))
    result = await db.execute(query)
    return list(result.scalars().all())


async def complete_book(db: AsyncSession, entry_id: UUID, rating: Optional[int] = None) -> ReadingLog:
    result = await db.execute(select(ReadingLog).where(ReadingLog.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading log entry not found")

    entry.is_completed = True
    entry.finish_date = date.today()
    if rating is not None:
        entry.rating = rating

    await db.commit()
    await db.refresh(entry)
    return entry


async def calculate_reading_streak(db: AsyncSession, child_id: UUID) -> Streak:
    """Get or calculate the reading streak for a child."""
    result = await db.execute(
        select(Streak).where(
            and_(Streak.child_id == child_id, Streak.streak_type == "reading")
        )
    )
    streak = result.scalar_one_or_none()

    if not streak:
        streak = Streak(
            child_id=child_id,
            streak_type="reading",
            current_streak=0,
            longest_streak=0,
        )
        db.add(streak)
        await db.commit()
        await db.refresh(streak)

    return streak
