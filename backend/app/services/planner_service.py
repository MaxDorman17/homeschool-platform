from datetime import date, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import PlannerEntry, LessonAssignment


async def get_daily_plan(db: AsyncSession, child_id: UUID, plan_date: date) -> List[PlannerEntry]:
    result = await db.execute(
        select(PlannerEntry)
        .where(and_(PlannerEntry.child_id == child_id, PlannerEntry.date == plan_date))
        .order_by(PlannerEntry.slot_number)
    )
    return list(result.scalars().all())


async def get_weekly_plan(db: AsyncSession, child_id: UUID, week_start: date) -> List[PlannerEntry]:
    week_end = week_start + timedelta(days=6)
    result = await db.execute(
        select(PlannerEntry)
        .where(
            and_(
                PlannerEntry.child_id == child_id,
                PlannerEntry.date >= week_start,
                PlannerEntry.date <= week_end,
            )
        )
        .order_by(PlannerEntry.date, PlannerEntry.slot_number)
    )
    return list(result.scalars().all())


async def get_monthly_plan(db: AsyncSession, child_id: UUID, month: int, year: int) -> List[PlannerEntry]:
    import calendar
    month_start = date(year, month, 1)
    month_end = date(year, month, calendar.monthrange(year, month)[1])
    result = await db.execute(
        select(PlannerEntry)
        .where(
            and_(
                PlannerEntry.child_id == child_id,
                PlannerEntry.date >= month_start,
                PlannerEntry.date <= month_end,
            )
        )
        .order_by(PlannerEntry.date, PlannerEntry.slot_number)
    )
    return list(result.scalars().all())


async def create_planner_entry(
    db: AsyncSession,
    child_id: UUID,
    entry_date: date,
    slot_number: int,
    **kwargs,
) -> PlannerEntry:
    # Check for conflicting entry
    existing = await db.execute(
        select(PlannerEntry).where(
            and_(
                PlannerEntry.child_id == child_id,
                PlannerEntry.date == entry_date,
                PlannerEntry.slot_number == slot_number,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Slot already occupied for this date",
        )

    entry = PlannerEntry(
        child_id=child_id,
        date=entry_date,
        slot_number=slot_number,
        **kwargs,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def update_planner_entry(db: AsyncSession, entry_id: UUID, **kwargs) -> PlannerEntry:
    result = await db.execute(select(PlannerEntry).where(PlannerEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner entry not found")

    for key, value in kwargs.items():
        if value is not None and hasattr(entry, key):
            setattr(entry, key, value)
    await db.commit()
    await db.refresh(entry)
    return entry


async def delete_planner_entry(db: AsyncSession, entry_id: UUID) -> bool:
    result = await db.execute(select(PlannerEntry).where(PlannerEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner entry not found")
    await db.delete(entry)
    await db.commit()
    return True


async def rearrange_slots(db: AsyncSession, child_id: UUID, plan_date: date, slot_order: List[UUID]) -> List[PlannerEntry]:
    entries = []
    for i, entry_id in enumerate(slot_order):
        result = await db.execute(
            select(PlannerEntry).where(
                and_(
                    PlannerEntry.id == entry_id,
                    PlannerEntry.child_id == child_id,
                    PlannerEntry.date == plan_date,
                )
            )
        )
        entry = result.scalar_one_or_none()
        if entry:
            entry.slot_number = i + 1
            entries.append(entry)
    await db.commit()
    for entry in entries:
        await db.refresh(entry)
    return entries


async def auto_rollover(db: AsyncSession, child_id: UUID, from_date: date, to_date: date) -> int:
    """Move incomplete lessons from from_date to to_date."""
    rolled_over = 0
    result = await db.execute(
        select(LessonAssignment).where(
            and_(
                LessonAssignment.child_id == child_id,
                LessonAssignment.assigned_date == from_date,
                LessonAssignment.status.in_(["pending", "in_progress"]),
            )
        )
    )
    assignments = list(result.scalars().all())

    for assignment in assignments:
        assignment.assigned_date = to_date
        assignment.status = "rolled_over"
        rolled_over += 1

    if rolled_over > 0:
        await db.commit()

    return rolled_over
