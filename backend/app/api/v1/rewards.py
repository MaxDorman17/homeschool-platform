from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_current_parent
from app.models.models import User
from app.schemas.schemas import (
    RewardConfigCreate, RewardConfigUpdate, RewardConfigResponse,
    RewardHistoryResponse, CurrentRewardResponse,
)
from app.services import reward_service as svc
from sqlalchemy import select

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("/config", response_model=List[RewardConfigResponse])
async def list_reward_configs(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    configs = await svc.get_reward_configs(db, parent_id=current_user.id)
    return [RewardConfigResponse.model_validate(c) for c in configs]


@router.post("/config", response_model=RewardConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_reward_config(
    data: RewardConfigCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    config = await svc.create_reward_config(
        db, current_user.id, data.child_id, data.reward_type,
        data.target_percentage, data.reward_amount, data.reward_currency,
        data.reward_name, data.start_date, data.end_date,
    )
    return RewardConfigResponse.model_validate(config)


@router.get("/config/{config_id}", response_model=RewardConfigResponse)
async def get_reward_config(
    config_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config = await svc.get_reward_config(db, config_id)
    return RewardConfigResponse.model_validate(config)


@router.put("/config/{config_id}", response_model=RewardConfigResponse)
async def update_reward_config(
    config_id: UUID,
    data: RewardConfigUpdate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    kwargs = data.model_dump(exclude_unset=True)
    config = await svc.update_reward_config(db, config_id, **kwargs)
    return RewardConfigResponse.model_validate(config)


@router.delete("/config/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reward_config(
    config_id: UUID,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    await svc.delete_reward_config(db, config_id)


@router.get("/children/{child_id}/rewards/current", response_model=CurrentRewardResponse)
async def get_current_reward(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    configs = await svc.get_reward_configs(db, child_id=child_id)
    if not configs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No reward config found")

    config = configs[0]
    projection = await svc.calculate_projected_reward(db, config)
    return CurrentRewardResponse(
        config=RewardConfigResponse.model_validate(config),
        completion_percentage=projection["completion_percentage"],
        projected_reward=projection["projected_reward"],
        days_remaining=projection["days_remaining"],
        total_days=projection["total_days"],
        completed_days=projection["completed_days"],
    )


@router.get("/children/{child_id}/rewards/history", response_model=List[RewardHistoryResponse])
async def get_reward_history(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    history = await svc.get_reward_history(db, child_id)
    return [RewardHistoryResponse.model_validate(h) for h in history]
