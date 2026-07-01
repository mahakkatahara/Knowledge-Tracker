import sqlite3
from backend.config import DB_PATH


def get_db_connection(db_path: str = None):
    """
    Establish a connection to the SQLite database.
    Sets row_factory to sqlite3.Row to support key-based column access.
    Enforces foreign keys on all connection objects.
    """
    path = db_path or DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(db_path: str = None):
    """
    Initialize the SQLite database schema by creating the users, notes, documents, and document_chunks tables if they do not exist.
    """
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        file_hash TEXT NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS document_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        text_content TEXT NOT NULL,
        page_number INTEGER,
        char_start INTEGER,
        char_end INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks (document_id);
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS study_topics (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        duration INTEGER NOT NULL,
        confidence_score INTEGER NOT NULL,
        quiz_score REAL NOT NULL,
        revision_count INTEGER DEFAULT 0,
        last_studied TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
        note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Inline idempotent migrations for existing databases
    cursor.execute("PRAGMA table_info(study_topics);")
    columns = [row["name"] for row in cursor.fetchall()]
    if "document_id" not in columns:
        cursor.execute("ALTER TABLE study_topics ADD COLUMN document_id TEXT REFERENCES documents(id) ON DELETE SET NULL;")
    if "note_id" not in columns:
        cursor.execute("ALTER TABLE study_topics ADD COLUMN note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL;")

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_study_topics_user_id ON study_topics (user_id);
    """)
    
    conn.commit()
    conn.close()



