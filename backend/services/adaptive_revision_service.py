from typing import Dict, Any, List, Optional
from backend.analytics.adaptive_engine import generate_personalized_plan

def create_study_plan(
    records: List[Dict[str, Any]],
    max_daily_queue: int = 5,
    reference_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Given a list of raw study records, processes them through the ARIE engine
    and categorizes them into different queues (Daily Queue, Study Order, Postponed).
    """
    # Run the prioritization engine to get ranked annotated records
    ranked_records = generate_personalized_plan(records, reference_date)

    # 1. Recommended Study Order
    # Simply list all topics sorted descending by priority score
    recommended_order = []
    for r in ranked_records:
        recommended_order.append({
            "id": r["id"],
            "title": r["title"],
            "priorityScore": r["priorityScore"],
            "documentId": r.get("documentId") or r.get("document_id"),
            "noteId": r.get("noteId") or r.get("note_id")
        })

    # 2. Daily Revision Queue
    # Topics that require immediate attention (priorityScore >= 50), capped by max_daily_queue
    daily_queue = []
    for r in ranked_records:
        if len(daily_queue) >= max_daily_queue:
            break
        if r["priorityScore"] >= 50:
            # Generate a helpful explanatory reason based on computed parameters
            reason_factors = []
            retention_val = r.get("retentionVal") if r.get("retentionVal") is not None else r.get("retention_val", 100)
            quiz_score = r.get("quizScore") if r.get("quizScore") is not None else r.get("quiz_score", 100.0)
            confidence = r.get("confidenceScore") if r.get("confidenceScore") is not None else r.get("confidence_score", 5)
            days_elapsed = r.get("daysElapsed") if r.get("daysElapsed") is not None else r.get("days_elapsed", 0)
            difficulty = r.get("difficulty", "Medium")

            if retention_val < 40:
                reason_factors.append("very low memory retention")
            elif retention_val < 60:
                reason_factors.append("decaying retention")
                
            if quiz_score < 60:
                reason_factors.append("unmastered quiz performance")
            elif quiz_score < 80:
                reason_factors.append("room for improvement on quiz score")
                
            if confidence <= 2:
                reason_factors.append("low confidence rating")
                
            if difficulty == "Hard":
                reason_factors.append("high conceptual difficulty")
                
            if days_elapsed > 14:
                reason_factors.append("no study activity in over 2 weeks")

            if not reason_factors:
                reason_factors.append("scheduled review interval")
                
            reason = "Recommended due to: " + ", ".join(reason_factors) + "."
            
            daily_queue.append({
                "id": r["id"],
                "title": r["title"],
                "priorityScore": r["priorityScore"],
                "retentionVal": r["retentionVal"],
                "risk": r["risk"],
                "reason": reason,
                "documentId": r.get("documentId") or r.get("document_id"),
                "noteId": r.get("noteId") or r.get("note_id")
            })

    # 3. Postponed Queue
    # Well-retained topics (retentionVal >= 80 and priorityScore < 30) that can wait
    postponed_queue = []
    for r in ranked_records:
        if r["retentionVal"] >= 80 and r["priorityScore"] < 30:
            postponed_queue.append({
                "id": r["id"],
                "title": r["title"],
                "priorityScore": r["priorityScore"],
                "retentionVal": r["retentionVal"],
                "risk": r["risk"],
                "documentId": r.get("documentId") or r.get("document_id"),
                "noteId": r.get("noteId") or r.get("note_id")
            })

    return {
        "dailyQueue": daily_queue,
        "recommendedOrder": recommended_order,
        "postponedQueue": postponed_queue
    }
