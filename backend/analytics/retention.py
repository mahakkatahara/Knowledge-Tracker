from backend.analytics.utils import js_round

def calculate_retention(
    quiz_score: float,
    confidence: int,
    revision_count: int,
    difficulty: str = "Medium",
    days_since_last_study: int = 0
) -> int:
    """
    Calculates the memory retention percentage (10-100) using a power-based
    Ebbinghaus decay simulation.
    
    Formula:
      R = BaseScore * (RetentionRate ^ DaysElapsed)
      
    Additional parameters (difficulty and days_since_last_study) are optional 
    to preserve compatibility with the core spec signature.
    """
    # 1. Calculate BaseScore: starting point based on study quality (max 100)
    # quiz_score contributes up to 60%, confidence contributes up to 40% (8 * 5 = 40)
    quiz_weight = float(quiz_score or 0) * 0.6
    confidence_weight = float(confidence or 0) * 8
    base_score = min(100.0, max(10.0, quiz_weight + confidence_weight))

    # 2. Determine base retention rate based on difficulty
    difficulty_clean = str(difficulty or "Medium").strip().capitalize()
    if difficulty_clean == "Easy":
        base_rate = 0.95
    elif difficulty_clean == "Hard":
        base_rate = 0.85
    else:  # Medium / Default
        base_rate = 0.90

    # 3. Spaced Repetition multiplier: each revision slows the daily decay rate
    rev_count = max(0, int(revision_count or 0))
    revision_factor = 1.0 - (1.0 / (1.0 + rev_count * 0.5))
    daily_retention_rate = base_rate + (1.0 - base_rate) * revision_factor

    # 4. Calculate current retention: baseScore decays exponentially over elapsed days
    days = max(0, int(days_since_last_study or 0))
    retention = base_score * (daily_retention_rate ** days)

    # Round using js_round and clamp between 10% and 100%
    return min(100, max(10, js_round(retention)))
