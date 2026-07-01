import pytest
from fastapi.testclient import TestClient
from backend.api.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_retention_endpoint_camel_case():
    payload = {
        "quizScore": 100.0,
        "confidenceScore": 5,
        "revisionCount": 0,
        "difficulty": "Medium",
        "daysSinceLastStudy": 10
    }
    response = client.post("/api/retention", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "retention" in data
    # Expected: baseScore = 100*0.6 + 5*8 = 100. BaseRate = 0.90. Days = 10.
    # 100 * (0.90 ** 10) = 34.86 -> js_round -> 35
    assert data["retention"] == 35

def test_retention_endpoint_snake_case():
    payload = {
        "quiz_score": 100.0,
        "confidence": 5,
        "revision_count": 0,
        "difficulty": "Medium",
        "days_since_last_study": 10
    }
    response = client.post("/api/retention", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "retention" in data
    assert data["retention"] == 35

def test_retention_endpoint_missing_fields():
    # quiz_score is required
    payload = {
        "confidence": 5,
        "revision_count": 0
    }
    response = client.post("/api/retention", json=payload)
    assert response.status_code == 422

def test_risk_endpoint_low():
    # Retention 80 -> risk score 20 -> Low risk
    payload = {
        "retention": 80.0,
        "daysSinceLastStudy": 1
    }
    response = client.post("/api/risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 20
    assert data["category"] == "Low"

def test_risk_endpoint_high():
    # Retention 35 -> risk score 65 -> High risk
    payload = {
        "retention": 35.0,
        "days_since_last_study": 10
    }
    response = client.post("/api/risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 65
    assert data["category"] == "High"

def test_recommendations_endpoint(sample_topics):
    payload = {
        "topics": sample_topics,
        "referenceDate": "2026-06-20"
    }
    response = client.post("/api/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)
    assert len(data) == 4
    
    # Check that topics are ranked descending by priorityScore
    priority_scores = [item["priorityScore"] for item in data]
    assert priority_scores == sorted(priority_scores, reverse=True)

    # Check that compatibility fields are present
    first_item = data[0]
    assert "retentionVal" in first_item
    assert "retention_val" in first_item
    assert "riskScore" in first_item
    assert "risk_score" in first_item
    assert "priorityScore" in first_item
    assert "priority_score" in first_item
    assert "daysElapsed" in first_item
    assert "days_elapsed" in first_item
