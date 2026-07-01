from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
import sqlite3
from typing import List, Dict, Any

from backend.api.auth_routes import get_db
from backend.api.routes.notes import get_current_user, get_optional_current_user
from backend.database.models import DBUser
from backend.services import ir_service
from backend.services.search.retriever import SearchService
from backend.api.schemas.search import SemanticSearchRequest, SemanticSearchResponse

router = APIRouter(tags=["Search & IR"])

def get_search_service(db: sqlite3.Connection = Depends(get_db)) -> SearchService:
    """
    FastAPI dependency injection provider for SearchService.
    """
    return SearchService(db)

@router.get("/search", response_model=List[Dict[str, Any]])
def search_notes(
    q: str = Query(..., description="Query string for semantic search"),
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Search the authenticated user's notes using TF-IDF and Cosine Similarity.
    """
    try:
        results = ir_service.search_user_notes(db, current_user.id, q)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during search: {str(e)}"
        )

@router.post("/index/rebuild")
def rebuild_index(
    current_user: DBUser = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Rebuild the TF-IDF matrix and Inverted Index from database notes for the authenticated user.
    """
    try:
        index = ir_service.rebuild_user_index(db, current_user.id)
        note_count = len(index.note_ids)
        return {
            "status": "success",
            "message": f"Index rebuilt successfully for {note_count} notes."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while rebuilding index: {str(e)}"
        )

@router.post("/search", response_model=SemanticSearchResponse)
def semantic_document_search(
    payload: SemanticSearchRequest,
    current_user: Optional[DBUser] = Depends(get_optional_current_user),
    db: sqlite3.Connection = Depends(get_db),
    service: SearchService = Depends(get_search_service)
):
    """
    Exposes semantic query vector nearest neighbors matching over processed document chunks.
    Supports filters like document_id, filename, and custom score thresholds.
    Optionally records the retrieval activity as a spacing engine study revision log.
    """
    try:
        results = service.search(
            query=payload.query,
            top_k=payload.top_k,
            document_id=payload.document_id,
            filename=payload.filename,
            similarity_threshold=payload.similarity_threshold
        )
        
        if payload.log_revision:
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required to log study revision feedback loop."
                )
            
            # Resolve target topic ID to log activity against
            target_topic_id = payload.topic_id
            if not target_topic_id:
                if payload.document_id:
                    target_topic_id = f"topic-{payload.document_id}"
                elif results:
                    target_topic_id = f"topic-{results[0]['document_id']}"
            
            if target_topic_id:
                # Ensure the topic exists in the DB, if not auto-create it
                cursor = db.cursor()
                cursor.execute(
                    "SELECT id FROM study_topics WHERE id = ? AND user_id = ?",
                    (target_topic_id, current_user.id)
                )
                row = cursor.fetchone()
                if not row:
                    doc_id_to_log = payload.document_id or (results[0]['document_id'] if results else None)
                    if doc_id_to_log:
                        # Query document name for title
                        cursor.execute("SELECT filename FROM documents WHERE id = ?", (doc_id_to_log,))
                        doc_row = cursor.fetchone()
                        doc_name = doc_row["filename"] if doc_row else f"Document {doc_id_to_log[:8]}"
                        from backend.services.topics_service import create_topic_from_document
                        create_topic_from_document(db, current_user.id, doc_id_to_log, doc_name)
                
                # Perform feedback update (avoiding double inflation)
                from backend.services.topics_service import log_revision_activity
                log_revision_activity(db, current_user.id, target_topic_id)

        return SemanticSearchResponse(
            query=payload.query,
            results=results
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic search operation failed: {str(e)}"
        )

