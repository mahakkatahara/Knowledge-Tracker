from backend.analytics.risk_engine import calculate_forget_risk

def test_calculate_forget_risk_categories():
    """
    Test that risk categories (High, Medium, Low) are correctly classified 
    according to forget risk score thresholds:
    - High: Score >= 60 (Retention <= 40)
    - Medium: Score >= 30 and < 60 (Retention > 40 and <= 70)
    - Low: Score < 30 (Retention > 70)
    """
    # Retention 40 -> Risk score 60 -> High Category
    risk_high = calculate_forget_risk(retention=40)
    assert risk_high["score"] == 60
    assert risk_high["category"] == "High"

    # Retention 70 -> Risk score 30 -> Medium Category
    risk_medium = calculate_forget_risk(retention=70)
    assert risk_medium["score"] == 30
    assert risk_medium["category"] == "Medium"

    # Retention 80 -> Risk score 20 -> Low Category
    risk_low = calculate_forget_risk(retention=80)
    assert risk_low["score"] == 20
    assert risk_low["category"] == "Low"

def test_calculate_forget_risk_clamping():
    """
    Test that forget risk score is clamped between 0 and 100.
    """
    # Extremely low retention (below 0, though clamped to 10 in engine, let's test input of 0)
    risk_zero = calculate_forget_risk(retention=0)
    assert risk_zero["score"] == 100
    assert risk_zero["category"] == "High"

    # Extremely high retention (110)
    risk_hundred = calculate_forget_risk(retention=110)
    assert risk_hundred["score"] == 0
    assert risk_hundred["category"] == "Low"

def test_calculate_forget_risk_optional_param():
    """
    Test that the optional days_since_last_study parameter is accepted and 
    does not disrupt the calculation or raise exceptions.
    """
    risk = calculate_forget_risk(retention=50, days_since_last_study=10)
    assert risk["score"] == 50
    assert risk["category"] == "Medium"
