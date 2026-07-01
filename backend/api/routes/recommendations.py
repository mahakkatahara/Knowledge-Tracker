from fastapi import APIRouter
from typing import List, Dict, Any
from backend.api.schemas.models import RecommendationsRequest
from backend.analytics.recommendation import rank_topics

router = APIRouter()

@router.post("/recommendations", response_model=List[Dict[str, Any]])
def get_recommendations(payload: RecommendationsRequest):
    """
    Ranks study topics by revision priority using forget risk and retention.
    """
    # Convert validated pydantic models back to dictionaries
    records_dict = [record.model_dump() for record in payload.records]
    
    # Call core analytics recommendation logic
    ranked_records = rank_topics(
        records=records_dict,
        reference_date=payload.reference_date
    )
    
    return ranked_records
