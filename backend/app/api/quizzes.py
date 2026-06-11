"""Quiz API: create, take, and grade quizzes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any

from app.database import get_db
from app.models import User, Quiz, UserRole, QuizResult, ProgressRecord, ProgressStatus, WorksheetSubmission
from app.schemas import QuizCreate, QuizResponse, QuizAnswerRequest, QuizResultResponse
from app.auth import get_current_user, require_parent, require_child
from app.services.gamification import add_points, update_streak

router = APIRouter(prefix="/api/v1/quizzes", tags=["Quizzes"])


@router.post("", response_model=QuizResponse, status_code=201)
def create_quiz(
    req: QuizCreate,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """Parent creates a new quiz."""
    # Convert questions to dictionaries for JSON storage
    questions_data = [q.model_dump() for q in req.questions] if req.questions else []
    
    quiz = Quiz(
        title=req.title,
        description=req.description,
        quiz_type=req.quiz_type,
        questions=questions_data,
        pass_score=req.pass_score,
        points_reward=req.points_reward,
        created_by=current_user.id
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


@router.get("", response_model=List[QuizResponse])
def list_quizzes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all quizzes."""
    quizzes = db.query(Quiz).order_by(Quiz.created_at.desc()).all()
    return quizzes


@router.get("/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single quiz."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.post("/{quiz_id}/submit", response_model=QuizResultResponse)
def submit_quiz(
    quiz_id: int,
    req: QuizAnswerRequest,
    current_user: User = Depends(require_child),
    db: Session = Depends(get_db)
):
    """Submit quiz answers and get results."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = quiz.questions
    if not isinstance(questions, list):
        raise HTTPException(status_code=400, detail="Invalid quiz format")

    total_questions = len(questions)
    correct = 0
    processed_answers = []

    for i, question in enumerate(questions):
        user_answer = req.answers[i] if i < len(req.answers) else None
        correct_answer = question.get("correct_answer")

        is_correct = False
        if question["question_type"] in ("multiple_choice", "true_false"):
            # Answers are 0-based indices
            is_correct = user_answer == correct_answer
        elif question["question_type"] == "short_answer":
            # Case-insensitive text match
            is_correct = str(user_answer).strip().lower() == str(correct_answer).strip().lower()

        if is_correct:
            correct += 1

        processed_answers.append({
            "question_index": i,
            "user_answer": user_answer,
            "correct": is_correct
        })

    score = (correct / total_questions * 100) if total_questions > 0 else 0
    passed = score >= quiz.pass_score

    result = QuizResult(
        quiz_id=quiz_id,
        child_id=current_user.id,
        score=score,
        total_questions=total_questions,
        correct_answers=correct,
        passed=passed,
        answers=processed_answers
    )
    db.add(result)

    # Award points
    points = quiz.points_reward if passed else quiz.points_reward // 2
    from app.models import ChildProfile
    child = db.query(ChildProfile).filter(ChildProfile.user_id == current_user.id).first()
    if child:
        tx = add_points(db, child.id, points, f"Quiz: {quiz.title}")
        update_streak(db, child.id)

    db.commit()
    db.refresh(result)

    return QuizResultResponse(
        id=result.id,
        quiz_id=result.quiz_id,
        quiz_title=quiz.title,
        score=score,
        total_questions=total_questions,
        correct_answers=correct,
        passed=passed,
        completed_at=result.completed_at
    )


@router.get("/{quiz_id}/results", response_model=List[QuizResultResponse])
def get_quiz_results(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get results for a quiz (all children for parent, own results for child)."""
    query = db.query(QuizResult).filter(QuizResult.quiz_id == quiz_id)
    if current_user.role == UserRole.CHILD:
        query = query.filter(QuizResult.child_id == current_user.id)

    results = query.order_by(QuizResult.completed_at.desc()).all()
    response = []
    for r in results:
        response.append(QuizResultResponse(
            id=r.id,
            quiz_id=r.quiz_id,
            quiz_title=r.quiz.title if r.quiz else None,
            score=r.score,
            total_questions=r.total_questions,
            correct_answers=r.correct_answers,
            passed=r.passed,
            completed_at=r.completed_at
        ))
    return response
