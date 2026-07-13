import sqlite3
import logging
from datetime import datetime
from typing import List, Optional
from backend.database.models import DBStudySession

logger = logging.getLogger(__name__)

_COLS = "id, user_id, topic_id, date, minutes, created_at"


def get_sessions_by_user(db: sqlite3.Connection, user_id: int) -> List[DBStudySession]:
    """All logged study sessions for a user, newest first."""
    cursor = db.cursor()
    cursor.execute(
        f"SELECT {_COLS} FROM study_sessions WHERE user_id = ? ORDER BY date DESC, created_at DESC",
        (user_id,)
    )
    return [DBStudySession.from_row(r) for r in cursor.fetchall()]


def get_session_by_id(db: sqlite3.Connection, session_id: str, user_id: int) -> Optional[DBStudySession]:
    cursor = db.cursor()
    cursor.execute(
        f"SELECT {_COLS} FROM study_sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id)
    )
    row = cursor.fetchone()
    return DBStudySession.from_row(row) if row else None


def create_session(
    db: sqlite3.Connection,
    user_id: int,
    session_id: str,
    date: str,
    minutes: int,
    topic_id: Optional[str] = None,
) -> DBStudySession:
    """Append a study session. Idempotent on id (returns existing if present)."""
    existing = get_session_by_id(db, session_id, user_id)
    if existing:
        return existing

    now_time = datetime.utcnow().isoformat()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO study_sessions (id, user_id, topic_id, date, minutes, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (session_id, user_id, topic_id, date, int(minutes or 0), now_time)
    )
    db.commit()
    return get_session_by_id(db, session_id, user_id)


def delete_session(db: sqlite3.Connection, session_id: str, user_id: int) -> bool:
    existing = get_session_by_id(db, session_id, user_id)
    if not existing:
        return False
    cursor = db.cursor()
    cursor.execute(
        "DELETE FROM study_sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id)
    )
    db.commit()
    return True
