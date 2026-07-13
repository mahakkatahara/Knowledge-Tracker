import sqlite3
import logging
from datetime import datetime
from typing import List, Optional
from backend.database.models import DBQuizAttempt

logger = logging.getLogger(__name__)

_COLS = "id, user_id, date, mode, difficulty, score, total, correct, created_at"


def get_history_by_user(db: sqlite3.Connection, user_id: int) -> List[DBQuizAttempt]:
    """All quiz attempts for a user, newest first."""
    cursor = db.cursor()
    cursor.execute(
        f"SELECT {_COLS} FROM quiz_history WHERE user_id = ? ORDER BY date DESC, created_at DESC",
        (user_id,)
    )
    return [DBQuizAttempt.from_row(r) for r in cursor.fetchall()]


def get_attempt_by_id(db: sqlite3.Connection, attempt_id: str, user_id: int) -> Optional[DBQuizAttempt]:
    cursor = db.cursor()
    cursor.execute(
        f"SELECT {_COLS} FROM quiz_history WHERE id = ? AND user_id = ?",
        (attempt_id, user_id)
    )
    row = cursor.fetchone()
    return DBQuizAttempt.from_row(row) if row else None


def create_attempt(
    db: sqlite3.Connection,
    user_id: int,
    attempt_id: str,
    date: str,
    mode: Optional[str],
    difficulty: Optional[str],
    score: int,
    total: int,
    correct: int,
) -> DBQuizAttempt:
    """Record a completed quiz. Idempotent on id."""
    existing = get_attempt_by_id(db, attempt_id, user_id)
    if existing:
        return existing

    now_time = datetime.utcnow().isoformat()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO quiz_history (id, user_id, date, mode, difficulty, score, total, correct, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (attempt_id, user_id, date, mode, difficulty, int(score or 0), int(total or 0), int(correct or 0), now_time)
    )
    db.commit()
    return get_attempt_by_id(db, attempt_id, user_id)
