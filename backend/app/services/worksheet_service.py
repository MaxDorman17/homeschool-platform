from datetime import date, datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Worksheet, WorksheetAssignment


async def create_worksheet(
    db: AsyncSession,
    parent_id: UUID,
    title: str,
    **kwargs,
) -> Worksheet:
    worksheet = Worksheet(parent_id=parent_id, title=title, **kwargs)
    db.add(worksheet)
    await db.commit()
    await db.refresh(worksheet)
    return worksheet


async def get_worksheets(db: AsyncSession, parent_id: UUID) -> List[Worksheet]:
    result = await db.execute(
        select(Worksheet).where(Worksheet.parent_id == parent_id).order_by(Worksheet.created_at.desc())
    )
    return list(result.scalars().all())


async def get_worksheet(db: AsyncSession, worksheet_id: UUID, parent_id: Optional[UUID] = None) -> Worksheet:
    query = select(Worksheet).where(Worksheet.id == worksheet_id)
    if parent_id:
        query = query.where(Worksheet.parent_id == parent_id)
    result = await db.execute(query)
    worksheet = result.scalar_one_or_none()
    if not worksheet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worksheet not found")
    return worksheet


async def update_worksheet(db: AsyncSession, worksheet_id: UUID, parent_id: UUID, **kwargs) -> Worksheet:
    worksheet = await get_worksheet(db, worksheet_id, parent_id)
    for key, value in kwargs.items():
        if value is not None and hasattr(worksheet, key):
            setattr(worksheet, key, value)
    await db.commit()
    await db.refresh(worksheet)
    return worksheet


async def delete_worksheet(db: AsyncSession, worksheet_id: UUID, parent_id: UUID) -> bool:
    worksheet = await get_worksheet(db, worksheet_id, parent_id)
    await db.delete(worksheet)
    await db.commit()
    return True


async def upload_file(db: AsyncSession, worksheet_id: UUID, file_path: str, file_type: str, file_size: int) -> Worksheet:
    result = await db.execute(select(Worksheet).where(Worksheet.id == worksheet_id))
    worksheet = result.scalar_one_or_none()
    if not worksheet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worksheet not found")

    worksheet.file_path = file_path
    worksheet.file_type = file_type
    worksheet.file_size = file_size
    await db.commit()
    await db.refresh(worksheet)
    return worksheet


async def assign_worksheet(
    db: AsyncSession,
    worksheet_id: UUID,
    child_id: UUID,
    assigned_date: date,
    due_date: Optional[date] = None,
) -> WorksheetAssignment:
    assignment = WorksheetAssignment(
        worksheet_id=worksheet_id,
        child_id=child_id,
        assigned_date=assigned_date,
        due_date=due_date,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def submit_interactive(
    db: AsyncSession,
    assignment_id: UUID,
    answers: Dict[str, Any],
    time_spent_minutes: Optional[int] = None,
) -> WorksheetAssignment:
    result = await db.execute(
        select(WorksheetAssignment).where(WorksheetAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worksheet assignment not found")

    assignment.answers = answers
    assignment.status = "completed"
    assignment.completed_at = datetime.now()
    if time_spent_minutes is not None:
        assignment.time_spent_minutes = time_spent_minutes

    await db.commit()
    await db.refresh(assignment)
    return assignment


async def grade_interactive(db: AsyncSession, assignment_id: UUID, score: float) -> WorksheetAssignment:
    result = await db.execute(
        select(WorksheetAssignment).where(WorksheetAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worksheet assignment not found")

    assignment.score = score
    await db.commit()
    await db.refresh(assignment)
    return assignment
