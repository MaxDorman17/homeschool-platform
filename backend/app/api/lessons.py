"""Lesson CRUD API."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Lesson, UserRole
from app.schemas import LessonCreate, LessonResponse, LessonUpdate
from app.auth import get_current_user, require_parent

router = APIRouter(prefix="/api/v1/lessons", tags=["Lessons"])


@router.post("", response_model=LessonResponse, status_code=201)
def create_lesson(
    req: LessonCreate,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Parent creates a new lesson."""
    lesson = Lesson(
        title=req.title,
        subject=req.subject,
        topic=req.topic,
        description=req.description,
        content_type=req.content_type,
        content_url=req.content_url,
        content_body=req.content_body,
        difficulty=req.difficulty,
        points_reward=req.points_reward,
        created_by=current_user.id
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.get("", response_model=List[LessonResponse])
def list_lessons(
    subject: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all lessons (filterable by subject)."""
    query = db.query(Lesson)
    if subject:
        query = query.filter(Lesson.subject == subject)
    lessons = query.order_by(Lesson.created_at.desc()).all()
    return lessons


@router.get("/{lesson_id}", response_model=LessonResponse)
def get_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single lesson by ID."""
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.put("/{lesson_id}", response_model=LessonResponse)
def update_lesson(
    lesson_id: int,
    req: LessonUpdate,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Update a lesson (only creator can modify)."""
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id,
        Lesson.created_by == current_user.id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lesson, field, value)

    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}", status_code=204)
def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Delete a lesson."""
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id,
        Lesson.created_by == current_user.id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    db.delete(lesson)
    db.commit()
    return None
