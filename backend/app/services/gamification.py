"""Business logic for gamification: points, badges, streaks."""
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from app.models import (
    ChildProfile, UserBadge, PointTransaction, TransactionType,
    ProgressRecord, ProgressStatus, QuizResult, WorksheetSubmission
)


def add_points(db: Session, child_id: int, points: int, description: str):
    """Add (or subtract) points for a child."""
    child = db.query(ChildProfile).filter(ChildProfile.id == child_id).first()
    if not child:
        raise ValueError(f"Child {child_id} not found")

    child.user.points_balance = getattr(child.user, 'points_balance', 0)
    child.user.points_balance += points

    tx = PointTransaction(
        child_id=child_id,
        points=points,
        transaction_type=TransactionType.EARN if points > 0 else TransactionType.SPEND,
        description=description
    )
    db.add(tx)
    db.flush()  # Refresh child points balance
    return tx


def check_and_award_badges(db: Session, child_id: int) -> list:
    """Check conditions and award badges based on progress."""
    child = db.query(ChildProfile).filter(ChildProfile.id == child_id).first()
    if not child:
        return []

    new_badges = []
    today = date.today()

    # ── Lesson Completion Badges ──
    lesson_count = db.query(ProgressRecord).filter(
        ProgressRecord.child_id == child_id,
        ProgressRecord.lesson_id.isnot(None),
        ProgressRecord.status == ProgressStatus.COMPLETED
    ).count()

    lesson_badge_levels = {
        5: ("First Five", "bronze"),
        15: ("Five Lessons", "silver"),
        30: ("Learning Journey", "gold"),
        50: ("Knowledge Seeker", "platinum"),
    }
    for threshold, (name, level) in sorted(lesson_badge_levels.items()):
        if lesson_count >= threshold:
            existing = db.query(UserBadge).filter(
                UserBadge.child_id == child_id,
                UserBadge.badge_type == "lesson",
                UserBadge.badge_name == name
            ).first()
            if not existing:
                badge = UserBadge(
                    child_id=child_id,
                    badge_name=name,
                    badge_type="lesson",
                    badge_level=level
                )
                db.add(badge)
                new_badges.append(badge)

    # ── Streak Badges ──
    if child.current_streak >= 7:
        existing = db.query(UserBadge).filter(
            UserBadge.child_id == child_id,
            UserBadge.badge_type == "streak",
            UserBadge.badge_name == "Week Warrior"
        ).first()
        if not existing:
            badge = UserBadge(
                child_id=child_id,
                badge_name="Week Warrior",
                badge_type="streak",
                badge_level="gold"
            )
            db.add(badge)
            new_badges.append(badge)
    if child.current_streak >= 30:
        existing = db.query(UserBadge).filter(
            UserBadge.child_id == child_id,
            UserBadge.badge_type == "streak",
            UserBadge.badge_name == "Monthly Master"
        ).first()
        if not existing:
            badge = UserBadge(
                child_id=child_id,
                badge_name="Monthly Master",
                badge_type="streak",
                badge_level="platinum"
            )
            db.add(badge)
            new_badges.append(badge)

    # ── Perfect Score Badges ──
    perfect_count = db.query(QuizResult).filter(
        QuizResult.child_id == child_id,
        QuizResult.correct_answers == QuizResult.total_questions
    ).count()
    if perfect_count >= 5:
        existing = db.query(UserBadge).filter(
            UserBadge.child_id == child_id,
            UserBadge.badge_type == "quiz",
            UserBadge.badge_name == "Perfect Streak"
        ).first()
        if not existing:
            badge = UserBadge(
                child_id=child_id,
                badge_name="Perfect Streak",
                badge_type="quiz",
                badge_level="gold"
            )
            db.add(badge)
            new_badges.append(badge)

    if new_badges:
        db.flush()
    return new_badges


def update_streak(db: Session, child_id: int) -> bool:
    """Update the daily streak. Returns True if streak increased."""
    child = db.query(ChildProfile).filter(ChildProfile.id == child_id).first()
    if not child:
        return False

    today = date.today()
    yesterday = today - timedelta(days=1)

    has_activity_today = db.query(ProgressRecord).filter(
        ProgressRecord.child_id == child_id,
        ProgressRecord.status == ProgressStatus.COMPLETED,
        ProgressRecord.completed_at.isnot(None)
    ).count() > 0

    if not has_activity_today:
        return False

    if child.last_active_date == today:
        return False  # Already updated today

    if child.last_active_date == yesterday:
        child.current_streak += 1
    else:
        child.current_streak = 1

    child.last_active_date = today
    if child.current_streak > child.longest_streak:
        child.longest_streak = child.current_streak

    db.flush()
    return True


def calculate_level(experience: int) -> int:
    """Calculate level from experience (XP). Formula: level = sqrt(XP / 10)."""
    return int(experience ** 0.5 / 10) + 1


def xp_to_next_level(experience: int) -> float:
    """Return percentage to next level (0-100)."""
    current_level = calculate_level(experience)
    xp_needed_for_current = (current_level - 1) ** 2 * 100
    xp_needed_for_next = current_level ** 2 * 100
    progress = (experience - xp_needed_for_current) / (xp_needed_for_next - xp_needed_for_current)
    return min(100, max(0, progress * 100))
