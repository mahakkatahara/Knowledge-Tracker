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

def register_and_login(client, name="Test User", email="test@example.com", password="password123"):
    """
    Helper to register and login a user, returning user details and JWT token.
    """
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

def test_unauthorized_notes_access(client):
    # No Auth header
    response = client.get("/api/notes")
    assert response.status_code == 401  # FastAPI HTTPBearer returns 401 for missing auth header

    
    # Invalid token
    response = client.get("/api/notes", headers={"Authorization": "Bearer invalid_token"})
    assert response.status_code == 401

def test_notes_crud_lifecycle(client):
    # 1. Register and login
    token, user = register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get notes (should be empty initially)
    response = client.get("/api/notes", headers=headers)
    assert response.status_code == 200
    assert response.json() == []
    
    # 3. Create a note
    note_payload = {
        "title": "DP Memoization",
        "content": "Top-down approach cache subproblems.",
        "tags": ["Algorithms", "DP"]
    }
    response = client.post("/api/notes", json=note_payload, headers=headers)
    assert response.status_code == 201
    created_note = response.json()
    assert created_note["title"] == note_payload["title"]
    assert created_note["content"] == note_payload["content"]
    assert created_note["tags"] == note_payload["tags"]
    assert "id" in created_note
    assert created_note["userId"] == user["id"]
    
    # 4. Get note by ID
    note_id = created_note["id"]
    response = client.get(f"/api/notes/{note_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["title"] == note_payload["title"]
    
    # 5. Update the note
    update_payload = {
        "title": "DP Tabulation",
        "content": "Bottom-up approach iteratively.",
        "tags": ["Algorithms", "DP", "Tabulation"]
    }
    response = client.put(f"/api/notes/{note_id}", json=update_payload, headers=headers)
    assert response.status_code == 200
    updated_note = response.json()
    assert updated_note["title"] == update_payload["title"]
    assert updated_note["content"] == update_payload["content"]
    assert updated_note["tags"] == update_payload["tags"]
    
    # 6. Delete the note
    response = client.delete(f"/api/notes/{note_id}", headers=headers)
    assert response.status_code == 204
    
    # 7. Verify deletion
    response = client.get(f"/api/notes/{note_id}", headers=headers)
    assert response.status_code == 404

def test_user_isolation(client):
    # Register and login User A
    token_a, user_a = register_and_login(client, name="User A", email="usera@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    
    # Register and login User B
    token_b, user_b = register_and_login(client, name="User B", email="userb@example.com")
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # User A creates a note
    note_payload = {
        "title": "User A Secrets",
        "content": "This belongs only to User A.",
        "tags": ["Private"]
    }
    response = client.post("/api/notes", json=note_payload, headers=headers_a)
    note_id = response.json()["id"]
    
    # Verify User B cannot access User A's note
    response = client.get(f"/api/notes/{note_id}", headers=headers_b)
    assert response.status_code == 404
    
    # Verify User B cannot update User A's note
    update_payload = {
        "title": "Hacked",
        "content": "Malicious content.",
        "tags": ["Hacked"]
    }
    response = client.put(f"/api/notes/{note_id}", json=update_payload, headers=headers_b)
    assert response.status_code == 404
    
    # Verify User B cannot delete User A's note
    response = client.delete(f"/api/notes/{note_id}", headers=headers_b)
    assert response.status_code == 404
    
    # Verify User A still has their note unmodified
    response = client.get(f"/api/notes/{note_id}", headers=headers_a)
    assert response.status_code == 200
    assert response.json()["title"] == "User A Secrets"
