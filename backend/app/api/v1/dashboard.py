from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from datetime import date, datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user, get_current_parent
from app.models.models import (
    User, Child, LessonAssignment, Lesson, Subject, Attendance,
    XPEvent, ChildLevel, Level, ChildBadge, Badge, Streak,
    TimelineEvent, RewardConfig,
)
from app.schemas.schemas import (
    DashboardResponse, ChildDashboardResponse, DashboardLesson,
    StreakResponse, ChildLevelResponse, ChildBadgeResponse, BadgeResponse,
    TimelineEventResponse, CurrentRewardResponse, RewardConfigResponse,
    AttendanceResponse,
)
from app.services import progress_service, reward_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/parent", response_model=DashboardResponse)
async def parent_dashboard(
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    # Get children
    result = await db.execute(
        select(Child).where(Child.parent_id == current_user.id, Child.is_active == True)
    )
    children = list(result.scalars().all())

    children_data = []
    for c in children:
        xp = await progress_service.get_child_xp(db, c.id)
        level = await progress_service.get_child_level(db, c.id)
        children_data.append({
            "id": str(c.id),
            "display_name": c.display_name,
            "avatar_url": c.avatar_url,
            "xp": xp,
            "level": level.level.level_number if level and level.level else 1,
            "level_name": level.level.name if level and level.level else "Explorer",
        })

    today = date.today()

    # Today's lessons for all children
    today_lessons = []
    for c in children:
        result = await db.execute(
            select(LessonAssignment)
            .where(
                LessonAssignment.child_id == c.id,
                LessonAssignment.assigned_date == today,
            )
            .order_by(LessonAssignment.scheduled_slot)
        )
        assignments = list(result.scalars().all())
        for a in assignments:
            lesson_result = await db.execute(select(Lesson).where(Lesson.id == a.lesson_id))
            lesson = lesson_result.scalar_one_or_none()
            if lesson:
                subject_result = await db.execute(select(Subject).where(Subject.id == lesson.subject_id))
                subject = subject_result.scalar_one_or_none()
                today_lessons.append(DashboardLesson(
                    id=a.id,
                    title=lesson.title,
                    subject_name=subject.name if subject else "General",
                    subject_color=subject.color if subject else "#6366F1",
                    status=a.status,
                    scheduled_slot=a.scheduled_slot,
                    duration_minutes=lesson.duration_minutes,
                    assignment_id=a.id,
                ))

    # Upcoming (next 7 days)
    upcoming = []
    for i in range(1, 8):
        d = today + timedelta(days=i)
        for c in children:
            result = await db.execute(
                select(LessonAssignment)
                .where(
                    LessonAssignment.child_id == c.id,
                    LessonAssignment.assigned_date == d,
                )
                .order_by(LessonAssignment.scheduled_slot)
            )
            assignments = list(result.scalars().all())
            for a in assignments:
                lesson_result = await db.execute(select(Lesson).where(Lesson.id == a.lesson_id))
                lesson = lesson_result.scalar_one_or_none()
                if lesson:
                    subject_result = await db.execute(select(Subject).where(Subject.id == lesson.subject_id))
                    subject = subject_result.scalar_one_or_none()
                    upcoming.append(DashboardLesson(
                        id=a.id,
                        title=lesson.title,
                        subject_name=subject.name if subject else "General",
                        subject_color=subject.color if subject else "#6366F1",
                        status=a.status,
                        scheduled_slot=a.scheduled_slot,
                        duration_minutes=lesson.duration_minutes,
                        assignment_id=a.id,
                    ))

    # Weekly completion rate
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    total_lessons = 0
    completed_lessons = 0
    for c in children:
        result = await db.execute(
            select(func.count(LessonAssignment.id)).where(
                LessonAssignment.child_id == c.id,
                LessonAssignment.assigned_date >= week_start,
                LessonAssignment.assigned_date <= week_end,
            )
        )
        total_lessons += result.scalar() or 0
        result = await db.execute(
            select(func.count(LessonAssignment.id)).where(
                LessonAssignment.child_id == c.id,
                LessonAssignment.assigned_date >= week_start,
                LessonAssignment.assigned_date <= week_end,
                LessonAssignment.status == "completed",
            )
        )
        completed_lessons += result.scalar() or 0

    weekly_completion = round((completed_lessons / total_lessons) * 100, 2) if total_lessons > 0 else 0

    # Attendance rate
    month_start = today.replace(day=1)
    total_days = 0
    present_days = 0
    for c in children:
        result = await db.execute(
            select(func.count(Attendance.id)).where(
                Attendance.child_id == c.id,
                Attendance.date >= month_start,
            )
        )
        total_days += result.scalar() or 0
        result = await db.execute(
            select(func.count(Attendance.id)).where(
                Attendance.child_id == c.id,
                Attendance.date >= month_start,
                Attendance.status.in_(["present", "completed"]),
            )
        )
        present_days += result.scalar() or 0
    attendance_rate = round((present_days / total_days) * 100, 2) if total_days > 0 else 0

    # Rewards
    reward_configs = []
    for c in children:
        result = await db.execute(
            select(RewardConfig).where(RewardConfig.child_id == c.id, RewardConfig.is_active == True)
        )
        configs = list(result.scalars().all())
        reward_configs.extend(configs)

    # Recent timeline
    recent = []
    for c in children:
        result = await db.execute(
            select(TimelineEvent)
            .where(TimelineEvent.child_id == c.id)
            .order_by(desc(TimelineEvent.created_at))
            .limit(10)
        )
        recent.extend(list(result.scalars().all()))
    recent.sort(key=lambda e: e.created_at or datetime.min, reverse=True)
    recent = recent[:20]

    # Achievements - recent badges
    all_badges = []
    for c in children:
        result = await db.execute(
            select(ChildBadge).where(ChildBadge.child_id == c.id).order_by(desc(ChildBadge.awarded_at)).limit(5)
        )
        child_badges = list(result.scalars().all())
        for cb in child_badges:
            badge_result = await db.execute(select(Badge).where(Badge.id == cb.badge_id))
            badge = badge_result.scalar_one_or_none()
            cb_resp = ChildBadgeResponse.model_validate(cb)
            if badge:
                cb_resp.badge = BadgeResponse.model_validate(badge)
            all_badges.append(cb_resp)

    return DashboardResponse(
        children=children_data,
        today_lessons=today_lessons,
        upcoming=upcoming,
        weekly_completion=weekly_completion,
        attendance_rate=attendance_rate,
        rewards=[RewardConfigResponse.model_validate(r) for r in reward_configs],
        achievements=all_badges,
        recent_activity=[TimelineEventResponse.model_validate(e) for e in recent],
    )


@router.get("/child", response_model=ChildDashboardResponse)
async def child_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Find the child record for this user
    result = await db.execute(
        select(Child).where(Child.username == current_user.username)
    )
    child = result.scalar_one_or_none()
    if not child:
        # If user is a parent, get first child
        result = await db.execute(
            select(Child).where(Child.parent_id == current_user.id, Child.is_active == True).limit(1)
        )
        child = result.scalar_one_or_none()

    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No child found")

    child_id = child.id
    today = date.today()

    # Today's lessons
    result = await db.execute(
        select(LessonAssignment)
        .where(
            LessonAssignment.child_id == child_id,
            LessonAssignment.assigned_date == today,
        )
        .order_by(LessonAssignment.scheduled_slot)
    )
    assignments = list(result.scalars().all())
    today_lessons = []
    for a in assignments:
        lesson_result = await db.execute(select(Lesson).where(Lesson.id == a.lesson_id))
        lesson = lesson_result.scalar_one_or_none()
        if lesson:
            subject_result = await db.execute(select(Subject).where(Subject.id == lesson.subject_id))
            subject = subject_result.scalar_one_or_none()
            today_lessons.append(DashboardLesson(
                id=a.id,
                title=lesson.title,
                subject_name=subject.name if subject else "General",
                subject_color=subject.color if subject else "#6366F1",
                status=a.status,
                scheduled_slot=a.scheduled_slot,
                duration_minutes=lesson.duration_minutes,
                assignment_id=a.id,
            ))

    # Streak
    streaks = await progress_service.get_streak_info(db, child_id)
    streak = StreakResponse.model_validate(streaks[0]) if streaks else None

    # XP
    xp = await progress_service.get_child_xp(db, child_id)

    # Level
    level = await progress_service.get_child_level(db, child_id)
    level_resp = ChildLevelResponse.model_validate(level) if level else None

    # Badges
    result = await db.execute(
        select(ChildBadge).where(ChildBadge.child_id == child_id)
    )
    child_badges = list(result.scalars().all())
    badges = []
    for cb in child_badges:
        cb_resp = ChildBadgeResponse.model_validate(cb)
        badge_result = await db.execute(select(Badge).where(Badge.id == cb.badge_id))
        badge = badge_result.scalar_one_or_none()
        if badge:
            cb_resp.badge = BadgeResponse.model_validate(badge)
        badges.append(cb_resp)

    # Monthly reward
    monthly_reward = None
    result = await db.execute(
        select(RewardConfig).where(RewardConfig.child_id == child_id, RewardConfig.is_active == True).limit(1)
    )
    config = result.scalar_one_or_none()
    if config:
        projection = await reward_service.calculate_projected_reward(db, config)
        monthly_reward = CurrentRewardResponse(
            config=RewardConfigResponse.model_validate(config),
            completion_percentage=projection["completion_percentage"],
            projected_reward=projection["projected_reward"],
            days_remaining=projection["days_remaining"],
            total_days=projection["total_days"],
            completed_days=projection["completed_days"],
        )

    # Timeline
    result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.child_id == child_id)
        .order_by(desc(TimelineEvent.created_at))
        .limit(20)
    )
    timeline = list(result.scalars().all())

    # Attendance today
    result = await db.execute(
        select(Attendance).where(
            Attendance.child_id == child_id,
            Attendance.date == today,
        )
    )
    attendance_today = result.scalar_one_or_none()
    attendance_resp = AttendanceResponse.model_validate(attendance_today) if attendance_today else None

    return ChildDashboardResponse(
        today_lessons=today_lessons,
        streak=streak,
        xp=xp,
        level=level_resp,
        badges=badges,
        monthly_reward=monthly_reward,
        timeline=[TimelineEventResponse.model_validate(e) for e in timeline],
        attendance_today=attendance_resp,
    )
