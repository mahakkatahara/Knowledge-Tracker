from typing import List, Dict, Any, Optional, Union
from datetime import date, datetime
from backend.analytics.utils import get_days_elapsed, js_round
from backend.analytics.retention import calculate_retention
from backend.analytics.risk_engine import calculate_forget_risk

def rank_topics(
    records: List[Dict[str, Any]],
    reference_date: Optional[Union[str, date, datetime]] = None
) -> List[Dict[str, Any]]:
    """
    Sorts study topics by revision priority using forget risk and retention.
    
    Accepts list of topic records and an optional reference_date (used primarily for testing).
    Returns a new list of records annotated with:
      - retentionVal / retention_val
      - riskScore / risk_score
      - risk (category: High, Medium, Low)
      - priorityScore / priority_score
      - daysElapsed / days_elapsed
    Sorted by priorityScore in descending order.
    """
    if not records:
        return []
        
    annotated_records = []
    
    for record in records:
        # Extract fields, supporting both camelCase (JS compatibility) and snake_case (Python compatibility)
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
        
        # Calculate days elapsed
        days_elapsed = get_days_elapsed(last_studied, reference_date)
        
        # Calculate memory retention percentage
        retention_val = calculate_retention(
            quiz_score=quiz_score,
            confidence=confidence,
            revision_count=revision_count,
            difficulty=difficulty,
            days_since_last_study=days_elapsed
        )
        
        # Calculate forget risk score & category
        risk_obj = calculate_forget_risk(retention_val)
        
        # Calculate priority recommendation score
        # Difficulty weights: Easy = 0.3, Medium = 0.6, Hard = 1.0
        diff_clean = str(difficulty or "Medium").strip().capitalize()
        if diff_clean == "Easy":
            difficulty_weight = 0.3
        elif diff_clean == "Hard":
            difficulty_weight = 1.0
        else:
            difficulty_weight = 0.6
            
        forget_risk = risk_obj["score"]
        priority_score = (forget_risk * 0.8) + (difficulty_weight * 20)
        clamped_priority_score = min(100, max(0, js_round(priority_score)))
        
        # Build annotated record, keeping original fields and appending calculated ones
        annotated = dict(record)
        
        # JS property names
        annotated["retentionVal"] = retention_val
        annotated["riskScore"] = risk_obj["score"]
        annotated["risk"] = risk_obj["category"]
        annotated["priorityScore"] = clamped_priority_score
        annotated["daysElapsed"] = days_elapsed
        
        # Python property names
        annotated["retention_val"] = retention_val
        annotated["risk_score"] = risk_obj["score"]
        annotated["priority_score"] = clamped_priority_score
        annotated["days_elapsed"] = days_elapsed
        
        annotated_records.append(annotated)
        
    # Sort topics descending by priority score (priorityScore)
    # If priorityScores are equal, preserve original relative ordering (stable sort)
    annotated_records.sort(key=lambda x: x["priorityScore"], reverse=True)
    
    return annotated_records
