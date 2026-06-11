"""Schedule CRUD API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app.database import get_db
from app.models import User, Schedule, ScheduleItem, UserRole
from app.schemas import ScheduleCreate, ScheduleResponse
from app.auth import get_current_user, require_parent

router = APIRouter(prefix="/api/v1/schedules", tags=["Schedules"])


@router.post("", response_model=ScheduleResponse, status_code=201)
def create_schedule(
    req: ScheduleCreate,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Create a new schedule for a child."""
    # Verify child belongs to this parent
    from app.models import ChildProfile
    child = db.query(ChildProfile).filter(
        ChildProfile.id == req.child_id,
        ChildProfile.parent_id == current_user.id
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found or unauthorized")

    schedule = Schedule(
        parent_id=current_user.id,
        child_id=req.child_id,
        title=req.title,
        start_date=date.fromisoformat(req.start_date),
        end_date=date.fromisoformat(req.end_date) if req.end_date else None,
        is_active=True
    )
    db.add(schedule)
    db.flush()

    # Create schedule items
    items = []
    for item_data in req.items:
        item = ScheduleItem(
            schedule_id=schedule.id,
            lesson_id=item_data.lesson_id,
            worksheet_id=item_data.worksheet_id,
            quiz_id=item_data.quiz_id,
            day_of_week=item_data.day_of_week,
            order_index=item_data.order_index,
            time_slot=item_data.time_slot
        )
        db.add(item)
        items.append(item)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.get("", response_model=List[ScheduleResponse])
def list_schedules(
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """List all schedules for the parent."""
    schedules = db.query(Schedule).filter(
        Schedule.parent_id == current_user.id
    ).order_by(Schedule.start_date.desc()).all()
    return schedules


@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(
    schedule_id: int,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Get a single schedule with its items."""
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.parent_id == current_user.id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: int,
    req: ScheduleCreate,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Update a schedule and its items."""
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.parent_id == current_user.id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Update schedule fields
    schedule.title = req.title
    schedule.start_date = date.fromisoformat(req.start_date)
    schedule.end_date = date.fromisoformat(req.end_date) if req.end_date else None

    # Delete old items
    db.query(ScheduleItem).filter(ScheduleItem.schedule_id == schedule_id).delete()

    # Create new items
    for item_data in req.items:
        item = ScheduleItem(
            schedule_id=schedule.id,
            lesson_id=item_data.lesson_id,
            worksheet_id=item_data.worksheet_id,
            quiz_id=item_data.quiz_id,
            day_of_week=item_data.day_of_week,
            order_index=item_data.order_index,
            time_slot=item_data.time_slot
        )
        db.add(item)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(
    schedule_id: int,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Delete a schedule."""
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.parent_id == current_user.id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    db.delete(schedule)
    db.commit()
    return None
