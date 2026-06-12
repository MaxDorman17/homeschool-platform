from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.services import report_service as svc

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/daily")
async def daily_report(
    child_id: UUID = Query(...),
    report_date: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = await svc.generate_daily_report(db, child_id, report_date)
    return report


@router.get("/weekly")
async def weekly_report(
    child_id: UUID = Query(...),
    week_start: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = await svc.generate_weekly_report(db, child_id, week_start)
    return report


@router.get("/monthly")
async def monthly_report(
    child_id: UUID = Query(...),
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = await svc.generate_monthly_report(db, child_id, month, year)
    return report


@router.get("/subject-performance")
async def subject_performance(
    child_id: UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    performance = await svc.get_subject_performance(db, child_id)
    return {"subjects": performance}


@router.get("/attendance-trends")
async def attendance_trends(
    child_id: UUID = Query(...),
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trends = await svc.get_attendance_trends(db, child_id, days)
    return {"trends": trends}


@router.get("/completion-rates")
async def completion_rates(
    child_id: UUID = Query(...),
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rates = await svc.get_completion_rates(db, child_id, days)
    return {"rates": rates}
