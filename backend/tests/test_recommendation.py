from backend.analytics.recommendation import rank_topics

def test_rank_topics_parity(sample_topics):
    """
    Test that rank_topics ranks the sample topics correctly and returns calculations
    matching the JS decayEngine.js calculations when run with reference date '2026-06-20'.
    
    Expected outcomes for 2026-06-20:
    1. OS (topic-4): Priority Score 92, Days Elapsed 10, Retention 10, Risk High (60+).
    2. DP (topic-1): Priority Score 75, Days Elapsed 5, Retention 31, Risk High.
    3. Graph (topic-2): Priority Score 72, Days Elapsed 8, Retention 35, Risk High.
    4. React (topic-5): Priority Score 30, Days Elapsed 2, Retention 78, Risk Low.
    """
    ranked = rank_topics(sample_topics, reference_date="2026-06-20")
    
    # 1. Verify correct counts
    assert len(ranked) == 4
    
    # 2. Verify sorting order (descending by priorityScore)
    assert ranked[0]["id"] == "topic-4"  # OS
    assert ranked[1]["id"] == "topic-1"  # DP
    assert ranked[2]["id"] == "topic-2"  # Graph
    assert ranked[3]["id"] == "topic-5"  # React Hook
    
    # 3. Verify specific properties and scores
    # OS topic-4
    assert ranked[0]["daysElapsed"] == 10
    assert ranked[0]["retentionVal"] == 10
    assert ranked[0]["riskScore"] == 90
    assert ranked[0]["risk"] == "High"
    assert ranked[0]["priorityScore"] == 92
    
    # DP topic-1
    assert ranked[1]["daysElapsed"] == 5
    assert ranked[1]["retentionVal"] == 31
    assert ranked[1]["riskScore"] == 69
    assert ranked[1]["risk"] == "High"
    assert ranked[1]["priorityScore"] == 75
    
    # Graph topic-2
    assert ranked[2]["daysElapsed"] == 8
    assert ranked[2]["retentionVal"] == 35
    assert ranked[2]["riskScore"] == 65
    assert ranked[2]["risk"] == "High"
    assert ranked[2]["priorityScore"] == 72
    
    # React topic-5
    assert ranked[3]["daysElapsed"] == 2
    assert ranked[3]["retentionVal"] == 78
    assert ranked[3]["riskScore"] == 22
    assert ranked[3]["risk"] == "Low"
    assert ranked[3]["priorityScore"] == 30

def test_rank_topics_naming_compatibility(sample_topics):
    """
    Test that returned records contain both camelCase (JS) and snake_case (Python) keys.
    """
    ranked = rank_topics(sample_topics, reference_date="2026-06-20")
    first_item = ranked[0]
    
    # JS camelCase keys
    assert "retentionVal" in first_item
    assert "riskScore" in first_item
    assert "priorityScore" in first_item
    assert "daysElapsed" in first_item
    
    # Python snake_case keys
    assert "retention_val" in first_item
    assert "risk_score" in first_item
    assert "priority_score" in first_item
    assert "days_map" not in first_item  # negative check
    assert "days_elapsed" in first_item

def test_rank_topics_system_date_fallback(sample_topics):
    """
    Test that rank_topics runs using the default current system date without raising errors.
    """
    try:
        ranked = rank_topics(sample_topics)  # reference_date omitted
        assert len(ranked) == 4
    except Exception as e:
        pytest.fail(f"rank_topics failed when using default system date: {e}")
