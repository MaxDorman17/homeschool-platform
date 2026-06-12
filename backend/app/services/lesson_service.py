from datetime import date, datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Lesson, LessonAssignment, Subject


async def create_lesson(
    db: AsyncSession,
    parent_id: UUID,
    subject_id: UUID,
    title: str,
    **kwargs,
) -> Lesson:
    lesson = Lesson(parent_id=parent_id, subject_id=subject_id, title=title, **kwargs)
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


async def get_lessons(
    db: AsyncSession,
    parent_id: UUID,
    subject_id: Optional[UUID] = None,
    status: Optional[str] = None,
) -> List[Lesson]:
    query = select(Lesson).where(Lesson.parent_id == parent_id)
    if subject_id:
        query = query.where(Lesson.subject_id == subject_id)
    if status:
        query = query.where(Lesson.status == status)
    query = query.order_by(Lesson.display_order, Lesson.created_at)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_lesson(db: AsyncSession, lesson_id: UUID, parent_id: Optional[UUID] = None) -> Lesson:
    query = select(Lesson).where(Lesson.id == lesson_id)
    if parent_id:
        query = query.where(Lesson.parent_id == parent_id)
    result = await db.execute(query)
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson


async def update_lesson(db: AsyncSession, lesson_id: UUID, parent_id: UUID, **kwargs) -> Lesson:
    lesson = await get_lesson(db, lesson_id, parent_id)
    for key, value in kwargs.items():
        if value is not None and hasattr(lesson, key):
            setattr(lesson, key, value)
    await db.commit()
    await db.refresh(lesson)
    return lesson


async def delete_lesson(db: AsyncSession, lesson_id: UUID, parent_id: UUID) -> bool:
    lesson = await get_lesson(db, lesson_id, parent_id)
    await db.delete(lesson)
    await db.commit()
    return True


async def assign_lesson(
    db: AsyncSession,
    lesson_id: UUID,
    child_id: UUID,
    assigned_date: date,
    **kwargs,
) -> LessonAssignment:
    assignment = LessonAssignment(
        lesson_id=lesson_id,
        child_id=child_id,
        assigned_date=assigned_date,
        **kwargs,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def get_assignments(
    db: AsyncSession,
    child_id: Optional[UUID] = None,
    lesson_id: Optional[UUID] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> List[LessonAssignment]:
    query = select(LessonAssignment)
    if child_id:
        query = query.where(LessonAssignment.child_id == child_id)
    if lesson_id:
        query = query.where(LessonAssignment.lesson_id == lesson_id)
    if status:
        query = query.where(LessonAssignment.status == status)
    if date_from:
        query = query.where(LessonAssignment.assigned_date >= date_from)
    if date_to:
        query = query.where(LessonAssignment.assigned_date <= date_to)
    query = query.order_by(LessonAssignment.assigned_date)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_assignment(db: AsyncSession, assignment_id: UUID) -> LessonAssignment:
    result = await db.execute(
        select(LessonAssignment).where(LessonAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return assignment


async def update_assignment(db: AsyncSession, assignment_id: UUID, **kwargs) -> LessonAssignment:
    assignment = await get_assignment(db, assignment_id)
    for key, value in kwargs.items():
        if value is not None and hasattr(assignment, key):
            setattr(assignment, key, value)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def complete_lesson(
    db: AsyncSession,
    assignment_id: UUID,
    time_spent_minutes: Optional[int] = None,
    score: Optional[float] = None,
    notes: Optional[str] = None,
) -> LessonAssignment:
    assignment = await get_assignment(db, assignment_id)
    assignment.status = "completed"
    assignment.completed_at = datetime.now()
    if time_spent_minutes is not None:
        assignment.time_spent_minutes = time_spent_minutes
    if score is not None:
        assignment.score = score
    if notes is not None:
        assignment.notes = notes
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def rollover_lesson(db: AsyncSession, assignment_id: UUID, new_date: date) -> LessonAssignment:
    assignment = await get_assignment(db, assignment_id)
    assignment.assigned_date = new_date
    assignment.status = "rolled_over"
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def schedule_lesson(
    db: AsyncSession,
    assignment_id: UUID,
    scheduled_date: date,
    scheduled_slot: int,
) -> LessonAssignment:
    assignment = await get_assignment(db, assignment_id)
    assignment.scheduled_date = scheduled_date
    assignment.scheduled_slot = scheduled_slot
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def get_child_lessons(
    db: AsyncSession,
    child_id: UUID,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> List[LessonAssignment]:
    query = select(LessonAssignment).where(LessonAssignment.child_id == child_id)
    if status:
        query = query.where(LessonAssignment.status == status)
    if date_from:
        query = query.where(LessonAssignment.assigned_date >= date_from)
    if date_to:
        query = query.where(LessonAssignment.assigned_date <= date_to)
    query = query.order_by(LessonAssignment.assigned_date, LessonAssignment.scheduled_slot)
    result = await db.execute(query)
    assignments = list(result.scalars().all())

    # Eagerly load lesson and subject data
    for assignment in assignments:
        await db.refresh(assignment, ["lesson"])

    return assignments
