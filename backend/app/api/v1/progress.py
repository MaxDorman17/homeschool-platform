from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.schemas.schemas import (
    XPEventCreate, XPEventResponse,
    ChildLevelResponse, ChildBadgeResponse,
    StreakResponse, TimelineEventResponse,
)
from app.services import progress_service as svc

router = APIRouter(prefix="/children/{child_id}", tags=["progress"])


@router.get("/xp")
async def get_child_xp(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    xp = await svc.get_child_xp(db, child_id)
    return {"child_id": str(child_id), "total_xp": xp}


@router.get("/level", response_model=ChildLevelResponse)
async def get_child_level(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    level = await svc.get_child_level(db, child_id)
    if not level:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No level data found")
    return ChildLevelResponse.model_validate(level)


@router.get("/badges", response_model=List[ChildBadgeResponse])
async def get_child_badges(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.models import ChildBadge, Badge
    result = await db.execute(
        select(ChildBadge).where(ChildBadge.child_id == child_id)
    )
    badges = list(result.scalars().all())
    response = []
    for cb in badges:
        resp = ChildBadgeResponse.model_validate(cb)
        badge_result = await db.execute(select(Badge).where(Badge.id == cb.badge_id))
        badge = badge_result.scalar_one_or_none()
        if badge:
            from app.schemas.schemas import BadgeResponse
            resp.badge = BadgeResponse.model_validate(badge)
        response.append(resp)
    return response


@router.get("/streaks", response_model=List[StreakResponse])
async def get_child_streaks(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    streaks = await svc.get_streak_info(db, child_id)
    return [StreakResponse.model_validate(s) for s in streaks]


@router.get("/timeline", response_model=List[TimelineEventResponse])
async def get_child_timeline(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    events = await svc.get_timeline_events(db, child_id)
    return [TimelineEventResponse.model_validate(e) for e in events]


@router.post("/xp/award", response_model=XPEventResponse, status_code=status.HTTP_201_CREATED)
async def award_xp(
    child_id: UUID,
    data: XPEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await svc.award_xp(db, child_id, data.amount, data.source, data.source_id, data.description)
    await svc.check_level_up(db, child_id)
    await svc.check_badges(db, child_id)
    return XPEventResponse.model_validate(event)
