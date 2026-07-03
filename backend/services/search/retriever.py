import sqlite3
import logging
from typing import List, Dict, Any, Optional

from backend.services.search.embedder import EmbeddingService
from backend.services.search.indexer import FAISSIndexManager
from backend.database.crud import document as crud_doc

logger = logging.getLogger(__name__)

class SearchService:
    """
    Handles semantic retrieval on indexed document vector representations.
    Generates normalized query vectors, calls FAISS indexer nearest neighbors,
    reconciles metadata with SQLite, applies filters, and ranks results.
    """
    def __init__(self, db_conn: sqlite3.Connection, index_manager: Optional[FAISSIndexManager] = None):
        self.db = db_conn
        self.embedder = EmbeddingService()
        self.indexer = index_manager or FAISSIndexManager()

    def search(
        self,
        query: str,
        top_k: int = 5,
        document_id: Optional[str] = None,
        filename: Optional[str] = None,
        similarity_threshold: Optional[float] = 0.35
    ) -> List[Dict[str, Any]]:

        """
        Executes semantic retrieval with optional hard filters.
        """
        # Validate query input
        if not query or not query.strip():
            logger.warning("Empty search query received. Returning empty results.")
            return []

        # Gracefully handle uninitialized or empty FAISS vector store
        if self.indexer.index is None or self.indexer.index.ntotal == 0:
            logger.info("Semantic search executed on empty or missing vector index.")
            return []

        # 1. Encode query to vector space on CPU and L2 normalize
        try:
            import numpy as np
            import faiss
            query_vector = self.embedder.embed_text(query)
            query_np = np.array([query_vector], dtype=np.float32)
            faiss.normalize_L2(query_np)
        except Exception as e:
            logger.error("Failed to generate query embedding: %s", str(e), exc_info=True)
            raise RuntimeError(f"Embedding generation failed: {str(e)}")

        # 2. Compute closest matching vectors in FAISS
        # If filters exist, fetch a larger candidate pool to avoid starving Top-K slots
        has_filters = (document_id is not None) or (filename is not None) or (similarity_threshold is not None)
        query_k = max(top_k * 3, 50) if has_filters else top_k
        query_k = min(query_k, self.indexer.index.ntotal)

        try:
            # FlatIP search outputs Inner Product (Cosine Similarity because query & index are L2 normalized)
            scores, ids = self.indexer.index.search(query_np, query_k)
            matched_scores = scores[0].tolist()
            matched_ids = ids[0].tolist()
        except Exception as e:
            logger.error("FAISS nearest neighbor search failed: %s", str(e), exc_info=True)
            raise RuntimeError(f"FAISS index search failed: {str(e)}")

        # Filter out invalid vector lookup IDs (-1 representation when database has fewer items than K)
        candidates = []
        for score, cid in zip(matched_scores, matched_ids):
            if cid != -1:
                candidates.append((cid, score))

        if not candidates:
            return []

        # 3. Retrieve text content from SQLite using primary keys
        candidate_ids = [c[0] for c in candidates]
        chunks = crud_doc.get_chunks_by_ids(self.db, candidate_ids)
        chunk_map = {chunk.id: chunk for chunk in chunks if chunk is not None}

        # 4. Resolve metadata, filter, and prevent duplicates
        results = []
        seen_chunk_ids = set()

        for chunk_id, score in candidates:
            if chunk_id in seen_chunk_ids:
                continue

            chunk = chunk_map.get(chunk_id)
            if not chunk:
                # SQLite metadata is missing or out of sync with vector store
                logger.warning("FAISS ID %s returned vector match, but SQLite chunk metadata is missing", chunk_id)
                continue

            doc = crud_doc.get_document_by_id(self.db, chunk.document_id)
            if not doc:
                # Document has been deleted (ignore deleted files automatically)
                continue

            # Apply hard filters (case-insensitive filename checks)
            if document_id and doc.id != document_id:
                continue
            if filename and doc.filename.lower() != filename.lower():
                continue
            if similarity_threshold is not None and score < similarity_threshold:
                continue

            seen_chunk_ids.add(chunk_id)
            results.append({
                "document_id": doc.id,
                "filename": doc.filename,
                "page": chunk.page_number,
                "chunk_id": chunk.id,
                "score": round(float(score), 4),
                "text": chunk.text_content
            })

            # Check if threshold satisfied Top-K counts
            if len(results) >= top_k:
                break

        # Re-sort results descending to verify score precedence
        results.sort(key=lambda x: x["score"], reverse=True)
        return results
