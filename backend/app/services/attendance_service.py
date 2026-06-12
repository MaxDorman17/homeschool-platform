from datetime import date, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Attendance, Streak


async def mark_attendance(
    db: AsyncSession,
    child_id: UUID,
    attendance_date: date,
    status: str,
    check_in_time=None,
    check_out_time=None,
    total_minutes: Optional[int] = None,
    notes: Optional[str] = None,
) -> Attendance:
    # Check for existing record
    result = await db.execute(
        select(Attendance).where(
            and_(Attendance.child_id == child_id, Attendance.date == attendance_date)
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Update
        existing.status = status
        if check_in_time is not None:
            existing.check_in_time = check_in_time
        if check_out_time is not None:
            existing.check_out_time = check_out_time
        if total_minutes is not None:
            existing.total_minutes = total_minutes
        if notes is not None:
            existing.notes = notes
        attendance = existing
    else:
        # Create
        attendance = Attendance(
            child_id=child_id,
            date=attendance_date,
            status=status,
            check_in_time=check_in_time,
            check_out_time=check_out_time,
            total_minutes=total_minutes,
            notes=notes,
        )
        db.add(attendance)

    await db.commit()
    await db.refresh(attendance)
    return attendance


async def get_attendance(
    db: AsyncSession,
    child_id: UUID,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> List[Attendance]:
    query = select(Attendance).where(Attendance.child_id == child_id)
    if date_from:
        query = query.where(Attendance.date >= date_from)
    if date_to:
        query = query.where(Attendance.date <= date_to)
    query = query.order_by(Attendance.date.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_attendance_statistics(db: AsyncSession, child_id: UUID, days: int = 30) -> dict:
    start_date = date.today() - timedelta(days=days)
    
    result = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.child_id == child_id,
                Attendance.date >= start_date,
            )
        )
    )
    records = list(result.scalars().all())

    total = len(records)
    present = sum(1 for r in records if r.status in ("present", "completed"))
    partially = sum(1 for r in records if r.status == "partially_completed")
    missed = sum(1 for r in records if r.status == "missed")
    excused = sum(1 for r in records if r.status == "excused")
    holiday = sum(1 for r in records if r.status == "holiday")

    total_time = sum((r.total_minutes or 0) for r in records)
    avg_time = total_time / total if total > 0 else 0

    return {
        "total_days": total,
        "present_days": present,
        "partially_completed_days": partially,
        "missed_days": missed,
        "excused_days": excused,
        "holiday_days": holiday,
        "completion_rate": round(((present + partially) / total) * 100, 2) if total > 0 else 0,
        "total_minutes": total_time,
        "average_minutes_per_day": round(avg_time, 1),
    }


async def get_attendance_trend(db: AsyncSession, child_id: UUID, days: int = 30) -> List[dict]:
    records = await get_attendance(db, child_id, date.today() - timedelta(days=days), date.today())
    return [
        {
            "date": r.date.isoformat(),
            "status": r.status,
            "total_minutes": r.total_minutes,
        }
        for r in records
    ]
