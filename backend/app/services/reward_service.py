from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import RewardConfig, RewardHistory, LessonAssignment


async def create_reward_config(
    db: AsyncSession,
    parent_id: UUID,
    child_id: UUID,
    reward_type: str = "monthly",
    target_percentage: float = 75.0,
    reward_amount: float = 45.0,
    reward_currency: str = "GBP",
    reward_name: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> RewardConfig:
    config = RewardConfig(
        parent_id=parent_id,
        child_id=child_id,
        reward_type=reward_type,
        target_percentage=target_percentage,
        reward_amount=reward_amount,
        reward_currency=reward_currency,
        reward_name=reward_name,
        start_date=start_date,
        end_date=end_date,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


async def get_reward_configs(
    db: AsyncSession,
    parent_id: Optional[UUID] = None,
    child_id: Optional[UUID] = None,
) -> List[RewardConfig]:
    query = select(RewardConfig)
    if parent_id:
        query = query.where(RewardConfig.parent_id == parent_id)
    if child_id:
        query = query.where(RewardConfig.child_id == child_id)
    query = query.order_by(RewardConfig.created_at)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_reward_config(db: AsyncSession, config_id: UUID) -> RewardConfig:
    result = await db.execute(select(RewardConfig).where(RewardConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reward config not found")
    return config


async def update_reward_config(db: AsyncSession, config_id: UUID, **kwargs) -> RewardConfig:
    config = await get_reward_config(db, config_id)
    for key, value in kwargs.items():
        if value is not None and hasattr(config, key):
            setattr(config, key, value)
    await db.commit()
    await db.refresh(config)
    return config


async def delete_reward_config(db: AsyncSession, config_id: UUID) -> bool:
    config = await get_reward_config(db, config_id)
    await db.delete(config)
    await db.commit()
    return True


async def calculate_completion_percentage(
    db: AsyncSession,
    child_id: UUID,
    start_date: date,
    end_date: date,
) -> float:
    """Calculate the percentage of lessons completed in a date range."""
    result = await db.execute(
        select(func.count(LessonAssignment.id)).where(
            and_(
                LessonAssignment.child_id == child_id,
                LessonAssignment.assigned_date >= start_date,
                LessonAssignment.assigned_date <= end_date,
            )
        )
    )
    total = result.scalar() or 0

    if total == 0:
        return 0.0

    result = await db.execute(
        select(func.count(LessonAssignment.id)).where(
            and_(
                LessonAssignment.child_id == child_id,
                LessonAssignment.assigned_date >= start_date,
                LessonAssignment.assigned_date <= end_date,
                LessonAssignment.status == "completed",
            )
        )
    )
    completed = result.scalar() or 0

    return round((completed / total) * 100, 2)


async def calculate_projected_reward(
    db: AsyncSession,
    config: RewardConfig,
) -> dict:
    today = date.today()
    start = config.start_date or today.replace(day=1)
    end = config.end_date

    if config.reward_type == "monthly":
        if not start or start < today:
            start = today.replace(day=1)
        if not end:
            import calendar
            end = today.replace(day=calendar.monthrange(today.year, today.month)[1])
    elif config.reward_type == "weekly":
        if not start or start < today:
            start = today - __import__("datetime").timedelta(days=today.weekday())
        if not end:
            end = start + __import__("datetime").timedelta(days=6)

    completion = await calculate_completion_percentage(db, config.child_id, start, end)

    total_days = (end - start).days + 1
    elapsed = (today - start).days + 1

    projected = 0.0
    if completion >= config.target_percentage:
        projected = config.reward_amount
    elif elapsed > 0:
        projected = round((completion / config.target_percentage) * config.reward_amount, 2)

    return {
        "completion_percentage": completion,
        "projected_reward": projected,
        "days_remaining": max(0, (end - today).days),
        "total_days": total_days,
        "completed_days": int(total_days * completion / 100) if total_days > 0 else 0,
        "period_start": start,
        "period_end": end,
    }


async def get_reward_history(
    db: AsyncSession,
    child_id: UUID,
    limit: int = 20,
) -> List[RewardHistory]:
    result = await db.execute(
        select(RewardHistory)
        .where(RewardHistory.child_id == child_id)
        .order_by(desc(RewardHistory.created_at))
        .limit(limit)
    )
    return list(result.scalars().all())
