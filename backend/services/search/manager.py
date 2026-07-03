import hashlib
import logging
import sqlite3
import os
import uuid
from typing import Optional
from backend.config import CHUNK_SIZE, CHUNK_OVERLAP, UPLOAD_DIR
from backend.database.crud import document as crud_doc
from backend.database.models import DBDocument, DocumentStatus
from backend.services.search.parser import extract_document_text
from backend.services.search.processor import process_document
from backend.services.search.embedder import EmbeddingService
from backend.services.search.indexer import FAISSIndexManager

logger = logging.getLogger(__name__)

class SearchManager:
    """
    Orchestrator class coordinating text extraction, chunk splitting,
    embedding generation, SQLite database persistence, and FAISS vector index sync.
    """
    def __init__(self, db_conn: sqlite3.Connection, index_manager: Optional[FAISSIndexManager] = None):
        self.db = db_conn
        self.embedder = EmbeddingService()
        # Allows dependency injection for tests
        self.indexer = index_manager or FAISSIndexManager()

    def ingest_document(self, file_content: bytes, filename: str) -> DBDocument:
        """
        Ingests a document through the entire ingestion pipeline:
        1. Validates duplicate hashes.
        2. Registers document as PENDING.
        3. Writes uploaded file to disk.
        4. Parses raw page texts.
        5. Segments pages into overlapping clean chunks.
        6. Generates embeddings in batch.
        7. Persists text chunks to SQLite database.
        8. Adds embeddings to the FAISS index mapped to the chunk IDs.
        9. Finalizes document status as COMPLETED.
        """
        # Calculate SHA-256 for duplicate upload protection
        file_hash = hashlib.sha256(file_content).hexdigest()
        file_size = len(file_content)

        # Check if hash already exists in database
        existing_doc = crud_doc.get_document_by_hash(self.db, file_hash)
        if existing_doc:
            logger.info("Document with duplicate file hash %s already exists. Skipping ingestion.", file_hash)
            return existing_doc

        # Generate unique doc_id to construct local file path
        doc_id = uuid.uuid4().hex
        
        # Save file to configured uploads directory
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{filename}")
        try:
            with open(file_path, "wb") as f:
                f.write(file_content)
        except Exception as e:
            logger.error("Failed to write uploaded file to disk at %s: %s", file_path, str(e))
            raise RuntimeError(f"Failed to persist file upload on server disk: {str(e)}")

        # Register pending document record
        doc = crud_doc.create_document(
            db=self.db,
            doc_id=doc_id,
            filename=filename,
            file_hash=file_hash,
            file_path=file_path,
            file_size=file_size,
            status=DocumentStatus.PENDING
        )

        try:
            logger.info("Ingesting document %s (id=%s, size=%s bytes)", filename, doc.id, file_size)
            crud_doc.update_document_status(self.db, doc.id, DocumentStatus.PROCESSING)

            # Extract raw pages text
            pages = extract_document_text(file_content, filename)

            # Segment into overlapping text chunks, passing config values explicitly
            chunks_data = process_document(pages, chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
            
            if not chunks_data:
                logger.warning("No text extracted from document %s. Finalizing empty document.", filename)
                crud_doc.update_document_status(self.db, doc.id, DocumentStatus.COMPLETED)
                return crud_doc.get_document_by_id(self.db, doc.id)

            # Batch vectorize all text chunks using the embedding service
            logger.info("Generating embeddings for %s chunks of document %s", len(chunks_data), filename)
            chunk_texts = [c["text_content"] for c in chunks_data]
            embeddings = self.embedder.embed_batch(chunk_texts)

            # Persist text chunks to database and collect database chunk IDs
            chunk_ids = []
            for chunk_data in chunks_data:
                db_chunk = crud_doc.create_document_chunk(
                    db=self.db,
                    document_id=doc.id,
                    chunk_index=chunk_data["chunk_index"],
                    text_content=chunk_data["text_content"],
                    page_number=chunk_data["page_number"],
                    char_start=chunk_data["char_start"],
                    char_end=chunk_data["char_end"]
                )
                chunk_ids.append(db_chunk.id)

            # Register vectors inside FAISS index using the generated chunk IDs
            logger.info("Registering %s vector mappings inside FAISS index", len(chunk_ids))
            self.indexer.add_vectors(chunk_ids, embeddings)

            # Conclude document ingestion
            crud_doc.update_document_status(self.db, doc.id, DocumentStatus.COMPLETED)

        except Exception as e:
            logger.error("Ingestion failed for document %s (id=%s): %s", filename, doc.id, str(e), exc_info=True)
            # Revert relational database records to maintain sync (cascades chunk deletions)
            crud_doc.delete_document(self.db, doc.id)
            # Delete local file on disk if it was saved
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass
            raise RuntimeError(f"Ingestion pipeline failed: {str(e)}")

        return crud_doc.get_document_by_id(self.db, doc.id)

    def delete_document(self, doc_id: str) -> bool:
        """
        Deletes a document from the database, deletes local file on disk,
        and deletes its vectors from the FAISS index.
        """
        # Retrieve document details to get file_path
        doc = crud_doc.get_document_by_id(self.db, doc_id)
        if not doc:
            return False

        # Retrieve active chunk IDs to remove them from FAISS index
        chunks = crud_doc.get_chunks_by_document(self.db, doc_id)
        chunk_ids = [c.id for c in chunks if c.id is not None]

        # Purge from SQL relational schema
        success = crud_doc.delete_document(self.db, doc_id)
        if success:
            # Delete file on disk
            if doc.file_path and os.path.exists(doc.file_path):
                try:
                    os.remove(doc.file_path)
                    logger.info("Deleted local file: %s", doc.file_path)
                except Exception as e:
                    logger.error("Failed to delete file from disk: %s", str(e))

            if chunk_ids:
                # Purge from FAISS index and save updated index binary
                self.indexer.remove_vectors(chunk_ids)
                logger.info("Successfully deleted document %s and its vector embeddings", doc_id)
            
        return success

