from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_current_parent
from app.models.models import User
from app.schemas.schemas import SubjectCreate, SubjectUpdate, SubjectResponse
from app.services import child_service
from sqlalchemy import select
from app.models.models import Subject

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("", response_model=List[SubjectResponse])
async def list_subjects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parent_id = current_user.id if current_user.role == "parent" else None
    if parent_id is None and current_user.role == "child":
        # Child sees parent's subjects via their parent
        from app.models.models import Child
        result = await db.execute(select(Child).where(Child.id == current_user.id))
        child = result.scalar_one_or_none()
        if child:
            parent_id = child.parent_id

    if parent_id:
        result = await db.execute(
            select(Subject).where(Subject.parent_id == parent_id).order_by(Subject.display_order)
        )
    else:
        result = await db.execute(select(Subject).order_by(Subject.display_order))

    subjects = list(result.scalars().all())
    return [SubjectResponse.model_validate(s) for s in subjects]


@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    data: SubjectCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    subject = Subject(
        parent_id=current_user.id,
        name=data.name,
        description=data.description,
        color=data.color,
        icon=data.icon,
        display_order=data.display_order,
        is_active=data.is_active,
    )
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return SubjectResponse.model_validate(subject)


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return SubjectResponse.model_validate(subject)


@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: UUID,
    data: SubjectUpdate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subject).where(Subject.id == subject_id, Subject.parent_id == current_user.id)
    )
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(subject, key, value)
    await db.commit()
    await db.refresh(subject)
    return SubjectResponse.model_validate(subject)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: UUID,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subject).where(Subject.id == subject_id, Subject.parent_id == current_user.id)
    )
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    await db.delete(subject)
    await db.commit()


@router.get("/children/{child_id}/subjects", response_model=List[SubjectResponse])
async def get_child_subjects(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    subjects = await child_service.get_assigned_subjects(db, child_id)
    return [SubjectResponse.model_validate(s) for s in subjects]
