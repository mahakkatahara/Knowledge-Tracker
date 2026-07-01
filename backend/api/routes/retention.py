from fastapi import APIRouter
from backend.api.schemas.models import RetentionRequest, RetentionResponse
from backend.analytics.retention import calculate_retention

router = APIRouter()

@router.post("/retention", response_model=RetentionResponse)
def get_retention(payload: RetentionRequest):
    """
    Calculates the memory retention percentage based on the Ebbinghaus decay model.
    """
    retention_val = calculate_retention(
        quiz_score=payload.quiz_score,
        confidence=payload.confidence,
        revision_count=payload.revision_count,
        difficulty=payload.difficulty,
        days_since_last_study=payload.days_since_last_study
    )
    return RetentionResponse(retention=retention_val)
