"""
Database connection layer.

Behaviour:
- If TURSO_DATABASE_URL is set (e.g. on Render), connect to Turso (libSQL) over
  the network so data persists across restarts/redeploys.
- Otherwise fall back to a local SQLite file (great for local dev + tests).

Both branches expose the same API the rest of the app already uses:
  conn.cursor(), cursor.execute(sql, params), cursor.fetchone()/fetchall(),
  row["column_name"] AND row[0] access, row.keys(), cursor.lastrowid,
  conn.commit(), conn.close().

Turso note:
  libsql returns plain tuple rows that do NOT support name-based access
  (row["id"]). Since the whole app reads columns by name, we wrap the libsql
  connection so its cursors return dict-like rows that behave like sqlite3.Row.
"""

import os
import sqlite3

from backend.config import DB_PATH

# Turso credentials (set these in Render's Environment tab).
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

_USING_TURSO = bool(TURSO_DATABASE_URL)


class _Row:
    """
    Row supporting name access (row["id"]), positional access (row[0]),
    membership (`"id" in row`) and .keys() — so libsql rows behave exactly
    like sqlite3.Row for the rest of the app.
    """
    __slots__ = ("_values", "_data")

    def __init__(self, columns, values):
        self._values = list(values)
        self._data = {col: self._values[i] for i, col in enumerate(columns)}

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return self._data[key]

    def __contains__(self, key):
        return key in self._data

    def keys(self):
        return list(self._data.keys())

    def get(self, key, default=None):
        return self._data.get(key, default)

    def __iter__(self):
        return iter(self._values)

    def __len__(self):
        return len(self._values)


class _Cursor:
    """Thin wrapper making a libsql cursor return _Row objects."""

    def __init__(self, cursor):
        self._c = cursor

    def execute(self, sql, params=None):
        if params is None:
            self._c.execute(sql)
        else:
            self._c.execute(sql, params)
        return self

    def executemany(self, sql, seq):
        self._c.executemany(sql, seq)
        return self

    @property
    def description(self):
        return self._c.description

    @property
    def lastrowid(self):
        return self._c.lastrowid

    @property
    def rowcount(self):
        return getattr(self._c, "rowcount", -1)

    def _cols(self):
        desc = self._c.description
        return [d[0] for d in desc] if desc else []

    def fetchone(self):
        row = self._c.fetchone()
        if row is None:
            return None
        return _Row(self._cols(), row)

    def fetchall(self):
        cols = self._cols()
        return [_Row(cols, r) for r in self._c.fetchall()]

    def __iter__(self):
        return iter(self.fetchall())

    def close(self):
        try:
            self._c.close()
        except Exception:
            pass


class _Connection:
    """Wraps a libsql connection so cursors yield dict-like rows."""

    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return _Cursor(self._conn.cursor())

    def execute(self, sql, params=None):
        cur = self.cursor()
        cur.execute(sql, params)
        return cur

    def commit(self):
        return self._conn.commit()

    def close(self):
        return self._conn.close()

    def __getattr__(self, name):
        # Forward anything else (e.g. rollback) to the real connection.
        return getattr(self._conn, name)


def get_db_connection(db_path: str = None):
    """
    Establish a database connection.

    - Turso mode (TURSO_DATABASE_URL set): returns a wrapped libsql connection
      whose rows support name + positional access, matching sqlite3.Row.
    - Local mode: returns a normal sqlite3 connection with Row factory and
      foreign keys enabled.
    """
    if _USING_TURSO:
        # Imported lazily so local dev/tests don't need the package installed.
        import libsql

        conn = libsql.connect(
            database=TURSO_DATABASE_URL,
            auth_token=TURSO_AUTH_TOKEN,
        )
        return _Connection(conn)

    path = db_path or DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def _column_names(cursor):
    """Return the list of column names for the last executed statement."""
    if cursor.description is None:
        return []
    return [d[0] for d in cursor.description]


def init_db(db_path: str = None):
    """
    Initialize the schema (users, notes, documents, document_chunks, study_topics).
    Idempotent: safe to run on every startup.
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

    # Inline idempotent migrations for existing databases.
    # PRAGMA table_info columns: (cid, name, type, notnull, dflt_value, pk).
    cursor.execute("PRAGMA table_info(study_topics);")
    columns = [row[1] for row in cursor.fetchall()]
    if "document_id" not in columns:
        cursor.execute("ALTER TABLE study_topics ADD COLUMN document_id TEXT REFERENCES documents(id) ON DELETE SET NULL;")
    if "note_id" not in columns:
        cursor.execute("ALTER TABLE study_topics ADD COLUMN note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL;")

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_study_topics_user_id ON study_topics (user_id);
    """)

    conn.commit()
    conn.close()
