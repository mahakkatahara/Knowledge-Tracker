from fastapi import APIRouter, Depends, Query, status
import sqlite3
from typing import Optional

from backend.api.auth_routes import get_db
from backend.api.routes.notes import get_current_user
from backend.api.schemas.adaptive_revision import AdaptiveRevisionRequest, AdaptiveRevisionResponse
from backend.database.models import DBUser
from backend.services import topics_service, adaptive_revision_service

router = APIRouter(prefix="/revision", tags=["Adaptive Revision Intelligence Engine (ARIE)"])

@router.get("/plan", response_model=AdaptiveRevisionResponse)
def get_persisted_revision_plan(
    max_daily_queue: int = Query(default=5, ge=1, le=50, alias="maxDailyQueue"),
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Generate a personalized study plan directly from study topics stored in the database
    for the authenticated user.
    """
    # 1. Fetch user's study topics from SQLite database
    topics = topics_service.get_topics_by_user(db, current_user.id)
    
    # Convert DBStudyTopic entities to dictionaries for the engine
    records_dict = [t.to_dict() for t in topics]
    
    # 2. Derive study plan using the service
    plan = adaptive_revision_service.create_study_plan(
        records=records_dict,
        max_daily_queue=max_daily_queue
    )
    
    return plan

@router.post("/plan", response_model=AdaptiveRevisionResponse)
def get_simulation_revision_plan(
    payload: AdaptiveRevisionRequest,
    current_user: DBUser = Depends(get_current_user)
):
    """
    Generate a simulation revision plan using ad-hoc study topics passed in the request body.
    """
    # Convert validated pydantic models back to dictionaries
    records_dict = [r.model_dump() for r in payload.records]
    
    # Derive study plan using the service
    plan = adaptive_revision_service.create_study_plan(
        records=records_dict,
        max_daily_queue=payload.max_daily_queue,
        reference_date=payload.reference_date
    )
    
    return plan
