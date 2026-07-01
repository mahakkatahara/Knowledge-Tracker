from backend.ml.feature_engineering import build_features
from backend.ml.model import calculate_risk_score


def predict_topic_risk(topic: dict) -> dict:
    """
    Full pipeline:
    Topic → Features → Risk Score → Output
    """

    # Step 1: Feature engineering
    features = build_features(topic)

    # Step 2: Risk calculation
    result = calculate_risk_score(features)

    # Step 3: Final response format
    return {
        "topic": topic["title"],
        "features": features,
        "risk_score": result["risk_score"],
        "risk_category": result["risk_category"]
    }