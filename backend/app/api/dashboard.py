"""Dashboard API: aggregated data for parent and child views."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date, timedelta

from app.database import get_db
from app.models import (
    User, ChildProfile, Schedule, ScheduleItem, ProgressRecord,
    ProgressStatus, QuizResult, WorksheetSubmission, UserRole
)
from app.schemas import ParentDashboard, ChildDashboard
from app.auth import get_current_user, require_parent, require_child
from app.services.gamification import calculate_level, xp_to_next_level

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/parent", response_model=ParentDashboard)
def parent_dashboard(
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Get aggregated dashboard data for parent."""
    # Count children
    total_children = db.query(ChildProfile).filter(
        ChildProfile.parent_id == current_user.id
    ).count()

    # Active schedules
    active_schedules = db.query(Schedule).filter(
        Schedule.parent_id == current_user.id,
        Schedule.is_active == True
    ).count()

    # Today's submissions
    today = date.today()
    today_submissions = db.query(WorksheetSubmission).join(
        ChildProfile
    ).filter(
        ChildProfile.parent_id == current_user.id,
        WorksheetSubmission.submitted_at >= today
    ).count()

    # Recent quizzes
    recent_quizzes = db.query(QuizResult).join(
        ChildProfile
    ).filter(
        ChildProfile.parent_id == current_user.id
    ).order_by(QuizResult.completed_at.desc()).limit(5).all()

    # Weak subjects (lowest average quiz scores)
    subject_scores = db.query(
        QuizResult.quiz.in_(
            db.query(Quiz).with_entities(Quiz.id)
        )
    ).all()

    return ParentDashboard(
        total_children=total_children,
        active_schedules=active_schedules,
        today_submissions=today_submissions,
        recent_quizzes=[],  # Would map from QuizResult objects
        weak_subjects=[],
        weekly_completion_rate=0.0
    )


@router.get("/child/{child_id}", response_model=ChildDashboard)
def child_dashboard(
    child_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard data for a child (parent can view any child, child views own)."""
    child = db.query(ChildProfile).filter(
        ChildProfile.id == child_id,
        (current_user.role == UserRole.CHILD and ChildProfile.user_id == current_user.id) |
        (current_user.role == UserRole.PARENT and ChildProfile.parent_id == current_user.id)
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found or unauthorized")

    today = date.today()

    # Get today's lessons
    today_lessons = []
    today_schedule = db.query(Schedule).filter(
        Schedule.child_id == child.id,
        Schedule.is_active == True,
        Schedule.start_date <= today,
        (Schedule.end_date >= today) | (Schedule.end_date.is_(None))
    ).order_by(Schedule.start_date.desc()).first()

    if today_schedule:
        day_of_week = today.weekday()
        items = db.query(ScheduleItem).filter(
            ScheduleItem.schedule_id == today_schedule.id,
            ScheduleItem.day_of_week == day_of_week
        ).order_by(ScheduleItem.order_index).all()

        for item in items:
            progress = db.query(ProgressRecord).filter(
                ProgressRecord.child_id == child.id,
                ProgressRecord.lesson_id == item.lesson_id,
                ProgressRecord.worksheet_id == item.worksheet_id,
                ProgressRecord.quiz_id == item.quiz_id
            ).first()

            status = progress.status if progress else ProgressStatus.NOT_STARTED
            completed = status == ProgressStatus.COMPLETED

            lesson_data = {
                "lesson_id": item.lesson_id,
                "lesson_title": item.lesson.title if item.lesson else "No title",
                "subject": item.lesson.subject if item.lesson else "General",
                "completed": completed,
                "worksheet_available": item.worksheet_id is not None,
                "worksheet_completed": progress.worksheet_id is not None and completed if progress else False,
                "quiz_available": item.quiz_id is not None,
                "quiz_completed": progress.quiz_id is not None and completed if progress else False,
                "quiz_score": progress.score
            }
            today_lessons.append(lesson_data)

    # Pending counts
    pending_worksheets = db.query(ProgressRecord).filter(
        ProgressRecord.child_id == child.id,
        ProgressRecord.status == ProgressStatus.IN_PROGRESS
    ).count()

    # Level progress
    level = calculate_level(child.experience)
    xp_progress = xp_to_next_level(child.experience)

    return ChildDashboard(
        profile=None,  # Would be serialized
        points_balance=0,
        today_lessons=today_lessons,
        pending_worksheets=pending_worksheets,
        pending_quizzes=0,
        recent_badges=[],
        available_rewards=[],
        current_streak=child.current_streak,
        level_progress=xp_progress
    )
