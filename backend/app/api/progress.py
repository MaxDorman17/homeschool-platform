"""Progress tracking and submission API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models import (
    User, ProgressRecord, ProgressStatus, WorksheetSubmission,
    Worksheet, Lesson, ScheduleItem, UserRole
)
from app.schemas import ProgressResponse, WorksheetSubmissionCreate, WorksheetSubmissionResponse, BulkCompleteRequest
from app.auth import get_current_user, require_parent, require_child
from app.services.gamification import add_points, update_streak, check_and_award_badges

router = APIRouter(prefix="/api/v1/progress", tags=["Progress"])


@router.get("/child/{child_id}", response_model=List[ProgressResponse])
def get_child_progress(
    child_id: int,
    parent: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Parent views their child's progress."""
    from app.models import ChildProfile
    child = db.query(ChildProfile).filter(
        ChildProfile.id == child_id,
        ChildProfile.parent_id == parent.id
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    records = db.query(ProgressRecord).filter(
        ProgressRecord.child_id == child_id
    ).order_by(ProgressRecord.completed_at.desc()).all()
    return records


@router.get("/today", response_model=List[ProgressResponse])
def get_todays_tasks(
    current_user: User = Depends(require_child),
    db: Session = Depends(get_db)
):
    """Child views their tasks for today."""
    from app.models import ChildProfile, Schedule, ScheduleItem

    child = db.query(ChildProfile).filter(ChildProfile.user_id == current_user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")

    today = date.today()
    today_schedule = db.query(Schedule).filter(
        Schedule.child_id == child.id,
        Schedule.is_active == True,
        Schedule.start_date <= today,
        (Schedule.end_date >= today) | (Schedule.end_date.is_(None))
    ).order_by(Schedule.start_date.desc()).first()

    if not today_schedule:
        return []

    day_of_week = today.weekday()  # 0=Monday
    items = db.query(ScheduleItem).filter(
        ScheduleItem.schedule_id == today_schedule.id,
        ScheduleItem.day_of_week == day_of_week
    ).order_by(ScheduleItem.order_index).all()

    result = []
    for item in items:
        # Check existing progress
        existing = db.query(ProgressRecord).filter(
            ProgressRecord.child_id == child.id,
            ProgressRecord.lesson_id == item.lesson_id,
            ProgressRecord.worksheet_id == item.worksheet_id,
            ProgressRecord.quiz_id == item.quiz_id
        ).first()

        status = existing.status if existing else ProgressStatus.NOT_STARTED

        record = ProgressRecord(
            child_id=child.id,
            lesson_id=item.lesson_id,
            worksheet_id=item.worksheet_id,
            quiz_id=item.quiz_id,
            status=status
        )
        result.append(record)

    return result


@router.put("/complete/{item_id}", response_model=ProgressResponse)
def mark_complete(
    item_id: int,
    current_user: User = Depends(require_child),
    db: Session = Depends(get_db)
):
    """Mark a schedule item as complete."""
    from app.models import ChildProfile, ScheduleItem

    child = db.query(ChildProfile).filter(ChildProfile.user_id == current_user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")

    schedule_item = db.query(ScheduleItem).filter(ScheduleItem.id == item_id).first()
    if not schedule_item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Find or create progress record
    progress = db.query(ProgressRecord).filter(
        ProgressRecord.child_id == child.id,
        ProgressRecord.lesson_id == schedule_item.lesson_id,
        ProgressRecord.worksheet_id == schedule_item.worksheet_id,
        ProgressRecord.quiz_id == schedule_item.quiz_id
    ).first()

    if not progress:
        progress = ProgressRecord(
            child_id=child.id,
            lesson_id=schedule_item.lesson_id,
            worksheet_id=schedule_item.worksheet_id,
            quiz_id=schedule_item.quiz_id,
            status=ProgressStatus.COMPLETED
        )
        db.add(progress)
    else:
        progress.status = ProgressStatus.COMPLETED
        progress.completed_at = ProgressRecord.__table__.c.completed_at.server_default

    # Award points
    points = 10  # Default
    if schedule_item.lesson:
        points = schedule_item.lesson.points_reward
    if schedule_item.worksheet:
        ws = db.query(Worksheet).filter(Worksheet.id == schedule_item.worksheet_id).first()
        if ws:
            points += ws.points_reward
    if schedule_item.quiz:
        # Check quiz result
        quiz_result = db.query(QuizResult).filter(
            QuizResult.child_id == child.id,
            QuizResult.quiz_id == schedule_item.quiz_id
        ).order_by(QuizResult.completed_at.desc()).first()
        if quiz_result and quiz_result.passed:
            points += 15  # Quiz bonus

    tx = add_points(db, child.id, points, "Lesson/Task completed")
    streak_updated = update_streak(db, child.id)
    new_badges = check_and_award_badges(db, child.id)

    db.commit()

    return ProgressResponse(
        id=progress.id,
        lesson_id=progress.lesson_id,
        worksheet_id=progress.worksheet_id,
        quiz_id=progress.quiz_id,
        status=progress.status.value if hasattr(progress.status, 'value') else str(progress.status),
        score=progress.score,
        completed_at=progress.completed_at,
        notes=progress.notes
    )
