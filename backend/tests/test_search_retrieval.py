import os
import tempfile
import shutil
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import numpy as np

from backend.api.main import app
from backend.api.auth_routes import get_db
from backend.database.database import init_db, get_db_connection
from backend.services.search.indexer import FAISSIndexManager
from backend.services.search.manager import SearchManager
from backend.services.search.retriever import SearchService

@pytest.fixture(scope="function")
def mock_semantic_transformer():
    """
    SentenceTransformer mock yielding distinct index coordinates for deterministic
    nearest neighbors test scenarios.
    """
    with patch("sentence_transformers.SentenceTransformer") as mock_class:
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        
        def mock_encode(texts, **kwargs):
            dim = 384
            def get_vec(t):
                vec = np.zeros(dim, dtype=np.float32)
                t_lower = t.lower()
                # Query concept A -> maps to index 0
                if "concept a" in t_lower or t_lower == "a":
                    vec[0] = 1.0
                # Query concept B -> maps to index 1
                elif "concept b" in t_lower or t_lower == "b":
                    vec[1] = 1.0
                # Query concept C -> maps to index 2
                elif "concept c" in t_lower or t_lower == "c":
                    vec[2] = 1.0
                else:
                    vec[3] = 1.0
                return vec

            if isinstance(texts, str):
                return get_vec(texts)
            else:
                return np.array([get_vec(t) for t in texts], dtype=np.float32)
                
        mock_model.encode.side_effect = mock_encode
        mock_class.return_value = mock_model
        yield mock_model

@pytest.fixture(scope="function")
def temp_dirs():
    """
    Fixture creating temp folders for uploads and FAISS and patching configs.
    """
    temp_dir = tempfile.mkdtemp()
    temp_upload_dir = os.path.join(temp_dir, "uploads")
    temp_faiss_path = os.path.join(temp_dir, "document_index.faiss")
    os.makedirs(temp_upload_dir, exist_ok=True)
    
    with patch("backend.services.search.manager.UPLOAD_DIR", temp_upload_dir), \
         patch("backend.config.UPLOAD_DIR", temp_upload_dir), \
         patch("backend.config.FAISS_INDEX_PATH", temp_faiss_path):
        yield temp_upload_dir, temp_faiss_path
        
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture(scope="function")
def test_db():
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


def test_semantic_search_empty_index(test_db, temp_dirs, mock_semantic_transformer):
    _, index_path = temp_dirs
    conn = get_db_connection(test_db)
    
    index_manager = FAISSIndexManager(index_path=index_path)
    search_service = SearchService(db_conn=conn, index_manager=index_manager)

    # Empty index should return empty list gracefully
    res = search_service.search("concept A")
    assert res == []
    conn.close()


def test_semantic_search_retrieval_flow(test_db, temp_dirs, mock_semantic_transformer):
    _, index_path = temp_dirs
    conn = get_db_connection(test_db)
    
    index_manager = FAISSIndexManager(index_path=index_path)
    search_manager = SearchManager(db_conn=conn, index_manager=index_manager)
    search_service = SearchService(db_conn=conn, index_manager=index_manager)

    # Ingest document 1 containing concept A
    doc1 = search_manager.ingest_document(b"Details on concept A core definitions.", "doc1.txt")
    # Ingest document 2 containing concept B
    doc2 = search_manager.ingest_document(b"Details on concept B architecture specs.", "doc2.txt")

    # 1. Normal Search matching A
    results_a = search_service.search("concept A", top_k=5)
    assert len(results_a) == 1
    assert results_a[0]["document_id"] == doc1.id
    assert results_a[0]["filename"] == "doc1.txt"
    assert results_a[0]["score"] > 0.9  # Normalized Cosine similarity should be near 1.0

    # 2. Normal Search matching B
    results_b = search_service.search("concept B", top_k=5)
    assert len(results_b) == 1
    assert results_b[0]["document_id"] == doc2.id
    assert results_b[0]["filename"] == "doc2.txt"

    # 3. Top-K retrieval check
    # Let's verify top_k works. Add doc3 with concept A
    doc3 = search_manager.ingest_document(b"Another page on concept A metrics.", "doc3.txt")
    results_top_k = search_service.search("concept A", top_k=1)
    assert len(results_top_k) == 1

    # 4. Similarity ordering check (most matching returned first)
    results_ordered = search_service.search("concept A", top_k=5)
    assert len(results_ordered) == 2
    assert results_ordered[0]["score"] >= results_ordered[1]["score"]

    # 5. Document filter check
    results_filtered_doc = search_service.search("concept A", top_k=5, document_id=doc3.id)
    assert len(results_filtered_doc) == 1
    assert results_filtered_doc[0]["document_id"] == doc3.id

    # 6. Filename filter check (case-insensitive)
    results_filtered_file = search_service.search("concept A", top_k=5, filename="DOC1.TXT")
    assert len(results_filtered_file) == 1
    assert results_filtered_file[0]["filename"] == "doc1.txt"

    # 7. Similarity threshold check
    # Query for A. doc2 has B (score 0.0), doc1 & doc3 have A (score 1.0)
    # If threshold is 0.5, doc2 should be ignored.
    results_threshold = search_service.search("concept A", top_k=5, similarity_threshold=0.5)
    assert len(results_threshold) == 2
    for r in results_threshold:
        assert r["score"] >= 0.5

    # 8. Deleted document handling
    search_manager.delete_document(doc1.id)
    results_post_delete = search_service.search("concept A", top_k=5)
    # doc1 is deleted, so only doc3 remains matches concept A
    assert len(results_post_delete) == 1
    assert results_post_delete[0]["document_id"] == doc3.id

    conn.close()


def test_semantic_search_invalid_inputs_and_corrupt(test_db, temp_dirs, mock_semantic_transformer):
    _, index_path = temp_dirs
    conn = get_db_connection(test_db)
    
    index_manager = FAISSIndexManager(index_path=index_path)
    search_service = SearchService(db_conn=conn, index_manager=index_manager)

    # 1. Invalid inputs validation
    assert search_service.search("") == []
    assert search_service.search("    ") == []
    assert search_service.search(None) == []

    # 2. Corrupt index exception handling
    # Ingest one document to make index non-empty
    search_manager = SearchManager(db_conn=conn, index_manager=index_manager)
    search_manager.ingest_document(b"concept A values", "doc.txt")
    
    with patch.object(index_manager.index, "search", side_effect=Exception("FAISS memory corruption")):
        with pytest.raises(RuntimeError) as exc:
            search_service.search("concept A")
        assert "FAISS index search failed" in str(exc.value)

    conn.close()


def test_api_semantic_search_integration(client, mock_semantic_transformer):
    # Ingest mock document first
    upload_res = client.post(
        "/api/documents/upload",
        files={"file": ("doc_api.txt", b"Details on concept A API query.", "text/plain")}
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["documentId"]

    # Call search endpoint
    search_payload = {
        "query": "concept A",
        "top_k": 3,
        "document_id": doc_id,
        "similarity_threshold": 0.4
    }
    
    response = client.post("/api/search", json=search_payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["query"] == "concept A"
    assert len(data["results"]) == 1
    
    match = data["results"][0]
    assert match["documentId"] == doc_id
    assert match["filename"] == "doc_api.txt"
    assert match["score"] >= 0.4
    assert match["text"] == "Details on concept A API query."
