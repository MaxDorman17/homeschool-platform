"""Unit CRUD API under subjects."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.config import get_settings
from app.database import get_db
from app.models import User, Unit
from app.auth import get_current_user, require_parent
from app.schemas import UnitCreate, UnitResponse

settings = get_settings()
router = APIRouter(prefix="/api/v1/subjects/{subject_id}/units", tags=["Units"])


@router.post("", response_model=UnitResponse, status_code=201)
def create_unit(
    subject_id: int,
    title: str,
    description: Optional[str] = None,
    order_index: Optional[int] = None,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
):
    unit = Unit(
        subject_id=subject_id,
        title=title,
        description=description,
        order_index=order_index or 0,
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("", response_model=List[UnitResponse])
def list_units(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Unit).filter(Unit.subject_id == subject_id).order_by(Unit.order_index.asc(), Unit.id.asc()).all()
