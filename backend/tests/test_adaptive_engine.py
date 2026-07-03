import pytest
import os
import tempfile
import shutil
import numpy as np
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from backend.api.main import app
from backend.api.auth_routes import get_db
from backend.database.database import init_db, get_db_connection
from backend.analytics.adaptive_engine import calculate_priority_score
from backend.services.adaptive_revision_service import create_study_plan

@pytest.fixture(scope="function")
def mock_transformer():
    """
    Mock SentenceTransformer model execution.
    """
    with patch("sentence_transformers.SentenceTransformer") as mock_class:
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        
        def mock_encode(texts, **kwargs):
            if isinstance(texts, str):
                return np.ones(384, dtype=np.float32) * 0.1
            else:
                return np.ones((len(texts), 384), dtype=np.float32) * 0.1
                
        mock_model.encode.side_effect = mock_encode
        mock_class.return_value = mock_model
        yield mock_model

@pytest.fixture(scope="function")
def temp_dirs():
    """
    Fixture creating temp folders for uploads and FAISS and patching configs.
    Clean up dirs at end of test.
    """
    temp_dir = tempfile.mkdtemp()
    temp_upload_dir = os.path.join(temp_dir, "uploads")
    temp_faiss_path = os.path.join(temp_dir, "document_index.faiss")
    
    os.makedirs(temp_upload_dir, exist_ok=True)
    
    with patch("backend.api.routes.documents.MAX_UPLOAD_FILE_SIZE_MB", 5), \
         patch("backend.services.search.manager.UPLOAD_DIR", temp_upload_dir), \
         patch("backend.config.UPLOAD_DIR", temp_upload_dir), \
         patch("backend.config.FAISS_INDEX_PATH", temp_faiss_path):
        yield temp_upload_dir, temp_faiss_path
        
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture(scope="function")
def test_db():
    """
    Creates a temporary SQLite database initialized with the schema.
    """
    db_fd, db_path = tempfile.mkstemp()
    os.close(db_fd)
    init_db(db_path)
    yield db_path
    try:
        os.unlink(db_path)
    except OSError:
        pass

@pytest.fixture(scope="function")
def client(test_db, temp_dirs):
    """
    FastAPI test client with database overrides.
    """
    def override_get_db():
        conn = get_db_connection(test_db)
        try:
            yield conn
        finally:
            conn.close()
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def auth_headers(client):
    """
    Registers and logs in a test user, returning the authorization bearer header.
    """
    user_payload = {
        "name": "Alex Student",
        "email": "alex@example.com",
        "password": "mypassword123"
    }
    client.post("/api/auth/register", json=user_payload)
    login_response = client.post("/api/auth/login", json={
        "email": "alex@example.com",
        "password": "mypassword123"
    })
    token = login_response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


# 1. Core Analytics Engine Tests

def test_priority_calculation_boundaries():
    """
    Verify boundary conditions for priority score calculations.
    Perfect mastery / recently studied -> Priority 0
    Worst mastery / long time neglected -> Priority 100
    """
    # Best-case: perfect retention (100%), perfect quiz score (100%), max confidence (5), studied today (days=0)
    best_score = calculate_priority_score(
        retention=100.0,
        quiz_score=100.0,
        confidence=5,
        difficulty="Easy",
        days_elapsed=0
    )
    # UrgencyFactor for Easy = 0.5 * 30 + 0.5 * 0 = 15
    # priority_score = 0.4*(0) + 0.35*(0) + 0.25*(15) = 3.75 -> rounded is around 4
    assert best_score >= 0
    assert best_score <= 10  # should be very low

    # Worst-case: minimal retention (10%), zero quiz score (0%), min confidence (1), unstudied for 90 days (days=90)
    worst_score = calculate_priority_score(
        retention=10.0,
        quiz_score=0.0,
        confidence=1,
        difficulty="Hard",
        days_elapsed=90
    )
    # DecayFactor = 90
    # MasteryGap = 100
    # UrgencyFactor for Hard = 0.5 * 100 + 0.5 * 100 = 100
    # priority_score = 0.4*90 + 0.35*100 + 0.25*100 = 36 + 35 + 25 = 96 -> rounded is around 96
    assert worst_score >= 90
    assert worst_score <= 100

def test_difficulty_and_time_urgency():
    """
    Assert that higher difficulty and time elapsed increase priority.
    """
    # Compare Easy vs Hard with all other variables identical
    easy_topic = calculate_priority_score(
        retention=80.0,
        quiz_score=80.0,
        confidence=4,
        difficulty="Easy",
        days_elapsed=5
    )
    hard_topic = calculate_priority_score(
        retention=80.0,
        quiz_score=80.0,
        confidence=4,
        difficulty="Hard",
        days_elapsed=5
    )
    assert hard_topic > easy_topic

    # Compare short time elapsed vs long time elapsed
    short_delay = calculate_priority_score(
        retention=70.0,
        quiz_score=75.0,
        confidence=3,
        difficulty="Medium",
        days_elapsed=1
    )
    long_delay = calculate_priority_score(
        retention=70.0,
        quiz_score=75.0,
        confidence=3,
        difficulty="Medium",
        days_elapsed=20
    )
    assert long_delay > short_delay


# 2. Service Planner Tests

def test_revision_plan_splitting():
    """
    Test queue categorizations (Daily Queue vs Postponed).
    """
    records = [
        {
            "id": "topic-1",
            "title": "Need Urgent Study",
            "lastStudied": (datetime.utcnow() - timedelta(days=20)).date().isoformat(),
            "duration": 60,
            "confidenceScore": 1,
            "quizScore": 20,
            "revisionCount": 0,
            "difficulty": "Hard"
        },
        {
            "id": "topic-2",
            "title": "Already Mastered",
            "lastStudied": datetime.utcnow().date().isoformat(),
            "duration": 30,
            "confidenceScore": 5,
            "quizScore": 100,
            "revisionCount": 5,
            "difficulty": "Easy"
        }
    ]
    
    plan = create_study_plan(records, max_daily_queue=3)
    
    # Needs urgent study should go to daily Queue
    assert len(plan["dailyQueue"]) == 1
    assert plan["dailyQueue"][0]["id"] == "topic-1"
    assert "Urgent" in plan["dailyQueue"][0]["reason"] or "unmastered" in plan["dailyQueue"][0]["reason"] or "low" in plan["dailyQueue"][0]["reason"]
    
    # Already mastered should be safe to postpone
    assert len(plan["postponedQueue"]) == 1
    assert plan["postponedQueue"][0]["id"] == "topic-2"


# 3. End-to-End API Integration Tests

def test_post_revision_plan_simulation(client, auth_headers):
    """
    Test simulation plan generator (POST /api/revision/plan).
    """
    payload = {
        "records": [
            {
                "id": "sim-1",
                "title": "Simulated Topic 1",
                "lastStudied": "2026-06-15",
                "duration": 45,
                "confidenceScore": 2,
                "quizScore": 50,
                "revisionCount": 1,
                "difficulty": "Medium"
            }
        ],
        "maxDailyQueue": 5,
        "referenceDate": "2026-06-24"
    }
    
    response = client.post("/api/revision/plan", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "dailyQueue" in data
    assert "recommendedOrder" in data
    assert "postponedQueue" in data
    assert len(data["recommendedOrder"]) == 1
    assert data["recommendedOrder"][0]["id"] == "sim-1"

def test_get_revision_plan_persisted(client, auth_headers):
    """
    Test database-driven plan generator (GET /api/revision/plan).
    """
    # 1. Insert study topics via CRUD POST endpoint
    topic_1 = {
        "id": "db-topic-1",
        "title": "Database Optimization",
        "difficulty": "Hard",
        "duration": 90,
        "confidenceScore": 2,
        "quizScore": 40,
        "revisionCount": 0,
        "lastStudied": "2026-06-10"
    }
    topic_2 = {
        "id": "db-topic-2",
        "title": "Basic Loops",
        "difficulty": "Easy",
        "duration": 20,
        "confidenceScore": 5,
        "quizScore": 100,
        "revisionCount": 10,
        "lastStudied": "2026-06-24"
    }
    
    r1 = client.post("/api/topics", json=topic_1, headers=auth_headers)
    r2 = client.post("/api/topics", json=topic_2, headers=auth_headers)
    assert r1.status_code == 201
    assert r2.status_code == 201

    # 2. Request GET plan
    # Mocking reference date is not natively supported directly on the DB values 
    # but we can rely on current dates
    # (topic-1 studied 14 days ago, priority will be elevated)
    response = client.get("/api/revision/plan?maxDailyQueue=5", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    
    # We should have two records in recommendedOrder
    assert len(data["recommendedOrder"]) == 2
    # The harder, neglected topic should rank higher in recommended order
    assert data["recommendedOrder"][0]["id"] == "db-topic-1"
    assert data["recommendedOrder"][1]["id"] == "db-topic-2"

def test_topics_crud_authorization(client, auth_headers):
    """
    Verify that REST operations on /api/topics require proper authorization
    and isolate tenant data properly.
    """
    # Register and login another separate user (Bob)
    user_payload_bob = {
        "name": "Bob Programmer",
        "email": "bob@example.com",
        "password": "bobpassword123"
    }
    client.post("/api/auth/register", json=user_payload_bob)
    login_response_bob = client.post("/api/auth/login", json={
        "email": "bob@example.com",
        "password": "bobpassword123"
    })
    token_bob = login_response_bob.json()["token"]
    headers_bob = {"Authorization": f"Bearer {token_bob}"}

    # Alex creates a topic
    alex_topic = {
        "id": "alex-topic-unique",
        "title": "Alex Private Topic",
        "difficulty": "Medium",
        "duration": 50,
        "confidenceScore": 3,
        "quizScore": 75,
        "revisionCount": 1,
        "lastStudied": "2026-06-24"
    }
    create_response = client.post("/api/topics", json=alex_topic, headers=auth_headers)
    assert create_response.status_code == 201

    # 1. Unauthenticated request should fail
    unauth_response = client.get("/api/topics")
    assert unauth_response.status_code == 401

    # 2. Bob tries to read Alex's topic list - it should be empty for Bob
    bob_list_response = client.get("/api/topics", headers=headers_bob)
    assert bob_list_response.status_code == 200
    assert len(bob_list_response.json()) == 0

    # 3. Bob tries to update Alex's topic directly - it should return 404
    bob_update_response = client.put("/api/topics/alex-topic-unique", json={
        "title": "Hacked Title",
        "difficulty": "Easy",
        "duration": 10,
        "confidenceScore": 5,
        "quizScore": 100,
        "revisionCount": 2,
        "last_studied": "2026-06-24"
    }, headers=headers_bob)
    assert bob_update_response.status_code == 404

    # 4. Bob tries to delete Alex's topic - it should return 404
    bob_delete_response = client.delete("/api/topics/alex-topic-unique", headers=headers_bob)
    assert bob_delete_response.status_code == 404


def test_schema_relationships_and_migration(test_db):
    """
    Assert that study_topics table contains document_id and note_id columns
    and they can link properly. Also tests migration safety.
    """
    conn = get_db_connection(test_db)
    cursor = conn.cursor()
    
    # 1. Column presence check
    cursor.execute("PRAGMA table_info(study_topics);")
    columns = [row["name"] for row in cursor.fetchall()]
    assert "document_id" in columns
    assert "note_id" in columns
    
    # 2. Test migration safety idempotency by running init_db again
    init_db(test_db)
    cursor.execute("PRAGMA table_info(study_topics);")
    columns_after = [row["name"] for row in cursor.fetchall()]
    assert "document_id" in columns_after
    assert "note_id" in columns_after
    
    conn.close()

def test_automatic_topic_creation_on_upload(client, auth_headers, mock_transformer):
    """
    Verify uploading a document automatically creates a linked study topic for the user.
    """
    # 1. Upload document (Alex is authenticated via auth_headers)
    file_payload = {"file": ("ingest_topic.txt", b"Study guide details on Tree algorithms.", "text/plain")}
    response = client.post("/api/documents/upload", files=file_payload, headers=auth_headers)
    assert response.status_code == 201
    doc_id = response.json()["documentId"]
    assert doc_id is not None
    
    # 2. Verify that a topic with id = topic-{doc_id} was automatically created
    topics_response = client.get("/api/topics", headers=auth_headers)
    assert topics_response.status_code == 200
    topics = topics_response.json()
    
    # Find our topic
    topic = next((t for t in topics if t["id"] == f"topic-{doc_id}"), None)
    assert topic is not None
    assert topic["title"] == "ingest_topic.txt"
    assert topic["documentId"] == doc_id
    assert topic["difficulty"] == "Medium"
    assert topic["revisionCount"] == 0
    assert topic["quizScore"] == 100.0
    assert topic["confidenceScore"] == 3

def test_retrieval_feedback_updates(client, auth_headers, mock_transformer):
    """
    Verify search feedback loop increments revision metrics and avoids score inflation.
    """
    # 1. Create a study topic manually
    topic_payload = {
        "id": "feedback-topic",
        "title": "Feedback Loops",
        "difficulty": "Hard",
        "duration": 40,
        "confidenceScore": 2,
        "quizScore": 50.0,
        "revisionCount": 0,
        "lastStudied": "2026-06-10" # Studied in past
    }
    create_res = client.post("/api/topics", json=topic_payload, headers=auth_headers)
    assert create_res.status_code == 201
    
    # 2. Run semantic search with log_revision = True
    search_payload = {
        "query": "Feedback Loops",
        "top_k": 3,
        "log_revision": True,
        "topic_id": "feedback-topic"
    }
    
    # Unauthenticated log search should fail with 401
    unauth_search = client.post("/api/search", json=search_payload)
    assert unauth_search.status_code == 401
    
    # Authenticated search feedback loop
    auth_search = client.post("/api/search", json=search_payload, headers=auth_headers)
    assert auth_search.status_code == 200
    
    # 3. Check updated topic metrics (revision count should increment to 1)
    topics_res = client.get("/api/topics", headers=auth_headers)
    topic = next((t for t in topics_res.json() if t["id"] == "feedback-topic"), None)
    assert topic is not None
    assert topic["revisionCount"] == 1
    assert topic["lastStudied"] == datetime.utcnow().date().isoformat()
    
    # 4. Score inflation prevention: run search again on the same day.
    # Revision count should REMAIN 1.
    auth_search_again = client.post("/api/search", json=search_payload, headers=auth_headers)
    assert auth_search_again.status_code == 200
    
    topics_res_again = client.get("/api/topics", headers=auth_headers)
    topic_again = next((t for t in topics_res_again.json() if t["id"] == "feedback-topic"), None)
    assert topic_again["revisionCount"] == 1  # No double increment on same day!

def test_navigation_identifiers(client, auth_headers, test_db):
    """
    Verify that study plan responses return documentId and noteId properties.
    """
    # 1. Insert mock document and note into database directly to satisfy foreign keys
    conn = get_db_connection(test_db)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO documents (id, filename, file_hash, file_path, file_size, status) VALUES (?, ?, ?, ?, ?, ?)",
        ("doc-uuid-9999", "nav_file.txt", "hash_9999", "/path/to/nav_file.txt", 1024, "COMPLETED")
    )
    cursor.execute(
        "INSERT INTO notes (id, user_id, title, content) VALUES (?, ?, ?, ?)",
        (456, 1, "Mock Note Title", "Note content")
    )
    conn.commit()
    conn.close()

    # 2. Log a topic with documentId and noteId
    topic_payload = {
        "id": "nav-topic-1",
        "title": "Navigation Loops",
        "difficulty": "Easy",
        "duration": 30,
        "confidenceScore": 4,
        "quizScore": 90.0,
        "revisionCount": 1,
        "lastStudied": "2026-06-24",
        "documentId": "doc-uuid-9999",
        "noteId": 456
    }
    create_res = client.post("/api/topics", json=topic_payload, headers=auth_headers)
    assert create_res.status_code == 201
    
    # 3. Get revision plan and verify properties are serialized correctly
    plan_response = client.get("/api/revision/plan?maxDailyQueue=5", headers=auth_headers)
    assert plan_response.status_code == 200
    data = plan_response.json()
    
    # Verify recommendedOrder item holds identifiers
    assert len(data["recommendedOrder"]) > 0
    topic_item = next((item for item in data["recommendedOrder"] if item["id"] == "nav-topic-1"), None)
    assert topic_item is not None
    assert topic_item["documentId"] == "doc-uuid-9999"
    assert topic_item["noteId"] == 456

