"""Subject CRUD API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.config import get_settings
from app.database import get_db
from app.models import User, Subject
from app.auth import get_current_user, require_parent
from app.schemas import SubjectCreate, SubjectResponse

settings = get_settings()
router = APIRouter(prefix="/api/v1/subjects", tags=["Subjects"])


@router.post("", response_model=SubjectResponse, status_code=201)
def create_subject(
    name: str,
    description: Optional[str] = None,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
):
    subj = Subject(name=name, description=description, created_by=current_user.id)
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj


@router.get("", response_model=List[SubjectResponse])
def list_subjects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Subject).order_by(Subject.name.asc()).all()


@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subj
