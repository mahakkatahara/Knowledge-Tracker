from fastapi import APIRouter, Depends, status
import sqlite3
from typing import List

from backend.api.auth_routes import get_db
from backend.api.routes.notes import get_current_user
from backend.api.schemas.activity import QuizAttemptCreate, QuizAttemptRecord
from backend.database.models import DBUser
from backend.services import quiz_service

router = APIRouter(prefix="/quiz-history", tags=["Quiz History"])


@router.get("", response_model=List[QuizAttemptRecord])
def read_quiz_history(
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """All quiz attempts for the authenticated user."""
    attempts = quiz_service.get_history_by_user(db, current_user.id)
    return [a.to_dict() for a in attempts]


@router.post("", response_model=QuizAttemptRecord, status_code=status.HTTP_201_CREATED)
def create_new_attempt(
    payload: QuizAttemptCreate,
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """Record a completed quiz attempt."""
    attempt = quiz_service.create_attempt(
        db=db,
        user_id=current_user.id,
        attempt_id=payload.id,
        date=payload.date,
        mode=payload.mode,
        difficulty=payload.difficulty,
        score=payload.score,
        total=payload.total,
        correct=payload.correct,
    )
    return attempt.to_dict()
