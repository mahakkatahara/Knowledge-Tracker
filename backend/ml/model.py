
def calculate_risk_score(features: dict) -> dict:
    """
    Baseline Knowledge Decay Risk Scoring System
    (This will later be replaced by ML model)
    """

    # Extract features
    days = features["days_since_last_study"]
    duration = features["duration"]
    confidence = features["confidence_score"]
    quiz = features["quiz_score"]
    revision = features["revision_count"]
    difficulty = features["difficulty_score"]

    # 🔥 Risk contribution logic
    risk = 0

    # 1. Time decay (most important)
    risk += days * 5

    # 2. Low confidence increases risk
    risk += (5 - confidence) * 10

    # 3. Low quiz score increases risk
    risk += (100 - quiz) * 0.3

    # 4. Less revision = more risk
    risk += (3 - revision) * 8

    # 5. Difficulty weight
    risk += difficulty * 5

    # Normalize to 0–100
    risk_score = min(100, max(0, risk))

    # Category mapping
    if risk_score <= 30:
        category = "Low Risk"
    elif risk_score <= 70:
        category = "Medium Risk"
    else:
        category = "High Risk"

    return {
        "risk_score": round(risk_score, 2),
        "risk_category": category
    }