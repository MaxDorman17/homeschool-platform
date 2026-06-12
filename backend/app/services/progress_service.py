from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import XPEvent, Level, ChildLevel, Badge, ChildBadge, Streak, TimelineEvent


async def award_xp(
    db: AsyncSession,
    child_id: UUID,
    amount: int,
    source: str,
    source_id: Optional[UUID] = None,
    description: Optional[str] = None,
) -> XPEvent:
    event = XPEvent(
        child_id=child_id,
        amount=amount,
        source=source,
        source_id=source_id,
        description=description,
    )
    db.add(event)
    await db.flush()

    # Update child level XP
    result = await db.execute(
        select(ChildLevel).where(
            and_(ChildLevel.child_id == child_id, ChildLevel.is_current == True)
        )
    )
    child_level = result.scalar_one_or_none()
    if child_level:
        child_level.current_xp += amount
        child_level.total_xp_earned += amount

    await db.commit()
    await db.refresh(event)
    return event


async def get_child_xp(db: AsyncSession, child_id: UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.sum(XPEvent.amount), 0)).where(XPEvent.child_id == child_id)
    )
    return result.scalar() or 0


async def get_child_level(db: AsyncSession, child_id: UUID) -> Optional[ChildLevel]:
    result = await db.execute(
        select(ChildLevel)
        .where(and_(ChildLevel.child_id == child_id, ChildLevel.is_current == True))
    )
    child_level = result.scalar_one_or_none()

    if child_level:
        await db.refresh(child_level, ["level"])

    return child_level


async def check_level_up(db: AsyncSession, child_id: UUID) -> Optional[ChildLevel]:
    """Check if child has earned enough XP to level up. Create new level if so."""
    result = await db.execute(
        select(ChildLevel)
        .where(and_(ChildLevel.child_id == child_id, ChildLevel.is_current == True))
    )
    current_cl = result.scalar_one_or_none()
    if not current_cl:
        return None

    await db.refresh(current_cl, ["level"])

    # Find next level
    result = await db.execute(
        select(Level).where(Level.min_xp <= current_cl.total_xp_earned).order_by(Level.level_number.desc())
    )
    highest_level = result.scalar_one_or_none()

    if highest_level and highest_level.id != current_cl.level_id:
        # Level up!
        current_cl.is_current = False
        new_cl = ChildLevel(
            child_id=child_id,
            level_id=highest_level.id,
            current_xp=0,
            total_xp_earned=current_cl.total_xp_earned,
            xp_to_next_level=highest_level.max_xp - current_cl.total_xp_earned if highest_level.max_xp else None,
            is_current=True,
        )
        db.add(new_cl)
        await db.commit()
        await db.refresh(new_cl, ["level"])

        # Create timeline event
        tl = TimelineEvent(
            child_id=child_id,
            event_type="level_up",
            title=f"Reached Level {highest_level.level_number}: {highest_level.title}",
            description=f"Advanced to {highest_level.name} level!",
            xp_earned=0,
            icon=highest_level.icon,
            color=highest_level.color,
            event_date=date.today(),
        )
        db.add(tl)
        await db.commit()

        return new_cl

    return current_cl


async def check_badges(db: AsyncSession, child_id: UUID) -> List[Badge]:
    """Check if child has earned any new badges based on their progress."""
    total_xp = await get_child_xp(db, child_id)
    new_badges = []

    result = await db.execute(
        select(Badge).where(Badge.is_hidden == False)
    )
    all_badges = list(result.scalars().all())

    for badge in all_badges:
        # Check if already earned
        existing = await db.execute(
            select(ChildBadge).where(
                and_(ChildBadge.child_id == child_id, ChildBadge.badge_id == badge.id)
            )
        )
        if existing.scalar_one_or_none():
            continue

        earned = False

        if badge.requirement_type == "lessons_completed":
            from app.models.models import LessonAssignment
            result = await db.execute(
                select(func.count(LessonAssignment.id)).where(
                    and_(
                        LessonAssignment.child_id == child_id,
                        LessonAssignment.status == "completed",
                    )
                )
            )
            count = result.scalar() or 0
            earned = count >= (badge.requirement_value or 0)

        elif badge.requirement_type == "quizzes_completed":
            from app.models.models import QuizAssignment
            result = await db.execute(
                select(func.count(QuizAssignment.id)).where(
                    and_(
                        QuizAssignment.child_id == child_id,
                        QuizAssignment.status == "completed",
                    )
                )
            )
            count = result.scalar() or 0
            earned = count >= (badge.requirement_value or 0)

        elif badge.requirement_type == "books_completed":
            from app.models.models import ReadingLog
            result = await db.execute(
                select(func.count(ReadingLog.id)).where(
                    and_(ReadingLog.child_id == child_id, ReadingLog.is_completed == True)
                )
            )
            count = result.scalar() or 0
            earned = count >= (badge.requirement_value or 0)

        elif badge.requirement_type == "daily_streak":
            result = await db.execute(
                select(Streak).where(
                    and_(Streak.child_id == child_id, Streak.streak_type == "daily_learning")
                )
            )
            streak = result.scalar_one_or_none()
            if streak:
                earned = streak.current_streak >= (badge.requirement_value or 0)

        elif badge.requirement_type == "level_reached":
            cl = await get_child_level(db, child_id)
            if cl and cl.level:
                earned = cl.level.level_number >= (badge.requirement_value or 0)

        elif badge.requirement_type == "worksheets_completed":
            from app.models.models import WorksheetAssignment
            result = await db.execute(
                select(func.count(WorksheetAssignment.id)).where(
                    and_(
                        WorksheetAssignment.child_id == child_id,
                        WorksheetAssignment.status == "completed",
                    )
                )
            )
            count = result.scalar() or 0
            earned = count >= (badge.requirement_value or 0)

        if earned:
            cb = ChildBadge(child_id=child_id, badge_id=badge.id)
            db.add(cb)
            new_badges.append(badge)

            # Award XP for badge
            if badge.xp_reward > 0:
                await award_xp(
                    db, child_id, badge.xp_reward,
                    source="achievement", description=f"Earned badge: {badge.name}"
                )

            # Create timeline event
            tl = TimelineEvent(
                child_id=child_id,
                event_type="badge_earned",
                title=f"Badge Earned: {badge.name}",
                description=badge.description or f"Earned the {badge.name} badge!",
                xp_earned=badge.xp_reward,
                icon=badge.icon,
                color=badge.color,
                event_date=date.today(),
            )
            db.add(tl)

    if new_badges:
        await db.commit()

    return new_badges


async def get_streak_info(db: AsyncSession, child_id: UUID) -> List[Streak]:
    result = await db.execute(
        select(Streak).where(Streak.child_id == child_id)
    )
    return list(result.scalars().all())


async def update_streak(db: AsyncSession, child_id: UUID, streak_type: str = "daily_learning") -> Streak:
    today = date.today()
    yesterday = today - __import__("datetime").timedelta(days=1)

    result = await db.execute(
        select(Streak).where(
            and_(Streak.child_id == child_id, Streak.streak_type == streak_type)
        )
    )
    streak = result.scalar_one_or_none()

    if not streak:
        streak = Streak(
            child_id=child_id,
            streak_type=streak_type,
            current_streak=1,
            longest_streak=1,
            last_activity_date=today,
        )
        db.add(streak)
    else:
        if streak.last_activity_date == yesterday:
            streak.current_streak += 1
            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak
        elif streak.last_activity_date != today:
            streak.current_streak = 1
        streak.last_activity_date = today

    await db.commit()
    await db.refresh(streak)
    return streak


async def get_timeline_events(
    db: AsyncSession,
    child_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> List[TimelineEvent]:
    result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.child_id == child_id)
        .order_by(desc(TimelineEvent.created_at))
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())
