import os
import tempfile
import sqlite3
import pytest
from unittest.mock import MagicMock, patch
import numpy as np
import faiss

from backend.database.database import init_db, get_db_connection
from backend.database.models import DBDocument, DBDocumentChunk, DocumentStatus
from backend.database.crud import document as crud_doc
from backend.services.search.embedder import EmbeddingService
from backend.services.search.indexer import FAISSIndexManager
from backend.services.search.manager import SearchManager

@pytest.fixture(scope="function")
def mock_transformer():
    """
    Global mock for SentenceTransformer class to prevent network downloads of model weights.
    Returns 384-dimension dummy embeddings.
    """
    with patch("backend.services.search.embedder.SentenceTransformer") as mock_class:
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        
        def mock_encode(texts, **kwargs):
            # If input is a single string, return 1D array, else 2D array
            if isinstance(texts, str):
                return np.ones(384, dtype=np.float32) * 0.1
            else:
                return np.ones((len(texts), 384), dtype=np.float32) * 0.1
                
        mock_model.encode.side_effect = mock_encode
        mock_class.return_value = mock_model
        yield mock_model

@pytest.fixture(scope="function")
def db_conn():
    """
    Temporary database connection fixture.
    """
    db_fd, db_path = tempfile.mkstemp()
    os.close(db_fd)
    init_db(db_path)
    
    conn = get_db_connection(db_path)
    yield conn
    
    conn.close()
    try:
        os.unlink(db_path)
    except OSError:
        pass

@pytest.fixture(scope="function")
def temp_index_path():
    """
    Temporary FAISS index path fixture.
    """
    db_fd, index_path = tempfile.mkstemp(suffix=".faiss")
    os.close(db_fd)
    try:
        os.unlink(index_path)  # Start with non-existent file
    except OSError:
        pass
    yield index_path
    if os.path.exists(index_path):
        try:
            os.unlink(index_path)
        except OSError:
            pass

def test_embedding_generation_service(mock_transformer):
    service = EmbeddingService()
    
    # 1. Single string embedding
    emb = service.embed_text("Hello World")
    assert isinstance(emb, list)
    assert len(emb) == 384
    assert emb[0] == pytest.approx(0.1)

    # 2. Batch embedding
    texts = ["First document text", "Second document text"]
    batch_embs = service.embed_batch(texts)
    assert len(batch_embs) == 2
    assert len(batch_embs[0]) == 384
    assert batch_embs[0][0] == pytest.approx(0.1)


def test_faiss_index_manager_lifecycle(mock_transformer, temp_index_path):
    # Initialize index manager (should create fresh index)
    manager = FAISSIndexManager(index_path=temp_index_path)
    assert manager.index is not None
    assert isinstance(manager.index, faiss.IndexIDMap2)
    assert manager.get_indexed_ids() == []

    # Insert dummy vectors
    chunk_ids = [101, 102]
    embeddings = [
        [0.1] * 384,
        [0.2] * 384
    ]
    manager.add_vectors(chunk_ids, embeddings)
    assert manager.get_indexed_ids() == [101, 102]
    
    # Verify index file saved on disk
    assert os.path.exists(temp_index_path)

    # Re-instantiate manager loading from saved path
    reloaded_manager = FAISSIndexManager(index_path=temp_index_path)
    assert reloaded_manager.get_indexed_ids() == [101, 102]

    # Test removing vectors
    reloaded_manager.remove_vectors([101])
    assert reloaded_manager.get_indexed_ids() == [102]

    # Verify reload reflects deletion
    final_manager = FAISSIndexManager(index_path=temp_index_path)
    assert final_manager.get_indexed_ids() == [102]


@patch("backend.services.search.manager.CHUNK_SIZE", 30)
@patch("backend.services.search.manager.CHUNK_OVERLAP", 5)

def test_document_ingestion_integration(mock_transformer, db_conn, temp_index_path):
    index_manager = FAISSIndexManager(index_path=temp_index_path)
    search_manager = SearchManager(db_conn=db_conn, index_manager=index_manager)

    file_content = b"This is a sample document content.\n\nIt contains page details."
    filename = "test_ingest.txt"
    file_path = "/uploads/test_ingest.txt"

    # 1. Ingest document
    doc = search_manager.ingest_document(file_content, filename)
    
    assert doc is not None
    assert doc.status == DocumentStatus.COMPLETED
    
    # Verify DB contains document and chunks
    chunks = crud_doc.get_chunks_by_document(db_conn, doc.id)
    assert len(chunks) == 3
    assert chunks[0].chunk_index == 0
    assert chunks[1].chunk_index == 1
    assert chunks[2].chunk_index == 2
    
    # Verify FAISS contains vectors mapped to chunk IDs
    chunk_ids = [c.id for c in chunks]
    assert len(chunk_ids) == 3
    assert index_manager.get_indexed_ids() == chunk_ids

    # 2. Test duplicate upload protection (should bypass processing and return cached document)
    doc_duplicate = search_manager.ingest_document(file_content, filename)
    assert doc_duplicate.id == doc.id
    
    # Verify no additional chunks or FAISS vectors were appended
    assert len(crud_doc.get_chunks_by_document(db_conn, doc.id)) == 3
    assert index_manager.get_indexed_ids() == chunk_ids

    # 3. Test document deletion cascading
    deleted = search_manager.delete_document(doc.id)
    assert deleted is True
    
    # DB cleanup assertions
    assert crud_doc.get_document_by_id(db_conn, doc.id) is None
    assert len(crud_doc.get_chunks_by_document(db_conn, doc.id)) == 0
    # Vector cleanup assertions
    assert index_manager.get_indexed_ids() == []



def test_ingestion_pipeline_failure_rollback(mock_transformer, db_conn, temp_index_path):
    index_manager = FAISSIndexManager(index_path=temp_index_path)
    search_manager = SearchManager(db_conn=db_conn, index_manager=index_manager)

    # Force a failure during batch embedding generation
    with patch.object(search_manager.embedder, "embed_batch", side_effect=ValueError("Mock Model Failure")):
        file_content = b"Content to fail embedding generation."
        filename = "fail.txt"
        file_path = "/uploads/fail.txt"
        
        # Verify the ingestion raises RuntimeError
        with pytest.raises(RuntimeError) as exc_info:
            search_manager.ingest_document(file_content, filename)
            
        assert "Ingestion pipeline failed" in str(exc_info.value)
        assert "Mock Model Failure" in str(exc_info.value)

        # Verify SQL database was rolled back and clean (Cascading delete removed the PENDING document)
        db_doc = crud_doc.get_document_by_hash(db_conn, "sha-not-existent") # hash matches mock content
        assert db_doc is None
        
        # Verify no chunks exist
        cursor = db_conn.cursor()
        cursor.execute("SELECT count(*) FROM document_chunks")
        assert cursor.fetchone()[0] == 0
        
        # Verify no vectors were added to FAISS index
        assert index_manager.get_indexed_ids() == []
