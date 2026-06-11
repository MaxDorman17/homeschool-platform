"""Dashboard API: aggregated data for parent and child views."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import List
from datetime import date, timedelta

from app.database import get_db
from app.models import (
    User, ChildProfile, Schedule, ScheduleItem, ProgressRecord,
    ProgressStatus, QuizResult, WorksheetSubmission, UserRole, Quiz, Lesson
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
        or_(
            and_(current_user.role == UserRole.CHILD, ChildProfile.user_id == current_user.id),
            and_(current_user.role == UserRole.PARENT, ChildProfile.parent_id == current_user.id)
        )
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
    
    # Get total lessons completed
    total_lessons = db.query(ProgressRecord).filter(
        ProgressRecord.child_id == child.id,
        ProgressRecord.status == ProgressStatus.COMPLETED
    ).count()
    
    # Get average quiz score
    quiz_results = db.query(QuizResult).filter(
        QuizResult.child_id == child.id
    ).all()
    
    average_quiz_score = 0
    if quiz_results:
        average_quiz_score = sum(qr.score for qr in quiz_results) / len(quiz_results)
    
    # Get subject progress
    subject_progress = []
    if quiz_results:
        # For simplicity, group all quiz results as 'General'
        # In a full implementation, you'd link quizzes to subjects
        total_score = sum(qr.score for qr in quiz_results)
        avg_score = total_score / len(quiz_results) if quiz_results else 0
        subject_progress.append({
            'subject': 'General',
            'quizzes_taken': len(quiz_results),
            'average_score': round(avg_score, 1)
        })
    
    # Get recent activity
    recent_activity = []
    
    # Get recent progress records
    progress_records = db.query(ProgressRecord).filter(
        ProgressRecord.child_id == child.id
    ).order_by(ProgressRecord.completed_at.desc()).limit(10).all()
    
    for pr in progress_records:
        if pr.lesson_id:
            recent_activity.append({
                'type': 'lesson',
                'description': f"Completed lesson: {pr.lesson.title if pr.lesson else 'Unknown'}",
                'points': pr.lesson.points_reward if pr.lesson else 0,
                'created_at': pr.completed_at or pr.created_at
            })
    
    # Get recent quiz results
    for qr in quiz_results[:5]:
        recent_activity.append({
            'type': 'quiz',
            'description': f"Completed quiz: {qr.quiz.title if qr.quiz else 'Unknown'}",
            'points': qr.quiz.points_reward if qr.quiz and qr.passed else (qr.quiz.points_reward // 2 if qr.quiz else 0),
            'created_at': qr.completed_at
        })
    
    # Get recent worksheet submissions
    worksheets = db.query(WorksheetSubmission).filter(
        WorksheetSubmission.child_id == child.id
    ).order_by(WorksheetSubmission.submitted_at.desc()).limit(5).all()
    
    for ws in worksheets:
        recent_activity.append({
            'type': 'worksheet',
            'description': f"Submitted worksheet: {ws.worksheet.title if ws.worksheet else 'Unknown'}",
            'points': 5,  # Base points for worksheet
            'created_at': ws.submitted_at
        })
    
    # Sort by created_at descending and limit to 10
    recent_activity.sort(key=lambda x: x['created_at'], reverse=True)
    recent_activity = recent_activity[:10]

    return ChildDashboard(
        profile=None,  # Would be serialized
        points_balance=child.user.points_balance or 0,
        today_lessons=today_lessons,
        pending_worksheets=pending_worksheets,
        pending_quizzes=0,
        recent_badges=[],
        available_rewards=[],
        current_streak=child.current_streak,
        level_progress=xp_progress,
        total_lessons=total_lessons,
        average_quiz_score=round(average_quiz_score, 1),
        subject_progress=subject_progress,
        recent_activity=recent_activity
    )
