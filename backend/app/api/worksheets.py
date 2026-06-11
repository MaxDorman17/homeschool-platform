"""Worksheet CRUD API."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os, uuid, shutil

from app.config import get_settings
from app.database import get_db
from app.models import User, Worksheet, UserRole, WorksheetType
from app.schemas import WorksheetCreate, WorksheetResponse
from app.auth import get_current_user, require_parent

settings = get_settings()
router = APIRouter(prefix="/api/v1/worksheets", tags=["Worksheets"])


@router.post("", response_model=WorksheetResponse, status_code=201)
def create_worksheet(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    worksheet_type: str = Form("uploaded"),
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Create a new worksheet."""
    ws = Worksheet(
        title=title,
        description=description,
        worksheet_type=WorksheetType(worksheet_type),
        questions=None,  # Interactive questions would be JSON in body
        points_reward=5,
        created_by=current_user.id
    )
    db.add(ws)
    db.flush()

    # If interactive, questions would be in JSON body
    # For now, uploaded files are handled below

    db.commit()
    db.refresh(ws)
    return ws


@router.post("/upload/{worksheet_id}", status_code=200)
def upload_worksheet_file(
    worksheet_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Upload a PDF or image file for a worksheet."""
    ws = db.query(Worksheet).filter(
        Worksheet.id == worksheet_id,
        Worksheet.created_by == current_user.id
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    file_name = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    ws.file_path = file_path
    ws.worksheet_type = WorksheetType.UPLOADED
    db.commit()

    return {"message": "File uploaded successfully", "file_path": file_path}


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
