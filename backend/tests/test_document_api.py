import os
import tempfile
import shutil
import sqlite3
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import numpy as np

from backend.api.main import app
from backend.api.auth_routes import get_db
from backend.database.database import init_db, get_db_connection
from backend.database.models import DocumentStatus
from backend.database.crud import document as crud_doc

@pytest.fixture(scope="function")
def mock_transformer():
    """
    Mock SentenceTransformer model execution.
    """
    with patch("backend.services.search.embedder.SentenceTransformer") as mock_class:
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
    Temporary database connection string path.
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
    FastAPI TestClient with overridden DB dependencies.
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


def test_upload_document_success(client, temp_dirs, test_db, mock_transformer):
    upload_dir, _ = temp_dirs
    
    file_payload = {"file": ("sample.txt", b"This is clean page text content to ingest.", "text/plain")}
    response = client.post("/api/documents/upload", files=file_payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["documentId"] is not None
    assert data["filename"] == "sample.txt"
    assert data["status"] == DocumentStatus.COMPLETED.value
    assert data["chunkCount"] == 1
    assert "uploaded and processed" in data["message"]
    
    # Assert file is written to temp UPLOAD_DIR
    doc_id = data["documentId"]
    saved_file_name = f"{doc_id}_sample.txt"
    assert os.path.exists(os.path.join(upload_dir, saved_file_name))


def test_upload_document_invalid_type(client):
    file_payload = {"file": ("unsupported.png", b"fake binary data", "image/png")}
    response = client.post("/api/documents/upload", files=file_payload)
    
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_upload_document_oversized(client):
    # Patch size limit to 0MB to simulate oversized file validation
    with patch("backend.api.routes.documents.MAX_UPLOAD_FILE_SIZE_MB", 0):
        file_payload = {"file": ("small.txt", b"Exceeding size limit.", "text/plain")}
        response = client.post("/api/documents/upload", files=file_payload)
        
        assert response.status_code == 413
        assert "exceeds the maximum limit" in response.json()["detail"]


def test_upload_duplicate(client, mock_transformer):
    file_payload = {"file": ("dupe.txt", b"Unique textual content for hash checks.", "text/plain")}
    
    # First upload
    response1 = client.post("/api/documents/upload", files=file_payload)
    assert response1.status_code == 201
    doc_id1 = response1.json()["documentId"]

    # Second upload (same file content)
    response2 = client.post("/api/documents/upload", files=file_payload)
    assert response2.status_code == 201
    data2 = response2.json()
    assert data2["documentId"] == doc_id1
    assert "already processed" in data2["message"]


def test_list_documents(client, mock_transformer):
    # Register 3 files
    client.post("/api/documents/upload", files={"file": ("doc1.txt", b"Content one", "text/plain")})
    client.post("/api/documents/upload", files={"file": ("doc2.txt", b"Content two", "text/plain")})
    client.post("/api/documents/upload", files={"file": ("doc3.txt", b"Content three", "text/plain")})
    
    response = client.get("/api/documents?page=1&limit=2")
    assert response.status_code == 200
    data = response.json()
    assert data["totalCount"] == 3
    assert len(data["documents"]) == 2
    assert data["page"] == 1
    assert data["limit"] == 2
    assert data["documents"][0]["filename"] == "doc3.txt" # LIFO ordering by upload time


def test_document_details_and_status(client, mock_transformer):
    file_payload = {"file": ("detail.txt", b"First text segment.\n\nSecond segment.", "text/plain")}
    
    # Force dynamic split sizes to ensure multiple chunks are indexed
    with patch("backend.services.search.manager.CHUNK_SIZE", 20), \
         patch("backend.services.search.manager.CHUNK_OVERLAP", 2):
        res = client.post("/api/documents/upload", files=file_payload)
        doc_id = res.json()["documentId"]
        
    # Get Status
    status_res = client.get(f"/api/documents/{doc_id}/status")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == DocumentStatus.COMPLETED.value
    
    # Get Details
    details_res = client.get(f"/api/documents/{doc_id}")
    assert details_res.status_code == 200
    data = details_res.json()
    
    assert data["processingStatus"] == DocumentStatus.COMPLETED.value
    assert data["metadata"]["filename"] == "detail.txt"
    assert data["chunkStatistics"]["chunkCount"] == 2
    assert data["chunkStatistics"]["totalCharacters"] == 34 # characters count after formatting splits
    assert data["chunkStatistics"]["averageChunkLength"] == 17.0



def test_delete_document(client, temp_dirs, mock_transformer):
    upload_dir, _ = temp_dirs
    file_payload = {"file": ("delete.txt", b"Soon to be deleted content.", "text/plain")}
    res = client.post("/api/documents/upload", files=file_payload)
    doc_id = res.json()["documentId"]
    
    saved_file_name = f"{doc_id}_delete.txt"
    assert os.path.exists(os.path.join(upload_dir, saved_file_name))

    # Perform Delete
    del_res = client.delete(f"/api/documents/{doc_id}")
    assert del_res.status_code == 200
    assert "successfully deleted" in del_res.json()["message"]
    
    # Assert file removed from disk
    assert not os.path.exists(os.path.join(upload_dir, saved_file_name))

    # Assert details returns 404
    assert client.get(f"/api/documents/{doc_id}").status_code == 404


def test_delete_non_existent_document(client):
    response = client.delete("/api/documents/non-existent-uuid")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_api_error_handling(client):
    # Induce model failure inside manager to verify 500 error propagation
    with patch("backend.api.routes.documents.SearchManager.ingest_document", side_effect=RuntimeError("Vector Engine Crash")):
        file_payload = {"file": ("crash.txt", b"Crash tests.", "text/plain")}
        response = client.post("/api/documents/upload", files=file_payload)
        
        assert response.status_code == 500
        assert "Vector Engine Crash" in response.json()["detail"]
