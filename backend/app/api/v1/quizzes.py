from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_current_parent
from app.models.models import User
from app.schemas.schemas import (
    QuizCreate, QuizUpdate, QuizResponse,
    QuizQuestionCreate, QuizQuestionResponse,
    QuizAssignmentCreate, QuizAssignmentResponse,
    QuizAttemptCreate, QuizAttemptResponse,
)
from app.services import quiz_service as svc
from sqlalchemy import select
from app.models.models import Quiz, QuizQuestion, QuizAssignment, QuizAttempt

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


@router.get("", response_model=List[QuizResponse])
async def list_quizzes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parent_id = current_user.id if current_user.role == "parent" else None
    if not parent_id:
        from app.models.models import Child
        result = await db.execute(select(Child).where(Child.id == current_user.id))
        child = result.scalar_one_or_none()
        if child:
            parent_id = child.parent_id

    if parent_id:
        result = await db.execute(
            select(Quiz).where(Quiz.parent_id == parent_id).order_by(Quiz.created_at.desc())
        )
    else:
        result = await db.execute(select(Quiz).order_by(Quiz.created_at.desc()))
    quizzes = list(result.scalars().all())

    response = []
    for q in quizzes:
        q_resp = QuizResponse.model_validate(q)
        questions_result = await db.execute(
            select(QuizQuestion).where(QuizQuestion.quiz_id == q.id).order_by(QuizQuestion.display_order)
        )
        q_resp.questions = [QuizQuestionResponse.model_validate(qq) for qq in questions_result.scalars().all()]
        response.append(q_resp)
    return response


@router.post("", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    data: QuizCreate,
    questions: List[QuizQuestionCreate],
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    quiz = await svc.create_quiz(
        db, current_user.id, data.title, questions,
        subject_id=data.subject_id,
        description=data.description,
        instructions=data.instructions,
        time_limit_minutes=data.time_limit_minutes,
        passing_score=data.passing_score,
        max_attempts=data.max_attempts,
        is_randomized=data.is_randomized,
        show_results=data.show_results,
        difficulty=data.difficulty,
        status=data.status,
    )
    return QuizResponse.model_validate(quiz)


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quiz = await svc.get_quiz(db, quiz_id)
    resp = QuizResponse.model_validate(quiz)
    questions_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.display_order)
    )
    resp.questions = [QuizQuestionResponse.model_validate(q) for q in questions_result.scalars().all()]
    return resp


@router.put("/{quiz_id}", response_model=QuizResponse)
async def update_quiz(
    quiz_id: UUID,
    data: QuizUpdate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    kwargs = data.model_dump(exclude_unset=True)
    quiz = await svc.update_quiz(db, quiz_id, current_user.id, **kwargs)
    return QuizResponse.model_validate(quiz)


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: UUID,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    await svc.delete_quiz(db, quiz_id, current_user.id)


@router.post("/{quiz_id}/assign", response_model=QuizAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_quiz(
    quiz_id: UUID,
    data: QuizAssignmentCreate,
    current_user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    assignment = await svc.assign_quiz(db, quiz_id, data.child_id, data.assigned_date, data.due_date)
    return QuizAssignmentResponse.model_validate(assignment)


@router.post("/attempts", response_model=QuizAttemptResponse)
async def submit_attempt(
    data: QuizAttemptCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    attempt = await svc.submit_attempt(db, data.quiz_assignment_id, current_user.id, data.answers)
    return QuizAttemptResponse.model_validate(attempt)


@router.get("/attempts/{attempt_id}", response_model=QuizAttemptResponse)
async def get_attempt(
    attempt_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    return QuizAttemptResponse.model_validate(attempt)


@router.get("/children/{child_id}/quizzes", response_model=List[QuizAssignmentResponse])
async def get_child_quizzes(
    child_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assignments = await svc.get_child_quizzes(db, child_id)
    response = []
    for a in assignments:
        resp = QuizAssignmentResponse.model_validate(a)
        quiz_result = await db.execute(select(Quiz).where(Quiz.id == a.quiz_id))
        quiz = quiz_result.scalar_one_or_none()
        if quiz:
            resp.quiz = QuizResponse.model_validate(quiz)
        response.append(resp)
    return response


from app.schemas.schemas import QuizQuestionResponse as QuizQuestionResponse_schema
from app.models.models import QuizAttempt as QuizAttempt_model
