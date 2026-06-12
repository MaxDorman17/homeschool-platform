from datetime import date, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import PlannerEntry, LessonAssignment


async def generate_default_schedule(
    db: AsyncSession,
    child_id: UUID,
    week_start: Optional[date] = None,
    lesson_assignment_id: Optional[UUID] = None,
) -> List[PlannerEntry]:
    """Generate a default weekly schedule for a child.
    
    Mon-Thu: 5 slots at 9:00, 10:00, 11:00, 13:00, 14:00
    Fri: 3 slots at 9:00, 10:00, 11:00
    """
    if week_start is None:
        today = date.today()
        # Find the Monday of the current week
        week_start = today - timedelta(days=today.weekday())
    
    created_entries = []
    
    # Define schedule: (day_offset, [(slot_number, title, entry_type)])
    slots_by_day = {
        0: [(1, "Morning Lesson 1", "lesson"), (2, "Morning Lesson 2", "lesson"),
            (3, "Morning Break", "break"), (4, "Afternoon Lesson 1", "lesson"),
            (5, "Afternoon Lesson 2", "lesson")],
        1: [(1, "Morning Lesson 1", "lesson"), (2, "Morning Lesson 2", "lesson"),
            (3, "Morning Break", "break"), (4, "Afternoon Lesson 1", "lesson"),
            (5, "Afternoon Lesson 2", "lesson")],
        2: [(1, "Morning Lesson 1", "lesson"), (2, "Morning Lesson 2", "lesson"),
            (3, "Morning Break", "break"), (4, "Afternoon Lesson 1", "lesson"),
            (5, "Afternoon Lesson 2", "lesson")],
        3: [(1, "Morning Lesson 1", "lesson"), (2, "Morning Lesson 2", "lesson"),
            (3, "Morning Break", "break"), (4, "Afternoon Lesson 1", "lesson"),
            (5, "Afternoon Lesson 2", "lesson")],
        4: [(1, "Morning Lesson 1", "lesson"), (2, "Morning Lesson 2", "lesson"),
            (3, "Morning Break", "break")],
    }
    
    for day_offset, slots in slots_by_day.items():
        current_date = week_start + timedelta(days=day_offset)
        
        for slot_number, default_title, entry_type in slots:
            # Check if slot already exists
            existing = await db.execute(
                select(PlannerEntry).where(
                    and_(
                        PlannerEntry.child_id == child_id,
                        PlannerEntry.date == current_date,
                        PlannerEntry.slot_number == slot_number,
                    )
                )
            )
            if existing.scalar_one_or_none():
                continue
            
            entry = PlannerEntry(
                child_id=child_id,
                date=current_date,
                slot_number=slot_number,
                lesson_assignment_id=lesson_assignment_id,
                title=default_title if not lesson_assignment_id else None,
                entry_type=entry_type,
                is_recurring=True,
            )
            db.add(entry)
            created_entries.append(entry)
    
    await db.commit()
    for entry in created_entries:
        await db.refresh(entry)
    
    return created_entries


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
