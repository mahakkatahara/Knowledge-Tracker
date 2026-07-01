from fastapi import APIRouter
from backend.api.schemas.models import RiskRequest, RiskResponse
from backend.analytics.risk_engine import calculate_forget_risk

router = APIRouter()

@router.post("/risk", response_model=RiskResponse)
def get_risk(payload: RiskRequest):
    """
    Calculates forget risk score and classification category.
    """
    risk_result = calculate_forget_risk(
        retention=payload.retention,
        days_since_last_study=payload.days_since_last_study
    )
    return RiskResponse(
        score=risk_result["score"],
        category=risk_result["category"]
    )
