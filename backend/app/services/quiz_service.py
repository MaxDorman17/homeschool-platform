from datetime import date, datetime
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Quiz, QuizQuestion, QuizAssignment, QuizAttempt
from app.schemas.schemas import QuizQuestionCreate


async def create_quiz(
    db: AsyncSession,
    parent_id: UUID,
    title: str,
    questions_data: List[QuizQuestionCreate],
    **kwargs,
) -> Quiz:
    quiz = Quiz(parent_id=parent_id, title=title, **kwargs)
    db.add(quiz)
    await db.flush()

    for q_data in questions_data:
        question = QuizQuestion(
            quiz_id=quiz.id,
            question_type=q_data.question_type,
            question_text=q_data.question_text,
            options=q_data.options,
            correct_answer=q_data.correct_answer,
            correct_answers=q_data.correct_answers,
            explanation=q_data.explanation,
            points=q_data.points,
            image_url=q_data.image_url,
            display_order=q_data.display_order,
        )
        db.add(question)

    await db.commit()
    await db.refresh(quiz)
    return quiz


async def get_quizzes(db: AsyncSession, parent_id: UUID) -> List[Quiz]:
    result = await db.execute(
        select(Quiz).where(Quiz.parent_id == parent_id).order_by(Quiz.created_at.desc())
    )
    return list(result.scalars().all())


async def get_quiz(db: AsyncSession, quiz_id: UUID, parent_id: Optional[UUID] = None) -> Quiz:
    query = select(Quiz).where(Quiz.id == quiz_id)
    if parent_id:
        query = query.where(Quiz.parent_id == parent_id)
    result = await db.execute(query)
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    # Eager load questions
    questions_result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.display_order)
    )
    quiz._questions = list(questions_result.scalars().all())
    return quiz


async def update_quiz(db: AsyncSession, quiz_id: UUID, parent_id: UUID, **kwargs) -> Quiz:
    quiz = await get_quiz(db, quiz_id, parent_id)
    for key, value in kwargs.items():
        if value is not None and hasattr(quiz, key):
            setattr(quiz, key, value)
    await db.commit()
    await db.refresh(quiz)
    return quiz


async def delete_quiz(db: AsyncSession, quiz_id: UUID, parent_id: UUID) -> bool:
    quiz = await get_quiz(db, quiz_id, parent_id)
    await db.delete(quiz)
    await db.commit()
    return True


async def assign_quiz(
    db: AsyncSession,
    quiz_id: UUID,
    child_id: UUID,
    assigned_date: date,
    due_date: Optional[date] = None,
) -> QuizAssignment:
    assignment = QuizAssignment(
        quiz_id=quiz_id,
        child_id=child_id,
        assigned_date=assigned_date,
        due_date=due_date,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def submit_attempt(
    db: AsyncSession,
    quiz_assignment_id: UUID,
    child_id: UUID,
    answers: Dict[str, Any],
) -> QuizAttempt:
    # Get the assignment
    result = await db.execute(
        select(QuizAssignment).where(QuizAssignment.id == quiz_assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz assignment not found")

    # Get quiz questions
    result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == assignment.quiz_id).order_by(QuizQuestion.display_order)
    )
    questions = list(result.scalars().all())

    attempt_number = assignment.attempts_used + 1

    # Check max attempts
    result = await db.execute(select(Quiz).where(Quiz.id == assignment.quiz_id))
    quiz = result.scalar_one_or_none()
    if quiz and attempt_number > quiz.max_attempts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum attempts reached",
        )

    # Grade the attempt
    score, correct_count, total_points = await grade_attempt(questions, answers)

    attempt = QuizAttempt(
        quiz_assignment_id=quiz_assignment_id,
        child_id=child_id,
        attempt_number=attempt_number,
        score=score,
        total_questions=len(questions),
        correct_answers_count=correct_count,
        answers=answers,
        completed_at=datetime.now(),
    )
    db.add(attempt)

    # Update assignment
    assignment.attempts_used = attempt_number
    assignment.score = score
    assignment.total_points = total_points
    assignment.earned_points = int(total_points * score / 100) if score else 0

    if score and quiz and score >= quiz.passing_score:
        assignment.status = "completed"
        assignment.completed_at = datetime.now()

    await db.commit()
    await db.refresh(attempt)
    return attempt


async def grade_attempt(
    questions: List[QuizQuestion],
    answers: Dict[str, Any],
) -> Tuple[float, int, int]:
    """Grade a quiz attempt. Returns (score_percentage, correct_count, total_points)."""
    total_points = sum(q.points for q in questions)
    earned_points = 0
    correct_count = 0

    for question in questions:
        q_id = str(question.id)
        user_answer = answers.get(q_id)
        if user_answer is None:
            continue

        if question.question_type == "multiple_choice":
            if str(user_answer).strip().lower() == str(question.correct_answer).strip().lower():
                earned_points += question.points
                correct_count += 1

        elif question.question_type == "true_false":
            if str(user_answer).strip().lower() == str(question.correct_answer).strip().lower():
                earned_points += question.points
                correct_count += 1

        elif question.question_type == "short_answer":
            if question.correct_answer:
                if str(user_answer).strip().lower() == str(question.correct_answer).strip().lower():
                    earned_points += question.points
                    correct_count += 1
                # Partial credit for short answers? Give half.
                elif len(str(user_answer).strip()) > 0:
                    earned_points += question.points // 2
                    correct_count += 0.5

        elif question.question_type == "fill_blank":
            if question.correct_answers:
                user = str(user_answer).strip().lower()
                for key, val in question.correct_answers.items():
                    if user == str(val).strip().lower():
                        earned_points += question.points
                        correct_count += 1
                        break

        elif question.question_type == "essay":
            # Essays require manual grading - mark as needing review
            pass

    score_percentage = round((earned_points / total_points) * 100, 2) if total_points > 0 else 0
    return score_percentage, correct_count, total_points


async def get_quiz_results(db: AsyncSession, quiz_id: UUID) -> List[QuizAttempt]:
    result = await db.execute(
        select(QuizAttempt)
        .join(QuizAssignment)
        .where(QuizAssignment.quiz_id == quiz_id)
        .order_by(desc(QuizAttempt.created_at))
    )
    return list(result.scalars().all())


async def get_child_quizzes(db: AsyncSession, child_id: UUID) -> List[QuizAssignment]:
    result = await db.execute(
        select(QuizAssignment)
        .where(QuizAssignment.child_id == child_id)
        .order_by(desc(QuizAssignment.assigned_date))
    )
    return list(result.scalars().all())
