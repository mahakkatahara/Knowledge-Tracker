import logging
import sqlite3
import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Query

from backend.api.auth_routes import get_db
from backend.services.search.manager import SearchManager
from backend.database.crud import document as crud_doc
from backend.database.models import DBUser
from backend.api.routes.notes import get_optional_current_user
from backend.config import MAX_UPLOAD_FILE_SIZE_MB
from backend.api.schemas.documents import (
    DocumentUploadResponse,
    DocumentListItem,
    DocumentListResponse,
    DocumentDetailsResponse,
    DocumentMetadata,
    ChunkStatistics,
    DocumentStatusResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])

def get_search_manager(db: sqlite3.Connection = Depends(get_db)) -> SearchManager:
    """
    FastAPI dependency injection provider for SearchManager.
    """
    return SearchManager(db)

@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db),
    manager: SearchManager = Depends(get_search_manager),
    current_user: Optional[DBUser] = Depends(get_optional_current_user)
):
    """
    Upload a document (PDF, TXT, or Markdown), split it into chunks, generate embeddings,
    and persist the metadata to SQLite and vectors to the FAISS index.
    """
    filename = file.filename
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    # 1. Validate file extension
    if ext not in ["pdf", "txt", "md"]:
        logger.warning("Upload rejected: unsupported extension .%s for file %s", ext, filename)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format: .{ext}. Only PDF, TXT, and Markdown files are allowed."
        )

    # 2. Read and validate maximum upload size
    try:
        file_content = file.file.read()
    except Exception as e:
        logger.error("Failed to read uploaded file: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read upload file: {str(e)}"
        )

    file_size_bytes = len(file_content)
    max_size_bytes = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024
    if file_size_bytes > max_size_bytes:
        logger.warning("Upload rejected: file size %s exceeds maximum of %sMB", file_size_bytes, MAX_UPLOAD_FILE_SIZE_MB)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds the maximum limit of {MAX_UPLOAD_FILE_SIZE_MB}MB."
        )

    # 3. Check for duplicates using file hash
    file_hash = hashlib.sha256(file_content).hexdigest()
    existing_doc = crud_doc.get_document_by_hash(db, file_hash)
    if existing_doc:
        logger.info("File upload hit duplicate hash %s. Returning cached document ID: %s", file_hash, existing_doc.id)
        chunk_count = crud_doc.get_chunk_count_by_document(db, existing_doc.id)
        return DocumentUploadResponse(
            document_id=existing_doc.id,
            filename=existing_doc.filename,
            status=existing_doc.status.value,
            chunk_count=chunk_count,
            message="Document already processed (returned duplicate cached record)."
        )

    # 4. Ingest document via Orchestrator
    try:
        doc = manager.ingest_document(file_content, filename)
        chunk_count = crud_doc.get_chunk_count_by_document(db, doc.id)
        
        # Automatic topic creation if current_user is authenticated
        if current_user:
            try:
                from backend.services.topics_service import create_topic_from_document
                create_topic_from_document(db, current_user.id, doc.id, filename)
            except Exception as et:
                logger.error("Failed to automatically create study topic for document upload: %s", str(et), exc_info=True)

        logger.info("Document ingested successfully: %s (id=%s, chunks=%s)", filename, doc.id, chunk_count)
        return DocumentUploadResponse(
            document_id=doc.id,
            filename=doc.filename,
            status=doc.status.value,
            chunk_count=chunk_count,
            message="Document uploaded and processed successfully."
        )
    except Exception as e:
        logger.error("Failed to process uploaded document: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process and index document: {str(e)}"
        )

@router.get("", response_model=DocumentListResponse)
def list_documents(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Returns a paginated list of registered documents with status, timestamp, and chunk counts.
    """
    offset = (page - 1) * limit
    docs = crud_doc.get_paginated_documents(db, limit, offset)
    total_count = crud_doc.get_documents_count(db)
    
    items = []
    for doc in docs:
        chunk_count = crud_doc.get_chunk_count_by_document(db, doc.id)
        items.append(DocumentListItem(
            id=doc.id,
            filename=doc.filename,
            status=doc.status.value,
            upload_time=doc.upload_time,
            chunk_count=chunk_count
        ))
        
    return DocumentListResponse(
        documents=items,
        total_count=total_count,
        page=page,
        limit=limit
    )

@router.get("/{document_id}", response_model=DocumentDetailsResponse)
def get_document_details(
    document_id: str,
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Retrieves document metadata, ingestion status, and text chunk analytics.
    """
    doc = crud_doc.get_document_by_id(db, document_id)
    if not doc:
        logger.warning("Document details requested for non-existent ID: %s", document_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )

    stats = crud_doc.get_chunk_stats(db, document_id)
    
    metadata = DocumentMetadata(
        id=doc.id,
        filename=doc.filename,
        file_hash=doc.file_hash,
        file_path=doc.file_path,
        file_size=doc.file_size,
        upload_time=doc.upload_time
    )
    
    chunk_stats = ChunkStatistics(
        chunk_count=stats["chunk_count"],
        average_chunk_length=stats["average_chunk_length"],
        total_characters=stats["total_characters"]
    )
    
    return DocumentDetailsResponse(
        metadata=metadata,
        processing_status=doc.status.value,
        chunk_statistics=chunk_stats
    )

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(
    document_id: str,
    manager: SearchManager = Depends(get_search_manager)
):
    """
    Deletes the document from SQLite metadata tables, deletes local files, and removes
    indexed vectors from FAISS.
    """
    success = manager.delete_document(document_id)
    if not success:
        logger.warning("Delete requested for non-existent document ID: %s", document_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )
    return {"status": "success", "message": f"Document {document_id} successfully deleted."}

@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
def get_document_status(
    document_id: str,
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Returns the processing status (PENDING, PROCESSING, COMPLETED, FAILED) and potential errors.
    """
    doc = crud_doc.get_document_by_id(db, document_id)
    if not doc:
        logger.warning("Status requested for non-existent document ID: %s", document_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )
    return DocumentStatusResponse(
        document_id=doc.id,
        status=doc.status.value,
        error_message=doc.error_message
    )
