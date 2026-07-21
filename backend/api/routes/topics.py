from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3
from typing import List

from backend.api.auth_routes import get_db
from backend.api.routes.notes import get_current_user
from backend.api.schemas.adaptive_revision import TopicCreate, TopicUpdate
from backend.api.schemas.models import TopicRecord
from backend.database.models import DBUser
from backend.services import topics_service

router = APIRouter(prefix="/topics", tags=["Topics"])

@router.get("", response_model=List[TopicRecord])
def read_topics(
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Fetch all logged study topics for the authenticated user.
    """
    topics = topics_service.get_topics_by_user(db, current_user.id)
    return [t.to_dict() for t in topics]

@router.post("", response_model=TopicRecord, status_code=status.HTTP_201_CREATED)
def create_new_topic(
    payload: TopicCreate,
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Log a new study topic session.
    """
    # Verify if topic already exists for this user
    existing = topics_service.get_topic_by_id(db, payload.id, current_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A topic study session with this ID already exists."
        )

    topic = topics_service.create_topic(
        db=db,
        user_id=current_user.id,
        topic_id=payload.id,
        title=payload.title,
        difficulty=payload.difficulty,
        duration=payload.duration,
        confidence_score=payload.confidence_score,
        quiz_score=payload.quiz_score,
        revision_count=payload.revision_count,
        last_studied=payload.last_studied,
        document_id=payload.document_id,
        note_id=payload.note_id
    )
    return topic.to_dict()

@router.get("/gemini-key")
def get_gemini_key(
    current_user: DBUser = Depends(get_current_user)
):
    """
    Retrieve the Gemini API key from environment variables.
    """
    import os
    key = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY") or ""
    return {"key": key}

@router.put("/{topic_id}", response_model=TopicRecord)
def update_existing_topic(
    topic_id: str,
    payload: TopicUpdate,
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Modify values of an existing study topic session.
    """
    topic = topics_service.update_topic(
        db=db,
        topic_id=topic_id,
        user_id=current_user.id,
        title=payload.title,
        difficulty=payload.difficulty,
        duration=payload.duration,
        confidence_score=payload.confidence_score,
        quiz_score=payload.quiz_score,
        revision_count=payload.revision_count,
        last_studied=payload.last_studied,
        document_id=payload.document_id,
        note_id=payload.note_id
    )
    
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study topic not found or you do not have permission to modify it."
        )
        
    return topic.to_dict()

@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_topic(
    topic_id: str,
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Delete a study topic session.
    """
    success = topics_service.delete_topic(db, topic_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study topic not found or you do not have permission to delete it."
        )
    return None
