from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, get_current_parent
from app.models.models import User, CodingProject, CodingSubmission, Child
from app.schemas.schemas import (
    CodingProjectCreate, CodingProjectUpdate, CodingProjectResponse,
    CodingSubmissionCreate, CodingSubmissionResponse,
)
from app.services import progress_service

router = APIRouter(prefix="/coding", tags=["coding"])


@router.get("/projects", response_model=List[CodingProjectResponse])
async def list_coding_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parent_id = current_user.id if current_user.role == "parent" else None
    if not parent_id:
        result = await db.execute(select(Child).where(Child.id == current_user.id))
        child = result.scalar_one_or_none()
        if child:
            parent_id = child.parent_id

    query = select(CodingProject)
    if parent_id:
        query = query.where(CodingProject.parent_id == parent_id)
    query = query.order_by(CodingProject.created_at.desc())
    result = await db.execute(query)
    projects = list(result.scalars().all())
    return [CodingProjectResponse.model_validate(p) for p in projects]


@router.post("/projects", response_model=CodingProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_coding_project(
    data: CodingProjectCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    project = CodingProject(
        parent_id=current_user.id,
        child_id=data.child_id,
        title=data.title,
        description=data.description,
        language=data.language,
        difficulty=data.difficulty,
        instructions=data.instructions,
        starter_code=data.starter_code,
        solution_code=data.solution_code,
        test_cases=data.test_cases,
        xp_reward=data.xp_reward,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return CodingProjectResponse.model_validate(project)


@router.get("/projects/{project_id}", response_model=CodingProjectResponse)
async def get_coding_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CodingProject).where(CodingProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding project not found")
    return CodingProjectResponse.model_validate(project)


@router.put("/projects/{project_id}", response_model=CodingProjectResponse)
async def update_coding_project(
    project_id: UUID,
    data: CodingProjectUpdate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CodingProject).where(CodingProject.id == project_id, CodingProject.parent_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding project not found")

    kwargs = data.model_dump(exclude_unset=True)
    for key, value in kwargs.items():
        setattr(project, key, value)
    await db.commit()
    await db.refresh(project)
    return CodingProjectResponse.model_validate(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coding_project(
    project_id: UUID,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CodingProject).where(CodingProject.id == project_id, CodingProject.parent_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding project not found")
    await db.delete(project)
    await db.commit()


@router.post("/submissions", response_model=CodingSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_coding(
    data: CodingSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CodingProject).where(CodingProject.id == data.project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding project not found")

    # Find child ID
    child_id = None
    if current_user.role == "child":
        result = await db.execute(select(Child).where(Child.username == current_user.username))
        child = result.scalar_one_or_none()
        if child:
            child_id = child.id
    else:
        child_id = project.child_id

    submission = CodingSubmission(
        project_id=data.project_id,
        child_id=child_id or data.project_id,
        code=data.code,
        language=data.language,
        is_completed=True,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    # Award XP
    if project.xp_reward > 0 and child_id:
        await progress_service.award_xp(
            db, child_id, project.xp_reward,
            source="coding",
            source_id=project.id,
            description=f"Completed coding project: {project.title}",
        )

    return CodingSubmissionResponse.model_validate(submission)


@router.get("/children/{child_id}/coding", response_model=List[CodingSubmissionResponse])
async def get_child_coding(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CodingSubmission)
        .where(CodingSubmission.child_id == child_id)
        .order_by(CodingSubmission.submitted_at.desc())
    )
    submissions = list(result.scalars().all())
    return [CodingSubmissionResponse.model_validate(s) for s in submissions]
