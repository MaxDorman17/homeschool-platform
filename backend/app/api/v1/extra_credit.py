from datetime import datetime
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, get_current_parent
from app.models.models import User, ExtraCreditTask, Child
from app.schemas.schemas import (
    ExtraCreditTaskCreate, ExtraCreditTaskUpdate, ExtraCreditTaskResponse,
)
from app.services import progress_service

router = APIRouter(prefix="/extra-credit", tags=["extra-credit"])


@router.get("", response_model=List[ExtraCreditTaskResponse])
async def list_extra_credit(
    child_id: UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parent_id = current_user.id if current_user.role == "parent" else None
    query = select(ExtraCreditTask).where(ExtraCreditTask.child_id == child_id)
    if parent_id:
        query = query.where(ExtraCreditTask.parent_id == parent_id)
    query = query.order_by(ExtraCreditTask.created_at.desc())
    result = await db.execute(query)
    tasks = list(result.scalars().all())
    return [ExtraCreditTaskResponse.model_validate(t) for t in tasks]


@router.post("", response_model=ExtraCreditTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_extra_credit(
    data: ExtraCreditTaskCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    task = ExtraCreditTask(
        parent_id=current_user.id,
        child_id=data.child_id,
        subject_id=data.subject_id,
        title=data.title,
        description=data.description,
        xp_reward=data.xp_reward,
        task_type=data.task_type,
        instructions=data.instructions,
        due_date=data.due_date,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return ExtraCreditTaskResponse.model_validate(task)


@router.get("/{task_id}", response_model=ExtraCreditTaskResponse)
async def get_extra_credit_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ExtraCreditTask).where(ExtraCreditTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extra credit task not found")
    return ExtraCreditTaskResponse.model_validate(task)


@router.put("/{task_id}", response_model=ExtraCreditTaskResponse)
async def update_extra_credit_task(
    task_id: UUID,
    data: ExtraCreditTaskUpdate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExtraCreditTask).where(ExtraCreditTask.id == task_id, ExtraCreditTask.parent_id == current_user.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extra credit task not found")
    kwargs = data.model_dump(exclude_unset=True)
    for key, value in kwargs.items():
        setattr(task, key, value)
    await db.commit()
    await db.refresh(task)
    return ExtraCreditTaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_extra_credit_task(
    task_id: UUID,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExtraCreditTask).where(ExtraCreditTask.id == task_id, ExtraCreditTask.parent_id == current_user.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extra credit task not found")
    await db.delete(task)
    await db.commit()


@router.post("/{task_id}/complete", response_model=ExtraCreditTaskResponse)
async def complete_extra_credit_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ExtraCreditTask).where(ExtraCreditTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extra credit task not found")

    task.is_completed = True
    task.completed_at = datetime.now()
    await db.commit()
    await db.refresh(task)

    # Award XP
    if task.xp_reward > 0:
        await progress_service.award_xp(
            db, task.child_id, task.xp_reward,
            source="extra_credit",
            source_id=task.id,
            description=f"Completed extra credit: {task.title}",
        )

    return ExtraCreditTaskResponse.model_validate(task)


@router.get("/children/{child_id}/extra-credit", response_model=List[ExtraCreditTaskResponse])
async def get_child_extra_credit(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExtraCreditTask)
        .where(ExtraCreditTask.child_id == child_id)
        .order_by(ExtraCreditTask.created_at.desc())
    )
    tasks = list(result.scalars().all())
    return [ExtraCreditTaskResponse.model_validate(t) for t in tasks]
