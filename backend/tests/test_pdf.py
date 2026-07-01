import pytest
import io
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

def get_dummy_pdf_bytes():
    # Simple, valid Helvetica-based PDF containing the text 'transformer architecture'
    return b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 53 >>
stream
BT
/F1 12 Tf
72 712 Td
(transformer architecture) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000347 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
421
%%EOF"""

def test_pdf_upload_success(client):
    token, user = register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    pdf_file = io.BytesIO(get_dummy_pdf_bytes())
    
    response = client.post(
        "/api/notes/upload-pdf",
        headers=headers,
        files={"file": ("transformer_intro.pdf", pdf_file, "application/pdf")}
    )
    
    assert response.status_code == 201
    note_data = response.json()
    assert note_data["title"] == "transformer_intro.pdf"
    assert "transformer architecture" in note_data["content"]
    assert "pdf" in note_data["tags"]
    assert "id" in note_data
    assert note_data["userId"] == user["id"]

def test_uploaded_pdf_is_searchable(client):
    token, user = register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Upload PDF
    pdf_file = io.BytesIO(get_dummy_pdf_bytes())
    upload_response = client.post(
        "/api/notes/upload-pdf",
        headers=headers,
        files={"file": ("transformer_intro.pdf", pdf_file, "application/pdf")}
    )
    assert upload_response.status_code == 201
    note_id = upload_response.json()["id"]

    # Search for terms inside the PDF
    search_response = client.get("/api/search?q=transformer", headers=headers)
    assert search_response.status_code == 200
    results = search_response.json()
    
    assert len(results) == 1
    assert results[0]["note_id"] == note_id
    assert results[0]["title"] == "transformer_intro.pdf"

def test_pdf_user_isolation(client):
    # Register two users
    token_a, user_a = register_and_login(client, name="User A", email="usera@example.com")
    token_b, user_b = register_and_login(client, name="User B", email="userb@example.com")

    # User A uploads a PDF
    pdf_file = io.BytesIO(get_dummy_pdf_bytes())
    upload_response = client.post(
        "/api/notes/upload-pdf",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("transformer_intro.pdf", pdf_file, "application/pdf")}
    )
    assert upload_response.status_code == 201
    note_id = upload_response.json()["id"]

    # User B tries to search for the PDF content - should return empty
    search_response = client.get("/api/search?q=transformer", headers={"Authorization": f"Bearer {token_b}"})
    assert search_response.status_code == 200
    assert search_response.json() == []

    # User B tries to view the note directly - should return 404
    note_response = client.get(f"/api/notes/{note_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert note_response.status_code == 404
