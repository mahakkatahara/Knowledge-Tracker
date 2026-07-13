from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3
from typing import List

from backend.api.auth_routes import get_db
from backend.api.routes.notes import get_current_user
from backend.api.schemas.activity import SessionCreate, SessionRecord
from backend.database.models import DBUser
from backend.services import sessions_service

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("", response_model=List[SessionRecord])
def read_sessions(
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """All logged study sessions for the authenticated user."""
    sessions = sessions_service.get_sessions_by_user(db, current_user.id)
    return [s.to_dict() for s in sessions]


@router.post("", response_model=SessionRecord, status_code=status.HTTP_201_CREATED)
def create_new_session(
    payload: SessionCreate,
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """Append a study session (used for weekly hours + streak)."""
    session = sessions_service.create_session(
        db=db,
        user_id=current_user.id,
        session_id=payload.id,
        date=payload.date,
        minutes=payload.minutes,
        topic_id=payload.topic_id,
    )
    return session.to_dict()


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_session(
    session_id: str,
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    success = sessions_service.delete_session(db, session_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found or you do not have permission to delete it.",
        )
    return None
