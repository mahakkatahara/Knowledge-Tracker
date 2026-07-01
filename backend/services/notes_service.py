import sqlite3
import json
import logging
from datetime import datetime
from typing import List, Optional
from backend.database.models import DBNote
from backend.services.ir_service import rebuild_user_index

logger = logging.getLogger(__name__)

def get_notes_by_user(db: sqlite3.Connection, user_id: int) -> List[DBNote]:
    """
    Retrieves all notes for a specific user, ordered by updatedAt descending.
    """
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, user_id, title, content, tags, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
        (user_id,)
    )
    rows = cursor.fetchall()
    return [DBNote.from_row(row) for row in rows]

def get_note_by_id(db: sqlite3.Connection, note_id: int, user_id: int) -> Optional[DBNote]:
    """
    Retrieves a specific note by ID, verifying that it belongs to the user.
    """
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, user_id, title, content, tags, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?",
        (note_id, user_id)
    )
    row = cursor.fetchone()
    return DBNote.from_row(row) if row else None

def create_note(db: sqlite3.Connection, user_id: int, title: str, content: str, tags: List[str]) -> DBNote:
    """
    Creates a new note in the database.
    """
    now = datetime.utcnow().isoformat()
    tags_json = json.dumps(tags)
    
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO notes (user_id, title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, title.strip(), content.strip(), tags_json, now, now)
    )
    db.commit()
    
    # Retrieve and return the created note
    cursor.execute(
        "SELECT id, user_id, title, content, tags, created_at, updated_at FROM notes WHERE id = ?",
        (cursor.lastrowid,)
    )
    row = cursor.fetchone()
    
    # Rebuild user's search index automatically (Phase 8.1)
    try:
        rebuild_user_index(db, user_id)
    except Exception as e:
        logger.error(
            "Failed to automatically rebuild IR index for user_id=%s after note creation: %s",
            user_id,
            str(e),
            exc_info=True
        )
        
    return DBNote.from_row(row)

def update_note(db: sqlite3.Connection, note_id: int, user_id: int, title: str, content: str, tags: List[str]) -> Optional[DBNote]:
    """
    Updates an existing note, verifying ownership first.
    """
    # Check ownership
    note = get_note_by_id(db, note_id, user_id)
    if not note:
        return None
        
    now = datetime.utcnow().isoformat()
    tags_json = json.dumps(tags)
    
    cursor = db.cursor()
    cursor.execute(
        "UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = ? WHERE id = ? AND user_id = ?",
        (title.strip(), content.strip(), tags_json, now, note_id, user_id)
    )
    db.commit()
    
    # Rebuild user's search index automatically (Phase 8.1)
    try:
        rebuild_user_index(db, user_id)
    except Exception as e:
        logger.error(
            "Failed to automatically rebuild IR index for user_id=%s after note update: %s",
            user_id,
            str(e),
            exc_info=True
        )
        
    # Return updated note
    return get_note_by_id(db, note_id, user_id)

def delete_note(db: sqlite3.Connection, note_id: int, user_id: int) -> bool:
    """
    Deletes a note, verifying ownership first. Returns True if deleted, False otherwise.
    """
    note = get_note_by_id(db, note_id, user_id)
    if not note:
        return False
        
    cursor = db.cursor()
    cursor.execute(
        "DELETE FROM notes WHERE id = ? AND user_id = ?",
        (note_id, user_id)
    )
    db.commit()
    
    # Rebuild user's search index automatically (Phase 8.1)
    try:
        rebuild_user_index(db, user_id)
    except Exception as e:
        logger.error(
            "Failed to automatically rebuild IR index for user_id=%s after note deletion: %s",
            user_id,
            str(e),
            exc_info=True
        )
        
    return True
