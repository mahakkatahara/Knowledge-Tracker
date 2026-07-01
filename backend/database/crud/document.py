import sqlite3
import uuid
from typing import List, Optional
from backend.database.models import DBDocument, DBDocumentChunk, DocumentStatus

def create_document(
    db: sqlite3.Connection,
    doc_id: Optional[str] = None,
    filename: str = "",
    file_hash: str = "",
    file_path: str = "",
    file_size: int = 0,
    status: DocumentStatus = DocumentStatus.PENDING
) -> DBDocument:
    """
    Creates a new document metadata record in the database.
    Generates a UUID if doc_id is not specified.
    """
    if not doc_id:
        doc_id = uuid.uuid4().hex
        
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO documents (id, filename, file_hash, file_path, file_size, status) VALUES (?, ?, ?, ?, ?, ?)",
        (doc_id, filename, file_hash, file_path, file_size, status.value if hasattr(status, "value") else status)
    )
    db.commit()
    return get_document_by_id(db, doc_id)

def get_document_by_id(db: sqlite3.Connection, doc_id: str) -> Optional[DBDocument]:
    """
    Retrieves a document record by its ID.
    """
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, filename, file_hash, file_path, file_size, status, error_message, upload_time FROM documents WHERE id = ?",
        (doc_id,)
    )
    row = cursor.fetchone()
    return DBDocument.from_row(row) if row else None

def get_document_by_hash(db: sqlite3.Connection, file_hash: str) -> Optional[DBDocument]:
    """
    Retrieves a document record by its file hash (SHA-256).
    """
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, filename, file_hash, file_path, file_size, status, error_message, upload_time FROM documents WHERE file_hash = ?",
        (file_hash,)
    )
    row = cursor.fetchone()
    return DBDocument.from_row(row) if row else None

def update_document_status(
    db: sqlite3.Connection,
    doc_id: str,
    status: DocumentStatus,
    error_message: Optional[str] = None
) -> Optional[DBDocument]:
    """
    Updates the indexing status and potential error message of a document.
    """
    status_str = status.value if hasattr(status, "value") else status
    cursor = db.cursor()
    cursor.execute(
        "UPDATE documents SET status = ?, error_message = ? WHERE id = ?",
        (status_str, error_message, doc_id)
    )
    db.commit()
    return get_document_by_id(db, doc_id)

def delete_document(db: sqlite3.Connection, doc_id: str) -> bool:
    """
    Deletes a document from the database (will cascade delete all chunks).
    """
    cursor = db.cursor()
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    db.commit()
    return cursor.rowcount > 0

def create_document_chunk(
    db: sqlite3.Connection,
    document_id: str,
    chunk_index: int,
    text_content: str,
    page_number: Optional[int] = None,
    char_start: Optional[int] = None,
    char_end: Optional[int] = None
) -> DBDocumentChunk:
    """
    Inserts a text chunk record corresponding to a document.
    """
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO document_chunks (document_id, chunk_index, text_content, page_number, char_start, char_end) VALUES (?, ?, ?, ?, ?, ?)",
        (document_id, chunk_index, text_content, page_number, char_start, char_end)
    )
    db.commit()
    
    # Fetch the newly created chunk including created_at
    cursor.execute(
        "SELECT id, document_id, chunk_index, text_content, page_number, char_start, char_end, created_at FROM document_chunks WHERE id = ?",
        (cursor.lastrowid,)
    )
    row = cursor.fetchone()
    return DBDocumentChunk.from_row(row)

def get_chunks_by_document(db: sqlite3.Connection, document_id: str) -> List[DBDocumentChunk]:
    """
    Retrieves all text chunks belonging to a document.
    """
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, document_id, chunk_index, text_content, page_number, char_start, char_end, created_at FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC",
        (document_id,)
    )
    rows = cursor.fetchall()
    return [DBDocumentChunk.from_row(row) for row in rows]

def get_chunks_by_ids(db: sqlite3.Connection, chunk_ids: List[int]) -> List[DBDocumentChunk]:
    """
    Retrieves chunks matching the provided list of IDs (used directly after FAISS query resolution).
    """
    if not chunk_ids:
        return []
    placeholders = ",".join("?" for _ in chunk_ids)
    cursor = db.cursor()
    cursor.execute(
        f"SELECT id, document_id, chunk_index, text_content, page_number, char_start, char_end, created_at FROM document_chunks WHERE id IN ({placeholders})",
        chunk_ids
    )
    rows = cursor.fetchall()
    
    chunks = [DBDocumentChunk.from_row(row) for row in rows]
    chunk_map = {chunk.id: chunk for chunk in chunks if chunk is not None}
    
    ordered_chunks = []
    for cid in chunk_ids:
        if cid in chunk_map:
            ordered_chunks.append(chunk_map[cid])
    return ordered_chunks


def get_paginated_documents(db: sqlite3.Connection, limit: int, offset: int) -> List[DBDocument]:
    """
    Retrieves a list of documents sorted by upload time descending (falling back to rowid descending) with limit and offset.
    """
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, filename, file_hash, file_path, file_size, status, error_message, upload_time FROM documents ORDER BY upload_time DESC, rowid DESC LIMIT ? OFFSET ?",
        (limit, offset)
    )
    rows = cursor.fetchall()
    return [DBDocument.from_row(row) for row in rows if row is not None]



def get_documents_count(db: sqlite3.Connection) -> int:
    """
    Retrieves the total count of documents registered in the database.
    """
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM documents")
    return cursor.fetchone()[0]


def get_chunk_count_by_document(db: sqlite3.Connection, document_id: str) -> int:
    """
    Retrieves the count of chunks associated with a document.
    """
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM document_chunks WHERE document_id = ?", (document_id,))
    return cursor.fetchone()[0]


def get_chunk_stats(db: sqlite3.Connection, document_id: str) -> dict:
    """
    Computes text chunk statistics for a document:
    - total count of chunks
    - average length of text content
    - total character count of text content
    """
    cursor = db.cursor()
    cursor.execute(
        "SELECT COUNT(*), AVG(LENGTH(text_content)), SUM(LENGTH(text_content)) FROM document_chunks WHERE document_id = ?",
        (document_id,)
    )
    row = cursor.fetchone()
    if not row or row[0] == 0:
        return {
            "chunk_count": 0,
            "average_chunk_length": 0.0,
            "total_characters": 0
        }
    return {
        "chunk_count": row[0],
        "average_chunk_length": float(row[1]) if row[1] is not None else 0.0,
        "total_characters": int(row[2]) if row[2] is not None else 0
    }


