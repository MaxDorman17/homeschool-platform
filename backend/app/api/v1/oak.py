from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.schemas.schemas import OakImportLesson, OakImportQuiz, OakCachedResponse
from app.services import oak_service as svc

router = APIRouter(prefix="/oak", tags=["oak-academy"])


@router.get("/subjects")
async def get_oak_subjects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    subjects = await svc.get_subject_list(db, current_user.id)
    return {"subjects": subjects}


@router.get("/subjects/{subject}")
async def get_oak_subject_detail(
    subject: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    detail = await svc.get_subject_detail(db, current_user.id, subject)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return detail


@router.get("/units")
async def get_oak_units(
    key_stage: str = Query(...),
    subject: str = Query(...),
    year: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    units = await svc.get_curriculum_units(db, current_user.id, subject, key_stage=key_stage, year=year)
    return {"units": units}


@router.get("/lessons")
async def get_oak_lessons(
    key_stage: str = Query(...),
    subject: str = Query(...),
    year: Optional[str] = Query(None),
    unit: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lessons = await svc.search_lessons(db, current_user.id, subject, unit, year, key_stage=key_stage)
    return {"lessons": lessons}


@router.get("/lessons/{lesson_slug}/summary")
async def get_oak_lesson_summary(
    lesson_slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    summary = await svc.get_lesson_summary(db, current_user.id, lesson_slug)
    if summary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return summary


@router.get("/lessons/{lesson_slug}/quiz")
async def get_oak_lesson_quiz(
    lesson_slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quiz = await svc.get_lesson_quiz(db, current_user.id, lesson_slug)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found for this lesson")
    return quiz


@router.get("/search")
async def search_oak_lessons(
    q: str = Query(..., description="Search query for lesson title"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    results = await svc.search_lessons_by_title(db, current_user.id, q)
    return {"results": results}


@router.post("/import/lesson", status_code=status.HTTP_201_CREATED)
async def import_oak_lesson(
    data: OakImportLesson,
    subject_id: UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lesson = await svc.import_lesson(
        db, current_user.id, subject_id, data.oak_id, data.title, data.content,
        data.subject_slug, data.year_slug, data.unit_slug, data.lesson_slug,
    )
    return {"id": str(lesson.id), "title": lesson.title, "message": "Lesson imported successfully"}


@router.post("/import/quiz", status_code=status.HTTP_201_CREATED)
async def import_oak_quiz(
    data: OakImportQuiz,
    subject_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quiz = await svc.import_quiz(
        db, current_user.id, subject_id, data.oak_id, data.title, data.content,
        data.subject_slug, data.year_slug, data.unit_slug, data.lesson_slug,
    )
    return {"id": str(quiz.id), "title": quiz.title, "message": "Quiz imported successfully"}


@router.get("/cached", response_model=List[OakCachedResponse])
async def get_cached_oak(
    data_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cached = await svc.get_cached_content(db, current_user.id, data_type)
    return [OakCachedResponse.model_validate(c) for c in cached]
