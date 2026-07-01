import os

# Base directory of the project
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Database settings
DB_PATH = os.getenv(
    "KNOWLEDGE_TRACKER_DB",
    os.path.join(BASE_DIR, "knowledge_tracker.db")
)

# Ingestion settings
UPLOAD_DIR = os.getenv(
    "UPLOAD_DIR",
    os.path.join(BASE_DIR, "uploads")
)

# Embedding settings
EMBEDDING_MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL_NAME",
    "sentence-transformers/all-MiniLM-L6-v2"
)
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))

# FAISS settings
FAISS_INDEX_PATH = os.getenv(
    "FAISS_INDEX_PATH",
    os.path.join(BASE_DIR, "document_index.faiss")
)

# Limits
MAX_UPLOAD_FILE_SIZE_MB = int(os.getenv("MAX_UPLOAD_FILE_SIZE_MB", "50"))

