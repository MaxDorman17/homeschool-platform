from datetime import date, datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    Child, LessonAssignment, Attendance, QuizAssignment,
    WorksheetAssignment, ReadingLog, XPEvent, TimelineEvent,
    ReportCache, Subject, Lesson,
)


async def generate_daily_report(db: AsyncSession, child_id: UUID, report_date: date) -> dict:
    # Check cache first
    result = await db.execute(
        select(ReportCache).where(
            and_(
                ReportCache.child_id == child_id,
                ReportCache.report_type == "daily",
                ReportCache.period_start == report_date,
                ReportCache.period_end == report_date,
            )
        )
    )
    cached = result.scalar_one_or_none()
    if cached:
        return cached.report_data

    # Lessons
    result = await db.execute(
        select(LessonAssignment).where(
            and_(
                LessonAssignment.child_id == child_id,
                LessonAssignment.assigned_date == report_date,
            )
        )
    )
    lessons = list(result.scalars().all())
    total_lessons = len(lessons)
    completed_lessons = sum(1 for l in lessons if l.status == "completed")
    total_time = sum((l.time_spent_minutes or 0) for l in lessons)

    # Attendance
    result = await db.execute(
        select(Attendance).where(
            and_(Attendance.child_id == child_id, Attendance.date == report_date)
        )
    )
    attendance = result.scalar_one_or_none()

    # XP earned today
    result = await db.execute(
        select(func.coalesce(func.sum(XPEvent.amount), 0)).where(
            and_(
                XPEvent.child_id == child_id,
                func.date(XPEvent.awarded_at) == report_date,
            )
        )
    )
    xp_today = result.scalar() or 0

    # Timelines
    result = await db.execute(
        select(TimelineEvent)
        .where(and_(TimelineEvent.child_id == child_id, TimelineEvent.event_date == report_date))
        .order_by(TimelineEvent.created_at)
    )
    timeline = list(result.scalars().all())

    report = {
        "child_id": str(child_id),
        "date": report_date.isoformat(),
        "summary": {
            "total_lessons": total_lessons,
            "completed_lessons": completed_lessons,
            "completion_rate": round((completed_lessons / total_lessons) * 100, 2) if total_lessons > 0 else 0,
            "total_time_minutes": total_time,
            "xp_earned": xp_today,
        },
        "attendance": {
            "status": attendance.status if attendance else None,
            "total_minutes": attendance.total_minutes if attendance else None,
        } if attendance else None,
        "lessons": [
            {
                "id": str(l.id),
                "title": l.lesson.title if hasattr(l, 'lesson') and l.lesson else "Unknown",
                "status": l.status,
                "score": float(l.score) if l.score else None,
                "time_spent": l.time_spent_minutes,
            }
            for l in lessons
        ],
        "timeline": [
            {
                "type": t.event_type,
                "title": t.title,
                "xp": t.xp_earned,
            }
            for t in timeline
        ],
    }

    # Cache the report
    cache_entry = ReportCache(
        child_id=child_id,
        report_type="daily",
        period_start=report_date,
        period_end=report_date,
        report_data=report,
    )
    db.add(cache_entry)
    await db.commit()

    return report


async def generate_weekly_report(db: AsyncSession, child_id: UUID, week_start: date) -> dict:
    week_end = week_start + timedelta(days=6)

    # Check cache
    result = await db.execute(
        select(ReportCache).where(
            and_(
                ReportCache.child_id == child_id,
                ReportCache.report_type == "weekly",
                ReportCache.period_start == week_start,
                ReportCache.period_end == week_end,
            )
        )
    )
    cached = result.scalar_one_or_none()
    if cached:
        return cached.report_data

    # Aggregate daily
    daily_reports = []
    total_xp = 0
    total_lessons = 0
    completed_lessons = 0
    total_time = 0
    attendance_days = 0

    for i in range(7):
        d = week_start + timedelta(days=i)
        daily = await generate_daily_report(db, child_id, d)
        daily_reports.append(daily)
        total_xp += daily["summary"]["xp_earned"]
        total_lessons += daily["summary"]["total_lessons"]
        completed_lessons += daily["summary"]["completed_lessons"]
        total_time += daily["summary"]["total_time_minutes"]
        if daily.get("attendance") and daily["attendance"]["status"] in ("present", "completed"):
            attendance_days += 1

    report = {
        "child_id": str(child_id),
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "summary": {
            "total_lessons": total_lessons,
            "completed_lessons": completed_lessons,
            "completion_rate": round((completed_lessons / total_lessons) * 100, 2) if total_lessons > 0 else 0,
            "total_time_minutes": total_time,
            "xp_earned": total_xp,
            "attendance_days": attendance_days,
            "active_days": sum(1 for d in daily_reports if d["summary"]["total_lessons"] > 0),
        },
        "daily_breakdown": daily_reports,
    }

    cache_entry = ReportCache(
        child_id=child_id,
        report_type="weekly",
        period_start=week_start,
        period_end=week_end,
        report_data=report,
    )
    db.add(cache_entry)
    await db.commit()

    return report


async def generate_monthly_report(db: AsyncSession, child_id: UUID, month: int, year: int) -> dict:
    import calendar
    month_start = date(year, month, 1)
    month_end = date(year, month, calendar.monthrange(year, month)[1])

    # Check cache
    result = await db.execute(
        select(ReportCache).where(
            and_(
                ReportCache.child_id == child_id,
                ReportCache.report_type == "monthly",
                ReportCache.period_start == month_start,
                ReportCache.period_end == month_end,
            )
        )
    )
    cached = result.scalar_one_or_none()
    if cached:
        return cached.report_data

    # Get weekly reports for each week
    weekly_reports = []
    current = month_start
    while current <= month_end:
        week_end = current + timedelta(days=6)
        if week_end > month_end:
            week_end = month_end
        weekly = await generate_weekly_report(db, child_id, current)
        weekly_reports.append(weekly)
        current += timedelta(days=7)

    total_xp = sum(w["summary"]["xp_earned"] for w in weekly_reports)
    total_lessons = sum(w["summary"]["total_lessons"] for w in weekly_reports)
    completed = sum(w["summary"]["completed_lessons"] for w in weekly_reports)

    # Subject breakdown
    result = await db.execute(
        select(Subject).where(
            Subject.id.in_(
                select(Lesson.subject_id).where(
                    Lesson.id.in_(
                        select(LessonAssignment.lesson_id).where(
                            and_(
                                LessonAssignment.child_id == child_id,
                                LessonAssignment.assigned_date >= month_start,
                                LessonAssignment.assigned_date <= month_end,
                            )
                        )
                    )
                )
            )
        )
    )
    subjects = list(result.scalars().all())
    subject_breakdown = []
    for subject in subjects:
        result = await db.execute(
            select(func.count(LessonAssignment.id)).where(
                and_(
                    LessonAssignment.child_id == child_id,
                    LessonAssignment.assigned_date >= month_start,
                    LessonAssignment.assigned_date <= month_end,
                    Lesson.lesson_id == Lesson.id,
                    Lesson.subject_id == subject.id,
                )
            )
        )
        sub_total = result.scalar() or 0

        result = await db.execute(
            select(func.count(LessonAssignment.id)).where(
                and_(
                    LessonAssignment.child_id == child_id,
                    LessonAssignment.assigned_date >= month_start,
                    LessonAssignment.assigned_date <= month_end,
                    LessonAssignment.status == "completed",
                    Lesson.lesson_id == Lesson.id,
                    Lesson.subject_id == subject.id,
                )
            )
        )
        sub_completed = result.scalar() or 0

        subject_breakdown.append({
            "subject_id": str(subject.id),
            "name": subject.name,
            "color": subject.color,
            "total": sub_total,
            "completed": sub_completed,
            "rate": round((sub_completed / sub_total) * 100, 2) if sub_total > 0 else 0,
        })

    report = {
        "child_id": str(child_id),
        "month": month,
        "year": year,
        "period_start": month_start.isoformat(),
        "period_end": month_end.isoformat(),
        "summary": {
            "total_lessons": total_lessons,
            "completed_lessons": completed,
            "completion_rate": round((completed / total_lessons) * 100, 2) if total_lessons > 0 else 0,
            "xp_earned": total_xp,
        },
        "subject_breakdown": subject_breakdown,
        "weekly_breakdown": weekly_reports,
    }

    cache_entry = ReportCache(
        child_id=child_id,
        report_type="monthly",
        period_start=month_start,
        period_end=month_end,
        report_data=report,
    )
    db.add(cache_entry)
    await db.commit()

    return report


async def get_subject_performance(db: AsyncSession, child_id: UUID) -> list:
    result = await db.execute(
        select(
            Subject.id.label("subject_id"),
            Subject.name,
            Subject.color,
            func.count(LessonAssignment.id).label("total"),
            func.sum(
                func.cast(LessonAssignment.status == "completed", func.INTEGER)
            ).label("completed"),
            func.avg(LessonAssignment.score).label("avg_score"),
        )
        .select_from(LessonAssignment)
        .join(Lesson, LessonAssignment.lesson_id == Lesson.id)
        .join(Subject, Lesson.subject_id == Subject.id)
        .where(LessonAssignment.child_id == child_id)
        .group_by(Subject.id, Subject.name, Subject.color)
    )
    rows = result.all()
    return [
        {
            "subject_id": str(r.subject_id),
            "subject_name": r.name,
            "subject_color": r.color,
            "total_lessons": r.total or 0,
            "completed_lessons": r.completed or 0,
            "completion_rate": round(((r.completed or 0) / (r.total or 1)) * 100, 2),
            "average_score": float(r.avg_score) if r.avg_score else None,
        }
        for r in rows
    ]


async def get_attendance_trends(db: AsyncSession, child_id: UUID, days: int = 30) -> list:
    start_date = date.today() - timedelta(days=days)
    result = await db.execute(
        select(Attendance)
        .where(
            and_(
                Attendance.child_id == child_id,
                Attendance.date >= start_date,
            )
        )
        .order_by(Attendance.date)
    )
    records = list(result.scalars().all())
    return [
        {
            "date": r.date.isoformat(),
            "status": r.status,
            "total_minutes": r.total_minutes,
        }
        for r in records
    ]


async def get_completion_rates(db: AsyncSession, child_id: UUID, days: int = 30) -> list:
    start_date = date.today() - timedelta(days=days)
    result = await db.execute(
        select(
            LessonAssignment.assigned_date,
            func.count(LessonAssignment.id).label("total"),
            func.sum(
                func.cast(LessonAssignment.status == "completed", func.INTEGER)
            ).label("completed"),
        )
        .where(
            and_(
                LessonAssignment.child_id == child_id,
                LessonAssignment.assigned_date >= start_date,
            )
        )
        .group_by(LessonAssignment.assigned_date)
        .order_by(LessonAssignment.assigned_date)
    )
    rows = result.all()
    return [
        {
            "date": r.assigned_date.isoformat() if hasattr(r.assigned_date, 'isoformat') else str(r.assigned_date),
            "completed": r.completed or 0,
            "total": r.total or 0,
            "rate": round(((r.completed or 0) / (r.total or 1)) * 100, 2),
        }
        for r in rows
    ]
