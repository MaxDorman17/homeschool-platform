from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, get_current_parent
from app.models.models import User
from app.schemas.schemas import ChildCreate, ChildUpdate, ChildResponse
from app.services import child_service

router = APIRouter(prefix="/children", tags=["children"])


@router.get("", response_model=List[ChildResponse])
async def list_children(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    children = await child_service.get_children(db, current_user.id)
    return [ChildResponse.model_validate(c) for c in children]


@router.post("", response_model=ChildResponse, status_code=status.HTTP_201_CREATED)
async def create_child(
    data: ChildCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    child = await child_service.create_child(
        db,
        parent_id=current_user.id,
        username=data.username,
        display_name=data.display_name,
        avatar_url=data.avatar_url,
        pin_code=data.pin_code,
        date_of_birth=data.date_of_birth,
        grade_level=data.grade_level,
    )
    return ChildResponse.model_validate(child)


@router.get("/{child_id}", response_model=ChildResponse)
async def get_child(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parent_id = current_user.id if current_user.role == "parent" else None
    child = await child_service.get_child(db, child_id, parent_id)
    return ChildResponse.model_validate(child)


@router.put("/{child_id}", response_model=ChildResponse)
async def update_child(
    child_id: UUID,
    data: ChildUpdate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    child = await child_service.update_child(
        db, child_id, current_user.id,
        display_name=data.display_name,
        avatar_url=data.avatar_url,
        pin_code=data.pin_code,
        date_of_birth=data.date_of_birth,
        grade_level=data.grade_level,
        is_active=data.is_active,
    )
    return ChildResponse.model_validate(child)


@router.delete("/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_child(
    child_id: UUID,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    await child_service.delete_child(db, child_id, current_user.id)
