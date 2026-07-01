import pytest
from fastapi.testclient import TestClient
from backend.api.main import app
from backend.api.auth_routes import get_db
from backend.database.database import init_db, get_db_connection

@pytest.fixture(scope="function")
def test_db():
    import tempfile
    import os
    db_fd, db_path = tempfile.mkstemp()
    os.close(db_fd)
    init_db(db_path)
    yield db_path
    try:
        os.unlink(db_path)
    except OSError:
        pass

@pytest.fixture(scope="function")
def client(test_db):
    from backend.services import ir_service
    ir_service.clear_indices()
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
    ir_service.clear_indices()

def register_and_login(client, name="Test User", email="test@example.com", password="password123"):
    client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": password
    })
    response = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    data = response.json()
    return data["token"], data["user"]

def test_unauthorized_search_and_rebuild(client):
    # Search unauthorized
    response = client.get("/api/search?q=machine")
    assert response.status_code == 401
    
    # Rebuild unauthorized
    response = client.post("/api/index/rebuild")
    assert response.status_code == 401

def test_empty_search_and_rebuild(client):
    token, user = register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Rebuild with no notes
    response = client.post("/api/index/rebuild", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "0 notes" in response.json()["message"]
    
    # Search with no notes
    response = client.get("/api/search?q=something", headers=headers)
    assert response.status_code == 200
    assert response.json() == []

def test_semantic_search_retrieval(client):
    token, user = register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create notes
    client.post("/api/notes", json={
        "title": "Introduction to Machine Learning",
        "content": "Supervised and unsupervised learning techniques are widely used in predicting outcomes.",
        "tags": ["ml"]
    }, headers=headers)
    
    client.post("/api/notes", json={
        "title": "FastAPI Web Framework",
        "content": "FastAPI is a modern web framework for building APIs in Python based on standard type hints.",
        "tags": ["web"]
    }, headers=headers)
    
    client.post("/api/notes", json={
        "title": "Quantum Physics Basics",
        "content": "Quantum mechanics describes the physical properties of nature at the scale of atoms.",
        "tags": ["physics"]
    }, headers=headers)
    
    # Rebuild the index
    response = client.post("/api/index/rebuild", headers=headers)
    assert response.status_code == 200
    assert "3 notes" in response.json()["message"]
    
    # Search for ML concepts (should match Note 1)
    response = client.get("/api/search?q=predicting machine learning", headers=headers)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["title"] == "Introduction to Machine Learning"
    assert results[0]["score"] > 0
    
    # Search for Web concepts (should match Note 2)
    response = client.get("/api/search?q=framework building python APIs", headers=headers)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["title"] == "FastAPI Web Framework"
    
    # Search for Query that doesn't match anything
    response = client.get("/api/search?q=unrelated nonsense keyword", headers=headers)
    assert response.status_code == 200
    assert response.json() == []

def test_search_user_isolation(client):
    # Register two users
    token1, user1 = register_and_login(client, name="User One", email="one@example.com")
    token2, user2 = register_and_login(client, name="User Two", email="two@example.com")
    
    # User 1 creates a note
    client.post("/api/notes", json={
        "title": "Secret Python Snippet",
        "content": "A special decorator pattern in python programming.",
        "tags": ["secret"]
    }, headers={"Authorization": f"Bearer {token1}"})
    
    # User 2 searches for "python" - should get empty (no notes of their own)
    response = client.get("/api/search?q=python", headers={"Authorization": f"Bearer {token2}"})
    assert response.status_code == 200
    assert response.json() == []
    
    # User 1 searches for "python" - should find their note
    response = client.get("/api/search?q=python", headers={"Authorization": f"Bearer {token1}"})
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Secret Python Snippet"

def test_automatic_index_synchronization(client):
    # 1. Register and login User A and User B
    token_a, user_a = register_and_login(client, name="User A", email="usera_sync@example.com")
    token_b, user_b = register_and_login(client, name="User B", email="userb_sync@example.com")
    
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # --- STEP 1: Create note -> searchable immediately ---
    create_response = client.post("/api/notes", json={
        "title": "Quantum Computing Fundamentals",
        "content": "Superposition and entanglement are key principles of quantum computers.",
        "tags": ["quantum"]
    }, headers=headers_a)
    assert create_response.status_code == 201
    note_id = create_response.json()["id"]
    
    # Search immediately (no manual rebuild!)
    search_response = client.get("/api/search?q=entanglement", headers=headers_a)
    assert search_response.status_code == 200
    results = search_response.json()
    assert len(results) == 1
    assert results[0]["note_id"] == note_id
    assert results[0]["title"] == "Quantum Computing Fundamentals"
    assert results[0]["score"] > 0
    
    # --- STEP 2: User isolation during creation ---
    # User B searches for "entanglement" - should get empty results
    search_b_response = client.get("/api/search?q=entanglement", headers=headers_b)
    assert search_b_response.status_code == 200
    assert search_b_response.json() == []
    
    # --- STEP 3: Update note -> search results updated ---
    # User A updates the note (changing content so "entanglement" is gone and replaced by "teleportation")
    update_response = client.put(f"/api/notes/{note_id}", json={
        "title": "Quantum Computing Advanced",
        "content": "Teleportation and cryptography are advanced topics in quantum mechanics.",
        "tags": ["quantum", "advanced"]
    }, headers=headers_a)
    assert update_response.status_code == 200
    
    # Search for old keyword "entanglement" - should be gone / empty results
    search_old_response = client.get("/api/search?q=entanglement", headers=headers_a)
    assert search_old_response.status_code == 200
    assert search_old_response.json() == []
    
    # Search for new keyword "teleportation" - should match immediately
    search_new_response = client.get("/api/search?q=teleportation", headers=headers_a)
    assert search_new_response.status_code == 200
    new_results = search_new_response.json()
    assert len(new_results) == 1
    assert new_results[0]["note_id"] == note_id
    assert new_results[0]["title"] == "Quantum Computing Advanced"
    
    # --- STEP 4: Delete note -> removed from results ---
    # User A deletes the note
    delete_response = client.delete(f"/api/notes/{note_id}", headers=headers_a)
    assert delete_response.status_code == 204
    
    # Search for "teleportation" - should be empty immediately
    search_deleted_response = client.get("/api/search?q=teleportation", headers=headers_a)
    assert search_deleted_response.status_code == 200
    assert search_deleted_response.json() == []
