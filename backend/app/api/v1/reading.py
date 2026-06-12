from datetime import date
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, ReadingLog
from app.schemas.schemas import (
    ReadingLogCreate, ReadingLogUpdate, ReadingLogResponse,
)
from app.services import reading_service as svc
from sqlalchemy import select

router = APIRouter(prefix="/reading-log", tags=["reading"])


@router.get("", response_model=List[ReadingLogResponse])
async def list_reading_logs(
    child_id: UUID = Query(...),
    is_completed: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries = await svc.get_entries(db, child_id, is_completed)
    return [ReadingLogResponse.model_validate(e) for e in entries]


@router.post("", response_model=ReadingLogResponse, status_code=status.HTTP_201_CREATED)
async def create_reading_entry(
    data: ReadingLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await svc.create_entry(
        db, data.child_id, data.book_title, data.start_date,
        author=data.author,
        pages=data.pages,
        pages_read=data.pages_read,
        finish_date=data.finish_date,
        notes=data.notes,
    )
    return ReadingLogResponse.model_validate(entry)


@router.put("/{entry_id}", response_model=ReadingLogResponse)
async def update_reading_entry(
    entry_id: UUID,
    data: ReadingLogUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kwargs = data.model_dump(exclude_unset=True)
    entry = await svc.update_entry(db, entry_id, **kwargs)
    return ReadingLogResponse.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reading_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ReadingLog).where(ReadingLog.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading entry not found")
    await db.delete(entry)
    await db.commit()


@router.post("/{entry_id}/complete", response_model=ReadingLogResponse)
async def complete_book(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await svc.complete_book(db, entry_id)
    return ReadingLogResponse.model_validate(entry)


@router.get("/children/{child_id}/reading-log", response_model=List[ReadingLogResponse])
async def get_child_reading_log(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries = await svc.get_entries(db, child_id)
    return [ReadingLogResponse.model_validate(e) for e in entries]
