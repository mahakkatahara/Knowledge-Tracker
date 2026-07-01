import os
import tempfile
import sqlite3
import pytest
from backend.database.database import init_db, get_db_connection
from backend.database.models import DBDocument, DBDocumentChunk, DocumentStatus
from backend.database.crud import document as crud_doc


@pytest.fixture(scope="function")
def db_conn():
    """
    Fixture to create a temporary database, initialize tables,
    and yield an open connection with foreign key support.
    """
    db_fd, db_path = tempfile.mkstemp()
    os.close(db_fd)
    
    # Initialize the tables (includes documents, document_chunks)
    init_db(db_path)
    
    conn = get_db_connection(db_path)
    yield conn
    
    conn.close()
    try:
        os.unlink(db_path)
    except OSError:
        pass

def test_document_lifecycle(db_conn):
    # 1. Verify table creation and query return empty when document doesn't exist
    doc_id = "test-uuid-1234"
    non_existent = crud_doc.get_document_by_id(db_conn, doc_id)
    assert non_existent is None

    # 2. Create document record
    filename = "sample.pdf"
    file_hash = "sha256-hash-value-1"
    file_path = "/path/to/sample.pdf"
    file_size = 10240

    doc = crud_doc.create_document(
        db=db_conn,
        doc_id=doc_id,
        filename=filename,
        file_hash=file_hash,
        file_path=file_path,
        file_size=file_size,
        status=DocumentStatus.PENDING
    )
    
    assert doc is not None
    assert doc.id == doc_id
    assert doc.filename == filename
    assert doc.file_hash == file_hash
    assert doc.file_path == file_path
    assert doc.file_size == file_size
    assert doc.status == DocumentStatus.PENDING
    assert doc.error_message is None
    assert doc.upload_time is not None

    # 3. Retrieve document by hash
    doc_by_hash = crud_doc.get_document_by_hash(db_conn, file_hash)
    assert doc_by_hash is not None
    assert doc_by_hash.id == doc_id

    # 4. Update status
    updated_doc = crud_doc.update_document_status(
        db=db_conn,
        doc_id=doc_id,
        status=DocumentStatus.PROCESSING
    )
    assert updated_doc.status == DocumentStatus.PROCESSING

    # Update to FAILED with error message
    failed_doc = crud_doc.update_document_status(
        db=db_conn,
        doc_id=doc_id,
        status=DocumentStatus.FAILED,
        error_message="OOM during embedding"
    )
    assert failed_doc.status == DocumentStatus.FAILED
    assert failed_doc.error_message == "OOM during embedding"


def test_chunks_lifecycle_and_cascade(db_conn):
    doc_id = "test-doc-id"
    # Create the document
    crud_doc.create_document(
        db=db_conn,
        doc_id=doc_id,
        filename="test.txt",
        file_hash="hash-2",
        file_path="/files/test.txt",
        file_size=100
    )

    # Add chunks
    chunk_1 = crud_doc.create_document_chunk(
        db=db_conn,
        document_id=doc_id,
        chunk_index=0,
        text_content="First chunk text content",
        page_number=1,
        char_start=0,
        char_end=24
    )

    chunk_2 = crud_doc.create_document_chunk(
        db=db_conn,
        document_id=doc_id,
        chunk_index=1,
        text_content="Second chunk text content",
        page_number=1,
        char_start=25,
        char_end=50
    )

    assert chunk_1.id is not None
    assert chunk_1.document_id == doc_id
    assert chunk_1.chunk_index == 0
    assert chunk_1.text_content == "First chunk text content"
    assert chunk_1.page_number == 1
    assert chunk_1.char_start == 0
    assert chunk_1.char_end == 24
    assert chunk_1.created_at is not None  # Verifying chunk timestamp exists

    assert chunk_2.id is not None
    assert chunk_2.chunk_index == 1

    # Retrieve all chunks belonging to document
    chunks = crud_doc.get_chunks_by_document(db_conn, doc_id)
    assert len(chunks) == 2
    assert chunks[0].chunk_index == 0
    assert chunks[1].chunk_index == 1

    # Fetch specific chunks using list of IDs (FAISS integration mock)
    ids_to_query = [chunk_2.id, chunk_1.id]
    fetched_chunks = crud_doc.get_chunks_by_ids(db_conn, ids_to_query)
    assert len(fetched_chunks) == 2
    # Verify retrieval preserves ordering of ids_to_query
    assert fetched_chunks[0].id == chunk_2.id
    assert fetched_chunks[1].id == chunk_1.id

    # Test cascade delete
    deleted = crud_doc.delete_document(db_conn, doc_id)
    assert deleted is True

    # Document should not exist
    assert crud_doc.get_document_by_id(db_conn, doc_id) is None

    # Chunks should be cascade deleted
    chunks_after_delete = crud_doc.get_chunks_by_document(db_conn, doc_id)
    assert len(chunks_after_delete) == 0


def test_implicit_uuid_generation(db_conn):
    # Verify create_document generates a valid UUID hex ID when doc_id is omitted
    doc = crud_doc.create_document(
        db=db_conn,
        filename="unspecified_id.pdf",
        file_hash="hash-unspecified",
        file_path="/files/unspecified.pdf",
        file_size=500
    )
    assert doc.id is not None
    assert len(doc.id) == 32  # uuid.uuid4().hex length is 32 characters
    
    # Assert we can retrieve it with the generated ID
    retrieved = crud_doc.get_document_by_id(db_conn, doc.id)
    assert retrieved is not None
    assert retrieved.filename == "unspecified_id.pdf"


def test_duplicate_document_upload(db_conn):
    # Register document the first time
    file_hash = "unique-hash-for-dupe-test"
    doc1 = crud_doc.create_document(
        db=db_conn,
        filename="original.pdf",
        file_hash=file_hash,
        file_path="/files/original.pdf",
        file_size=2048
    )
    assert doc1 is not None

    # Attempting to register another document with the same hash should raise IntegrityError
    with pytest.raises(sqlite3.IntegrityError):
        crud_doc.create_document(
            db=db_conn,
            filename="duplicate.pdf",
            file_hash=file_hash,
            file_path="/files/duplicate.pdf",
            file_size=2048
        )


def test_empty_chunk_insertion(db_conn):
    doc_id = "empty-chunk-doc"
    crud_doc.create_document(
        db=db_conn,
        doc_id=doc_id,
        filename="empty.txt",
        file_hash="hash-empty",
        file_path="/files/empty.txt",
        file_size=0
    )
    
    # Insert an empty text chunk (e.g. whitespace-only page or table layout parsed as empty)
    chunk = crud_doc.create_document_chunk(
        db=db_conn,
        document_id=doc_id,
        chunk_index=0,
        text_content=""
    )
    assert chunk.id is not None
    assert chunk.text_content == ""


def test_large_document_chunks_scaling(db_conn):
    # Simulate a document splitting into a large number of chunks (e.g., 200 chunks)
    doc_id = "large-doc-id"
    crud_doc.create_document(
        db=db_conn,
        doc_id=doc_id,
        filename="large_book.pdf",
        file_hash="hash-large",
        file_path="/files/large.pdf",
        file_size=10485760
    )

    # Insert 200 chunks
    chunk_ids = []
    for idx in range(200):
        chunk = crud_doc.create_document_chunk(
            db=db_conn,
            document_id=doc_id,
            chunk_index=idx,
            text_content=f"Paragraph content of chunk number {idx} representing part of the document text.",
            page_number=(idx // 2) + 1,
            char_start=idx * 100,
            char_end=(idx + 1) * 100
        )
        chunk_ids.append(chunk.id)

    assert len(chunk_ids) == 200

    # Retrieve all chunks and assert count
    all_chunks = crud_doc.get_chunks_by_document(db_conn, doc_id)
    assert len(all_chunks) == 200
    assert all_chunks[0].chunk_index == 0
    assert all_chunks[-1].chunk_index == 199

    # Query a subset of chunks in random order to simulate retrieval mapping
    sample_ids = [chunk_ids[150], chunk_ids[10], chunk_ids[75]]
    results = crud_doc.get_chunks_by_ids(db_conn, sample_ids)
    assert len(results) == 3
    assert results[0].id == chunk_ids[150]
    assert results[1].id == chunk_ids[10]
    assert results[2].id == chunk_ids[75]
