from datetime import date
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.schemas.schemas import (
    PlannerEntryCreate, PlannerEntryUpdate, PlannerEntryResponse, RearrangeSlotsRequest,
)
from app.services import planner_service as svc

router = APIRouter(prefix="/planner", tags=["planner"])


@router.post("/generate-default", response_model=List[PlannerEntryResponse], status_code=status.HTTP_201_CREATED)
async def generate_default_schedule(
    child_id: UUID = Query(...),
    lesson_assignment_id: Optional[UUID] = Query(None),
    week_start: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a default weekly schedule for a child.
    
    Mon-Thu: 5 slots at 9:00, 10:00, 11:00, 13:00, 14:00
    Fri: 3 slots at 9:00, 10:00, 11:00
    """
    entries = await svc.generate_default_schedule(
        db,
        child_id=child_id,
        week_start=week_start,
        lesson_assignment_id=lesson_assignment_id,
    )
    return [PlannerEntryResponse.model_validate(e) for e in entries]


@router.get("/daily", response_model=List[PlannerEntryResponse])
async def get_daily_plan(
    child_id: UUID = Query(...),
    plan_date: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries = await svc.get_daily_plan(db, child_id, plan_date)
    return [PlannerEntryResponse.model_validate(e) for e in entries]


@router.get("/weekly", response_model=List[PlannerEntryResponse])
async def get_weekly_plan(
    child_id: UUID = Query(...),
    week_start: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries = await svc.get_weekly_plan(db, child_id, week_start)
    return [PlannerEntryResponse.model_validate(e) for e in entries]


@router.get("/monthly", response_model=List[PlannerEntryResponse])
async def get_monthly_plan(
    child_id: UUID = Query(...),
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries = await svc.get_monthly_plan(db, child_id, month, year)
    return [PlannerEntryResponse.model_validate(e) for e in entries]


@router.post("/entries", response_model=PlannerEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_planner_entry(
    data: PlannerEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await svc.create_planner_entry(
        db,
        child_id=data.child_id,
        entry_date=data.date,
        slot_number=data.slot_number,
        lesson_assignment_id=data.lesson_assignment_id,
        title=data.title,
        entry_type=data.entry_type,
        notes=data.notes,
        is_recurring=data.is_recurring,
    )
    return PlannerEntryResponse.model_validate(entry)


@router.put("/entries/{entry_id}", response_model=PlannerEntryResponse)
async def update_planner_entry(
    entry_id: UUID,
    data: PlannerEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kwargs = data.model_dump(exclude_unset=True)
    entry = await svc.update_planner_entry(db, entry_id, **kwargs)
    return PlannerEntryResponse.model_validate(entry)


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_planner_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await svc.delete_planner_entry(db, entry_id)


@router.post("/rearrange", response_model=List[PlannerEntryResponse])
async def rearrange_slots(
    data: RearrangeSlotsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries = await svc.rearrange_slots(db, data.child_id, data.date, data.slot_order)
    return [PlannerEntryResponse.model_validate(e) for e in entries]
