"""Worksheet CRUD API."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os, uuid, shutil

from app.config import get_settings
from app.database import get_db
from app.models import User, Worksheet, UserRole, WorksheetType
from app.schemas import WorksheetCreate, WorksheetResponse
from app.auth import get_current_user, require_parent, require_child

settings = get_settings()
router = APIRouter(prefix="/api/v1/worksheets", tags=["Worksheets"])


@router.post("", response_model=WorksheetResponse, status_code=201)
def create_worksheet(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    worksheet_type: str = Form("uploaded"),
    questions: Optional[str] = Form(None),
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
):
    """Create a new worksheet."""
    import json

    parsed_questions = None
    if questions:
        try:
            parsed_questions = json.loads(questions)
        except json.JSONDecodeError:
            parsed_questions = None

    ws = Worksheet(
        title=title,
        description=description,
        worksheet_type=WorksheetType(worksheet_type),
        questions=parsed_questions,
        points_reward=5,
        created_by=current_user.id,
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return ws


@router.post("/upload/{worksheet_id}", response_model=dict, status_code=200)
def upload_worksheet_file(
    worksheet_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
):
    """Upload a PDF or image file for a worksheet."""
    ws = db.query(Worksheet).filter(
        Worksheet.id == worksheet_id,
        Worksheet.created_by == current_user.id,
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(file.filename or "")[1] or ".pdf"
    filename = f"{worksheet_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    ws.file_path = filename
    ws.worksheet_type = WorksheetType.UPLOADED
    db.commit()
    db.refresh(ws)

    url = f"/uploads/{filename}"
    return {
        "message": "File uploaded successfully",
        "file_path": file_path,
        "file_url": url,
    }


@router.get("", response_model=List[WorksheetResponse])
def list_worksheets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all worksheets (parents see their own, children see all)."""
    query = db.query(Worksheet)
    if current_user.role == UserRole.PARENT:
        query = query.filter(Worksheet.created_by == current_user.id)
    worksheets = query.order_by(Worksheet.created_at.desc()).all()
    return worksheets


@router.get("/{worksheet_id}", response_model=WorksheetResponse)
def get_worksheet(
    worksheet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single worksheet."""
    ws = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Worksheet not found")
    return ws


@router.put("/{worksheet_id}", response_model=WorksheetResponse)
def update_worksheet(
    worksheet_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Update worksheet details."""
    ws = db.query(Worksheet).filter(
        Worksheet.id == worksheet_id,
        Worksheet.created_by == current_user.id
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    if title:
        ws.title = title
    if description:
        ws.description = description

    db.commit()
    db.refresh(ws)
    return ws


@router.delete("/{worksheet_id}", status_code=204)
def delete_worksheet(
    worksheet_id: int,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Delete a worksheet."""
    ws = db.query(Worksheet).filter(
        Worksheet.id == worksheet_id,
        Worksheet.created_by == current_user.id
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    # Delete file if exists
    if ws.file_path and os.path.exists(ws.file_path):
        os.remove(ws.file_path)

    db.delete(ws)
    db.commit()
    return None


@router.post("/{worksheet_id}/submit", response_model=dict)
def submit_worksheet(
    worksheet_id: int,
    current_user: User = Depends(require_child),
    db: Session = Depends(get_db)
):
    """Submit worksheet answers."""
    from app.models import ChildProfile, WorksheetSubmission, Worksheet
    from app.schemas import WorksheetSubmissionCreate
    
    # Get worksheet
    ws = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Worksheet not found")
    
    # Get child
    child = db.query(ChildProfile).filter(ChildProfile.user_id == current_user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")
    
    # Create submission (empty for now, answers stored in database)
    submission = WorksheetSubmission(
        child_id=child.id,
        worksheet_id=worksheet_id,
        answers=None  # Would store JSON answers
    )
    db.add(submission)
    
    # Award points for submission
    points = 5  # Base points for submission
    from app.services.gamification import add_points, update_streak, check_and_award_badges
    
    tx = add_points(db, child.id, points, "Worksheet submitted")
    update_streak(db, child.id)
    check_and_award_badges(db, child.id)
    
    db.commit()
    
    return {
        "message": "Worksheet submitted successfully",
        "points_earned": points,
        "total_points": current_user.points_balance or 0
    }
