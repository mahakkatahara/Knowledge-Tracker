from backend.analytics.retention import calculate_retention
from backend.analytics.utils import get_days_elapsed

def test_calculate_retention_spec_compatibility():
    """
    Test that calculate_retention works using only the 3 parameters from the core spec.
    Additional parameters (difficulty, days_since_last_study) default to safe values.
    """
    # quiz_score=100, confidence=5, revision_count=0
    # base_score = 100 * 0.6 + 5 * 8 = 100.0
    # defaults: difficulty="Medium" (base_rate = 0.9), days_since_last_study=0
    # retention = 100 * (0.90 ** 0) = 100.0
    score = calculate_retention(quiz_score=100, confidence=5, revision_count=0)
    assert score == 100

    # quiz_score=0, confidence=1, revision_count=0
    # base_score = 0 + 8 = 8.0, clamped to min 10.0
    # retention = 10 * 1 = 10.0
    score = calculate_retention(quiz_score=0, confidence=1, revision_count=0)
    assert score == 10

def test_calculate_retention_decay():
    """
    Test Ebbinghaus decay simulation calculations over days since last study.
    """
    # Medium difficulty, 10 days since last study, 0 revisions
    # base_score: quiz=100 (weight 60) + confidence=5 (weight 40) = 100.0
    # base_rate: 0.90, daily_rate = 0.90
    # retention = 100 * (0.90 ** 10) = 34.8678... -> js_round -> 35
    score = calculate_retention(
        quiz_score=100,
        confidence=5,
        revision_count=0,
        difficulty="Medium",
        days_since_last_study=10
    )
    assert score == 35

def test_calculate_retention_spaced_repetition():
    """
    Test that spacing repetitions (revision count) decreases decay speed.
    """
    # 0 revisions vs 5 revisions at Medium difficulty after 10 days
    # quiz_score=100, confidence=5 (base_score = 100)
    #
    # With 0 revisions: daily rate = 0.90
    # retention = 100 * (0.90 ** 10) = 34.8678 -> 35
    score_0_rev = calculate_retention(
        quiz_score=100,
        confidence=5,
        revision_count=0,
        difficulty="Medium",
        days_since_last_study=10
    )
    
    # With 5 revisions:
    # revisionFactor = 1 - 1 / (1 + 5*0.5) = 1 - 1/3.5 = 1 - 0.2857 = 0.7143
    # daily rate = 0.90 + 0.10 * 0.7143 = 0.97143
    # retention = 100 * (0.97143 ** 10) = 74.6 -> 75
    score_5_rev = calculate_retention(
        quiz_score=100,
        confidence=5,
        revision_count=5,
        difficulty="Medium",
        days_since_last_study=10
    )
    
    assert score_5_rev > score_0_rev
    assert score_0_rev == 35
    assert score_5_rev == 75

def test_calculate_retention_clamping():
    """
    Test that the retention score is strictly clamped between 10 and 100.
    """
    # Extremely low parameters, should clamp to 10
    score_low = calculate_retention(
        quiz_score=0,
        confidence=0,
        revision_count=0,
        difficulty="Hard",
        days_since_last_study=100
    )
    assert score_low == 10

    # Extremely high parameters, should clamp to 100
    score_high = calculate_retention(
        quiz_score=100,
        confidence=5,
        revision_count=100,
        difficulty="Easy",
        days_since_last_study=0
    )
    assert score_high == 100
