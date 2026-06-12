from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_current_parent
from app.models.models import User, Worksheet
from app.schemas.schemas import (
    WorksheetCreate, WorksheetUpdate, WorksheetResponse,
    WorksheetAssignmentCreate, WorksheetAssignmentResponse,
    InteractiveSubmit,
)
from app.services import worksheet_service as svc
from sqlalchemy import select
import os, shutil
from app.core.config import settings
from uuid import uuid4

router = APIRouter(prefix="/worksheets", tags=["worksheets"])


@router.get("", response_model=List[WorksheetResponse])
async def list_worksheets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parent_id = current_user.id if current_user.role == "parent" else None
    if not parent_id:
        from app.models.models import Child
        result = await db.execute(select(Child).where(Child.id == current_user.id))
        child = result.scalar_one_or_none()
        if child:
            parent_id = child.parent_id
    worksheets = await svc.get_worksheets(db, parent_id or current_user.id)
    return [WorksheetResponse.model_validate(w) for w in worksheets]


@router.post("", response_model=WorksheetResponse, status_code=status.HTTP_201_CREATED)
async def create_worksheet(
    data: WorksheetCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    worksheet = await svc.create_worksheet(
        db, current_user.id, data.title,
        subject_id=data.subject_id,
        description=data.description,
        is_interactive=data.is_interactive,
        worksheet_type=data.worksheet_type,
        interactive_data=data.interactive_data,
        status=data.status,
    )
    return WorksheetResponse.model_validate(worksheet)


@router.get("/{worksheet_id}", response_model=WorksheetResponse)
async def get_worksheet(
    worksheet_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    worksheet = await svc.get_worksheet(db, worksheet_id)
    return WorksheetResponse.model_validate(worksheet)


@router.put("/{worksheet_id}", response_model=WorksheetResponse)
async def update_worksheet(
    worksheet_id: UUID,
    data: WorksheetUpdate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    kwargs = data.model_dump(exclude_unset=True)
    worksheet = await svc.update_worksheet(db, worksheet_id, current_user.id, **kwargs)
    return WorksheetResponse.model_validate(worksheet)


@router.delete("/{worksheet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_worksheet(
    worksheet_id: UUID,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    await svc.delete_worksheet(db, worksheet_id, current_user.id)


@router.post("/{worksheet_id}/assign", response_model=WorksheetAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_worksheet(
    worksheet_id: UUID,
    data: WorksheetAssignmentCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    assignment = await svc.assign_worksheet(db, worksheet_id, data.child_id, data.assigned_date, data.due_date)
    return WorksheetAssignmentResponse.model_validate(assignment)


@router.post("/{worksheet_id}/upload")
async def upload_worksheet_file(
    worksheet_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename or "upload")[1] or ".bin"
    dest_filename = f"worksheet_{worksheet_id}_{uuid4()}{file_ext}"
    dest_path = os.path.join(upload_dir, dest_filename)

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

    with open(dest_path, "wb") as f:
        f.write(content)

    worksheet = await svc.upload_file(db, worksheet_id, dest_path, file.content_type or "application/octet-stream", len(content))
    return WorksheetResponse.model_validate(worksheet)


@router.post("/interactive/{assignment_id}/submit", response_model=WorksheetAssignmentResponse)
async def submit_interactive(
    assignment_id: UUID,
    data: InteractiveSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assignment = await svc.submit_interactive(db, assignment_id, data.answers, data.time_spent_minutes)
    return WorksheetAssignmentResponse.model_validate(assignment)
