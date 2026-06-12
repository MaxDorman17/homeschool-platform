from datetime import date
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_current_parent
from app.models.models import User, Lesson, LessonAssignment, Subject
from app.schemas.schemas import (
    LessonCreate, LessonUpdate, LessonResponse,
    LessonAssignmentCreate, LessonAssignmentResponse,
    LessonAssignmentUpdate, LessonCompleteRequest, RolloverRequest,
)
from app.services import lesson_service as svc
from sqlalchemy import select

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("", response_model=List[LessonResponse])
async def list_lessons(
    subject_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parent_id = current_user.id if current_user.role == "parent" else None
    lessons = await svc.get_lessons(db, parent_id or current_user.id, subject_id, status)
    return [LessonResponse.model_validate(l) for l in lessons]


@router.post("", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    data: LessonCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    lesson = await svc.create_lesson(
        db,
        parent_id=current_user.id,
        subject_id=data.subject_id,
        title=data.title,
        description=data.description,
        content=data.content,
        notes=data.notes,
        duration_minutes=data.duration_minutes,
        difficulty=data.difficulty,
        resource_url=data.resource_url,
        resource_type=data.resource_type,
        video_url=data.video_url,
        objectives=data.objectives,
        materials_needed=data.materials_needed,
        completion_criteria=data.completion_criteria,
        is_interactive=data.is_interactive,
        display_order=data.display_order,
        status=data.status,
    )
    return LessonResponse.model_validate(lesson)


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lesson = await svc.get_lesson(db, lesson_id)
    return LessonResponse.model_validate(lesson)


@router.put("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: UUID,
    data: LessonUpdate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    kwargs = data.model_dump(exclude_unset=True)
    lesson = await svc.update_lesson(db, lesson_id, current_user.id, **kwargs)
    return LessonResponse.model_validate(lesson)


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: UUID,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    await svc.delete_lesson(db, lesson_id, current_user.id)


@router.post("/{lesson_id}/assign", response_model=LessonAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_lesson(
    lesson_id: UUID,
    data: LessonAssignmentCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    assignment = await svc.assign_lesson(
        db, lesson_id, data.child_id, data.assigned_date,
        due_date=data.due_date,
        scheduled_date=data.scheduled_date,
        scheduled_slot=data.scheduled_slot,
        notes=data.notes,
        is_extra_credit=data.is_extra_credit,
    )
    return LessonAssignmentResponse.model_validate(assignment)


@router.get("/assignments/{assignment_id}", response_model=LessonAssignmentResponse)
async def get_assignment(
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assignment = await svc.get_assignment(db, assignment_id)
    return LessonAssignmentResponse.model_validate(assignment)


@router.put("/assignments/{assignment_id}", response_model=LessonAssignmentResponse)
async def update_assignment(
    assignment_id: UUID,
    data: LessonAssignmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kwargs = data.model_dump(exclude_unset=True)
    assignment = await svc.update_assignment(db, assignment_id, **kwargs)
    return LessonAssignmentResponse.model_validate(assignment)


@router.post("/assignments/{assignment_id}/complete", response_model=LessonAssignmentResponse)
async def complete_lesson(
    assignment_id: UUID,
    data: LessonCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assignment = await svc.complete_lesson(
        db, assignment_id,
        time_spent_minutes=data.time_spent_minutes,
        score=data.score,
        notes=data.notes,
    )
    return LessonAssignmentResponse.model_validate(assignment)


@router.get("/children/{child_id}/lessons", response_model=List[LessonAssignmentResponse])
async def get_child_lessons(
    child_id: UUID,
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assignments = await svc.get_child_lessons(db, child_id, status, date_from, date_to)

    # Eager load lesson info
    result_list = []
    for a in assignments:
        resp = LessonAssignmentResponse.model_validate(a)
        # Get lesson details
        lesson_result = await db.execute(select(Lesson).where(Lesson.id == a.lesson_id))
        lesson = lesson_result.scalar_one_or_none()
        if lesson:
            resp.lesson = LessonResponse.model_validate(lesson)
        result_list.append(resp)
    return result_list


@router.post("/rollover", status_code=status.HTTP_200_OK)
async def rollover_lessons(
    data: RolloverRequest,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    from app.services.planner_service import auto_rollover
    count = await auto_rollover(db, data.child_id, data.from_date, data.to_date)
    return {"message": f"Rolled over {count} lessons", "count": count}
