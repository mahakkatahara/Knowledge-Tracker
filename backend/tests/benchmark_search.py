import os
import time
import tempfile
import sqlite3
import numpy as np
import faiss
from fastapi.testclient import TestClient

# Adjust path so backend is importable
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.api.main import app
from backend.api.auth_routes import get_db
from backend.database.database import init_db, get_db_connection
from backend.database.crud import document as crud_doc
from backend.database.models import DocumentStatus
from backend.services.search.embedder import EmbeddingService
from backend.services.search.indexer import FAISSIndexManager
from backend.services.search.retriever import SearchService

def run_benchmark():
    print("--- Starting Semantic Search Benchmark ---")
    
    # 1. Setup temporary database and FAISS index
    db_fd, db_path = tempfile.mkstemp()
    os.close(db_fd)
    init_db(db_path)
    
    index_fd, index_path = tempfile.mkstemp(suffix=".faiss")
    os.close(index_fd)
    try:
        os.unlink(index_path)
    except OSError:
        pass

    db_conn = get_db_connection(db_path)
    index_manager = FAISSIndexManager(index_path=index_path)
    search_service = SearchService(db_conn=db_conn, index_manager=index_manager)
    
    # Measure embedding service generation time
    print("Pre-loading sentence transformer model...")
    embedder = EmbeddingService()
    # Warmup
    embedder.embed_text("warmup query")
    
    t0 = time.perf_counter()
    for _ in range(20):
        embedder.embed_text("This is a benchmark search query.")
    t_emb = (time.perf_counter() - t0) / 20 * 1000
    print(f"Average single embedding generation time: {t_emb:.2f} ms")

    # FastAPI client setup
    def override_get_db():
        conn = get_db_connection(db_path)
        try:
            yield conn
        finally:
            conn.close()
            
    app.dependency_overrides[get_db] = override_get_db
    
    # Override index manager in routes as well to use our benchmark index
    from backend.api.routes.search import get_search_service
    def override_get_search_service():
        conn = get_db_connection(db_path)
        # Note: caller will close connection
        return SearchService(db_conn=conn, index_manager=index_manager)
    app.dependency_overrides[get_search_service] = override_get_search_service

    client = TestClient(app)

    # Ingestion sizes to test
    scales = [100, 1000, 10000]
    
    # Create a single document reference for all chunks
    doc = crud_doc.create_document(
        db=db_conn,
        doc_id="bench-doc-id",
        filename="benchmark_source.txt",
        file_hash="bench-hash-value",
        file_path="/uploads/benchmark_source.txt",
        file_size=1000000,
        status=DocumentStatus.COMPLETED
    )

    current_chunks = 0
    for target in scales:
        needed = target - current_chunks
        print(f"\nPopulating index to {target} chunks...")
        
        # Prepare batch data
        chunk_ids = []
        vectors = []
        
        # We write direct SQLite insertions to speed up population
        cursor = db_conn.cursor()
        for idx in range(current_chunks, target):
            cursor.execute(
                "INSERT INTO document_chunks (document_id, chunk_index, text_content, page_number, char_start, char_end) VALUES (?, ?, ?, ?, ?, ?)",
                ("bench-doc-id", idx, f"Chunk text content for index {idx}. Contains benchmark information.", idx // 5, idx * 10, idx * 10 + 50)
            )
            cid = cursor.lastrowid
            chunk_ids.append(cid)
            # Create random float vector of 384 dimensions
            vec = np.random.randn(384).astype(np.float32)
            # Normalize vector to simulate real embeddings
            vec /= np.linalg.norm(vec)
            vectors.append(vec.tolist())
            
        db_conn.commit()
        index_manager.add_vectors(chunk_ids, vectors)
        current_chunks = target
        
        # Warmup search
        search_service.search("query text", top_k=5)
        
        # Measure retrieval logic time (SearchService.search)
        t_ret_sum = 0.0
        runs = 30
        for _ in range(runs):
            # We measure the search method directly
            t0 = time.perf_counter()
            results = search_service.search("Contains benchmark information.", top_k=5)
            t_ret_sum += (time.perf_counter() - t0)
        t_ret = (t_ret_sum / runs) * 1000
        
        # Measure End-to-End API latency via TestClient
        t_api_sum = 0.0
        for _ in range(runs):
            t0 = time.perf_counter()
            response = client.post("/api/search", json={
                "query": "Contains benchmark information.",
                "topK": 5,
                "similarityThreshold": 0.0
            })
            t_api_sum += (time.perf_counter() - t0)
        t_api = (t_api_sum / runs) * 1000
        
        print(f"Results for {target} chunks scale:")
        print(f"  - Average Retrieval Logic Time: {t_ret:.2f} ms")
        print(f"  - Average Endpoint Latency: {t_api:.2f} ms")

    # Cleanup
    db_conn.close()
    app.dependency_overrides.clear()
    
    try:
        os.unlink(db_path)
        os.unlink(index_path)
    except OSError:
        pass

if __name__ == "__main__":
    run_benchmark()
