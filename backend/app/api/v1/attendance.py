from datetime import date
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Attendance
from app.schemas.schemas import (
    AttendanceCreate, AttendanceUpdate, AttendanceResponse, AttendanceStats,
)
from app.services import attendance_service as svc
from sqlalchemy import select

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
async def mark_attendance(
    data: AttendanceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await svc.mark_attendance(
        db, data.child_id, data.date, data.status,
        data.check_in_time, data.check_out_time,
        data.total_minutes, data.notes,
    )
    return AttendanceResponse.model_validate(record)


@router.get("", response_model=List[AttendanceResponse])
async def get_attendance(
    child_id: UUID = Query(...),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    records = await svc.get_attendance(db, child_id, date_from, date_to)
    return [AttendanceResponse.model_validate(r) for r in records]


@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: UUID,
    data: AttendanceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Attendance).where(Attendance.id == attendance_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    kwargs = data.model_dump(exclude_unset=True)
    for key, value in kwargs.items():
        setattr(record, key, value)
    await db.commit()
    await db.refresh(record)
    return AttendanceResponse.model_validate(record)


@router.get("/children/{child_id}/stats", response_model=AttendanceStats)
async def get_attendance_stats(
    child_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stats = await svc.get_attendance_statistics(db, child_id, days)
    return AttendanceStats(**stats)


@router.get("/children/{child_id}/trend")
async def get_attendance_trend(
    child_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trend = await svc.get_attendance_trend(db, child_id, days)
    return {"trend": trend}
