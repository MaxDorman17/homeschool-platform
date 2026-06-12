from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Child, Subject


async def create_child(
    db: AsyncSession,
    parent_id: UUID,
    username: str,
    display_name: str,
    avatar_url: Optional[str] = None,
    pin_code: Optional[str] = None,
    date_of_birth: Optional[date] = None,
    grade_level: Optional[str] = None,
) -> Child:
    existing = await db.execute(
        select(Child).where(and_(Child.parent_id == parent_id, Child.username == username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Child with this username already exists",
        )

    child = Child(
        parent_id=parent_id,
        username=username,
        display_name=display_name,
        avatar_url=avatar_url or "/images/avatars/default.png",
        pin_code=pin_code,
        date_of_birth=date_of_birth,
        grade_level=grade_level,
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)
    return child


async def get_children(db: AsyncSession, parent_id: UUID) -> List[Child]:
    result = await db.execute(
        select(Child).where(Child.parent_id == parent_id).order_by(Child.created_at)
    )
    return list(result.scalars().all())


async def get_child(db: AsyncSession, child_id: UUID, parent_id: Optional[UUID] = None) -> Child:
    query = select(Child).where(Child.id == child_id)
    if parent_id:
        query = query.where(Child.parent_id == parent_id)

    result = await db.execute(query)
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    return child


async def update_child(db: AsyncSession, child_id: UUID, parent_id: UUID, **kwargs) -> Child:
    child = await get_child(db, child_id, parent_id)
    for key, value in kwargs.items():
        if value is not None and hasattr(child, key):
            setattr(child, key, value)
    await db.commit()
    await db.refresh(child)
    return child


async def delete_child(db: AsyncSession, child_id: UUID, parent_id: UUID) -> bool:
    child = await get_child(db, child_id, parent_id)
    await db.delete(child)
    await db.commit()
    return True


async def assign_subjects(db: AsyncSession, child_id: UUID, subject_ids: List[UUID]) -> List[Subject]:
    """Assign subjects to a child by creating lessons or linking. 
    This is a stub - actual implementation depends on how subject assignment is modeled."""
    return []


async def get_assigned_subjects(db: AsyncSession, child_id: UUID) -> List[Subject]:
    """Get subjects that have lessons assigned to the child."""
    from sqlalchemy import distinct
    from app.models.models import Lesson, LessonAssignment

    result = await db.execute(
        select(distinct(Lesson.subject_id)).where(
            Lesson.id.in_(
                select(LessonAssignment.lesson_id).where(LessonAssignment.child_id == child_id)
            )
        )
    )
    subject_ids = [row[0] for row in result.all()]

    if not subject_ids:
        return []

    result = await db.execute(select(Subject).where(Subject.id.in_(subject_ids)))
    return list(result.scalars().all())
