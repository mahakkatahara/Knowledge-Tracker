import pytest
import os
import tempfile
import sqlite3
from fastapi.testclient import TestClient
from backend.api.main import app
from backend.api.auth_routes import get_db
from backend.database.database import init_db, get_db_connection
from backend.services.auth_service import verify_password

@pytest.fixture(scope="function")
def test_db():
    """
    Fixture that creates a temporary database file, initializes the tables,
    and deletes it after the test function runs.
    """
    db_fd, db_path = tempfile.mkstemp()
    os.close(db_fd)
    
    # Initialize schema in the test database
    init_db(db_path)
    
    yield db_path
    
    # Cleanup database file
    try:
        os.unlink(db_path)
    except OSError:
        pass

@pytest.fixture(scope="function")
def client(test_db):
    """
    Fixture that overrides the database dependency in the FastAPI application
    and returns a TestClient.
    """
    def override_get_db():
        conn = get_db_connection(test_db)
        try:
            yield conn
        finally:
            conn.close()
            
    # Set the override
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
        
    # Clear overrides after the test
    app.dependency_overrides.clear()

def test_auth_health(client):
    """
    Test auth module health endpoint.
    """
    response = client.get("/api/auth/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_registration_success(client, test_db):
    """
    Test successful user registration.
    Verify that the user record is stored and password hash is secure.
    """
    payload = {
        "name": "Alice Smith",
        "email": "alice@example.com",
        "password": "supersecurepassword"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 200
    assert response.json() == {"message": "User registered successfully"}
    
    # Check the SQLite database directly to verify record was created correctly
    conn = get_db_connection(test_db)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, password_hash FROM users WHERE email = 'alice@example.com'")
    row = cursor.fetchone()
    conn.close()
    
    assert row is not None
    assert row["name"] == "Alice Smith"
    assert row["email"] == "alice@example.com"
    
    # Verify password hash is stored instead of plain text
    stored_hash = row["password_hash"]
    assert stored_hash != "supersecurepassword"
    assert verify_password(stored_hash, "supersecurepassword") is True

def test_registration_duplicate_email(client):
    """
    Test that registering with an already existing email is rejected.
    """
    payload = {
        "name": "Bob Jones",
        "email": "bob@example.com",
        "password": "password123"
    }
    # Register Bob first time
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 200
    
    # Try registering again with the same email
    response_duplicate = client.post("/api/auth/register", json=payload)
    assert response_duplicate.status_code == 400
    assert "Email already registered" in response_duplicate.json()["detail"]

def test_login_success(client):
    """
    Test logging in with valid credentials.
    """
    # 1. Register a user
    register_payload = {
        "name": "Charlie Brown",
        "email": "charlie@example.com",
        "password": "charliepassword"
    }
    client.post("/api/auth/register", json=register_payload)
    
    # 2. Login
    login_payload = {
        "email": "charlie@example.com",
        "password": "charliepassword"
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Login successful"
    assert "token" in data
    assert data["user"]["email"] == "charlie@example.com"
    assert data["user"]["name"] == "Charlie Brown"
    assert "id" in data["user"]


def test_login_invalid_password(client):
    """
    Test logging in with an invalid password.
    """
    # 1. Register a user
    register_payload = {
        "name": "David Miller",
        "email": "david@example.com",
        "password": "correctpassword"
    }
    client.post("/api/auth/register", json=register_payload)
    
    # 2. Login with wrong password
    login_payload = {
        "email": "david@example.com",
        "password": "wrongpassword"
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

def test_login_nonexistent_user(client):
    """
    Test logging in with a non-existent email.
    """
    login_payload = {
        "email": "doesnotexist@example.com",
        "password": "somepassword"
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]



