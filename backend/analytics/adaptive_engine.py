import math
from typing import Dict, Any, List, Optional, Union
from datetime import date, datetime
from backend.analytics.utils import get_days_elapsed, js_round
from backend.analytics.retention import calculate_retention
from backend.analytics.risk_engine import calculate_forget_risk

def calculate_priority_score(
    retention: float,
    quiz_score: float,
    confidence: int,
    difficulty: str,
    days_elapsed: int
) -> int:
    """
    Calculates a priority score from 0 to 100 based on memory decay,
    mastery gap, and urgency.
    """
    # 1. Decay Factor (Weight = 0.40)
    # Inverse of retention percentage
    decay_factor = 100.0 - float(retention)

    # 2. Mastery Gap (Weight = 0.35)
    # Quiz score (max 100) and confidence (1-5 mapped to 0-100)
    quiz_clamped = max(0.0, min(100.0, float(quiz_score)))
    confidence_clamped = max(1, min(5, int(confidence)))
    confidence_percent = ((confidence_clamped - 1) / 4.0) * 100.0
    
    mastery_gap = 0.60 * (100.0 - quiz_clamped) + 0.40 * (100.0 - confidence_percent)

    # 3. Urgency & Difficulty (Weight = 0.25)
    # Difficulty weights: Easy = 30, Medium = 70, Hard = 100
    diff_clean = str(difficulty or "Medium").strip().capitalize()
    if diff_clean == "Easy":
        difficulty_factor = 30.0
    elif diff_clean == "Hard":
        difficulty_factor = 100.0
    else:
        difficulty_factor = 70.0

    # Time Urgency based on asymptotic exponential curve
    # lambda = 0.1 means urgency approaches 100% asymptotically over ~3-4 weeks
    days = max(0, int(days_elapsed))
    time_urgency = 100.0 * (1.0 - math.exp(-0.1 * days))

    urgency_factor = 0.50 * difficulty_factor + 0.50 * time_urgency

    # Combined Priority Score calculation
    priority_score = 0.40 * decay_factor + 0.35 * mastery_gap + 0.25 * urgency_factor
    
    return min(100, max(0, js_round(priority_score)))

def generate_personalized_plan(
    records: List[Dict[str, Any]],
    reference_date: Optional[Union[str, date, datetime]] = None
) -> List[Dict[str, Any]]:
    """
    Annotates study records with computed metrics and priority scores,
    and returns them sorted in descending order of revision priority.
    """
    if not records:
        return []

    annotated_records = []

    for record in records:
        # Support both camelCase and snake_case field access
        last_studied = record.get("lastStudied") or record.get("last_studied")
        quiz_score = record.get("quizScore")
        if quiz_score is None:
            quiz_score = record.get("quiz_score", 0)

        confidence = record.get("confidenceScore")
        if confidence is None:
            confidence = record.get("confidence_score")
        if confidence is None:
            confidence = record.get("confidence", 3)

        revision_count = record.get("revisionCount")
        if revision_count is None:
            revision_count = record.get("revision_count", 0)

        difficulty = record.get("difficulty", "Medium")

        # Days elapsed since last studied
        days_elapsed = get_days_elapsed(last_studied, reference_date)

        # Retention score
        retention_val = calculate_retention(
            quiz_score=quiz_score,
            confidence=confidence,
            revision_count=revision_count,
            difficulty=difficulty,
            days_since_last_study=days_elapsed
        )

        # Forget risk
        risk_obj = calculate_forget_risk(retention_val)

        # Priority score
        priority_score = calculate_priority_score(
            retention=retention_val,
            quiz_score=quiz_score,
            confidence=confidence,
            difficulty=difficulty,
            days_elapsed=days_elapsed
        )

        # Base record properties
        annotated = dict(record)
        
        # Computed fields
        annotated["retentionVal"] = retention_val
        annotated["riskScore"] = risk_obj["score"]
        annotated["risk"] = risk_obj["category"]
        annotated["priorityScore"] = priority_score
        annotated["daysElapsed"] = days_elapsed

        # Python style properties
        annotated["retention_val"] = retention_val
        annotated["risk_score"] = risk_obj["score"]
        annotated["priority_score"] = priority_score
        annotated["days_elapsed"] = days_elapsed

        annotated_records.append(annotated)

    # Sort descending by priorityScore
    annotated_records.sort(key=lambda x: x["priorityScore"], reverse=True)

    return annotated_records
