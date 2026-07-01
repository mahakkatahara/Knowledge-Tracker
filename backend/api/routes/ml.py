from fastapi import APIRouter
from backend.ml.predictor import predict_topic_risk

router = APIRouter(prefix="/ml")


@router.post("/predict")
def predict_risk(topic: dict):
    return {
        "success": True,
        "data": predict_topic_risk(topic)
    }