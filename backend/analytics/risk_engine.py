from typing import Dict, Any, Optional

def calculate_forget_risk(
    retention: float,
    days_since_last_study: Optional[int] = 0
) -> Dict[str, Any]:
    """
    Calculates forget risk score and classification category.
    
    Responsibilities:
      - Calculate forget risk (value between 0 and 100, which is 100 - retention)
      - Return risk score and risk category ("High", "Medium", "Low")
      - Match existing JavaScript logic
      
    Accepts days_since_last_study as an optional parameter to maintain spec alignment,
    though the score itself is calculated from the decayed retention percentage.
    """
    # Forget risk score is the inverse of retention percentage (clamped between 0 and 100)
    score = min(100.0, max(0.0, 100.0 - float(retention)))
    
    # Classify category based on score thresholds from JavaScript logic
    category = "Low"
    if score >= 60:
        category = "High"
    elif score >= 30:
        category = "Medium"
        
    return {
        "score": int(score),
        "category": category
    }
