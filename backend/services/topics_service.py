import sqlite3
import logging
from datetime import datetime
from typing import List, Optional
from backend.database.models import DBStudyTopic

logger = logging.getLogger(__name__)

def get_topics_by_user(db: sqlite3.Connection, user_id: int) -> List[DBStudyTopic]:
    """
    Retrieves all study topics for a specific user, ordered by last_studied descending.
    """
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, user_id, title, difficulty, duration, confidence_score, quiz_score, revision_count, last_studied, created_at, document_id, note_id FROM study_topics WHERE user_id = ? ORDER BY last_studied DESC",
        (user_id,)
    )
    rows = cursor.fetchall()
    return [DBStudyTopic.from_row(row) for row in rows]

def get_topic_by_id(db: sqlite3.Connection, topic_id: str, user_id: int) -> Optional[DBStudyTopic]:
    """
    Retrieves a specific study topic by ID, verifying that it belongs to the user.
    """
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, user_id, title, difficulty, duration, confidence_score, quiz_score, revision_count, last_studied, created_at, document_id, note_id FROM study_topics WHERE id = ? AND user_id = ?",
        (topic_id, user_id)
    )
    row = cursor.fetchone()
    return DBStudyTopic.from_row(row) if row else None

def create_topic(
    db: sqlite3.Connection,
    user_id: int,
    topic_id: str,
    title: str,
    difficulty: str,
    duration: int,
    confidence_score: int,
    quiz_score: float,
    revision_count: int = 0,
    last_studied: Optional[str] = None,
    document_id: Optional[str] = None,
    note_id: Optional[int] = None
) -> DBStudyTopic:
    """
    Creates a new study topic session in the database.
    """
    now_date = last_studied or datetime.utcnow().date().isoformat()
    now_time = datetime.utcnow().isoformat()
    
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO study_topics (id, user_id, title, difficulty, duration, confidence_score, quiz_score, revision_count, last_studied, created_at, document_id, note_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (topic_id, user_id, title.strip(), difficulty.strip(), duration, confidence_score, quiz_score, revision_count, now_date, now_time, document_id, note_id)
    )
    db.commit()
    
    # Retrieve and return the created topic
    return get_topic_by_id(db, topic_id, user_id)

def update_topic(
    db: sqlite3.Connection,
    topic_id: str,
    user_id: int,
    title: str,
    difficulty: str,
    duration: int,
    confidence_score: int,
    quiz_score: float,
    revision_count: int,
    last_studied: str,
    document_id: Optional[str] = None,
    note_id: Optional[int] = None
) -> Optional[DBStudyTopic]:
    """
    Updates an existing study topic record, verifying ownership first.
    """
    topic = get_topic_by_id(db, topic_id, user_id)
    if not topic:
        return None
        
    cursor = db.cursor()
    cursor.execute(
        "UPDATE study_topics SET title = ?, difficulty = ?, duration = ?, confidence_score = ?, quiz_score = ?, revision_count = ?, last_studied = ?, document_id = ?, note_id = ? WHERE id = ? AND user_id = ?",
        (title.strip(), difficulty.strip(), duration, confidence_score, quiz_score, revision_count, last_studied.strip(), document_id, note_id, topic_id, user_id)
    )
    db.commit()
    
    return get_topic_by_id(db, topic_id, user_id)

def delete_topic(db: sqlite3.Connection, topic_id: str, user_id: int) -> bool:
    """
    Deletes a study topic, verifying ownership first. Returns True if deleted, False otherwise.
    """
    topic = get_topic_by_id(db, topic_id, user_id)
    if not topic:
        return False
        
    cursor = db.cursor()
    cursor.execute(
        "DELETE FROM study_topics WHERE id = ? AND user_id = ?",
        (topic_id, user_id)
    )
    db.commit()
    
    return True

def create_topic_from_document(
    db: sqlite3.Connection,
    user_id: int,
    document_id: str,
    title: str
) -> DBStudyTopic:
    """
    Automatically creates a linked study topic for a newly ingested document.
    """
    topic_id = f"topic-{document_id}"
    
    # Check if a study topic already exists for this document and user
    existing = get_topic_by_id(db, topic_id, user_id)
    if existing:
        return existing
        
    return create_topic(
        db=db,
        user_id=user_id,
        topic_id=topic_id,
        title=title,
        difficulty="Medium",
        duration=30,
        confidence_score=3,
        quiz_score=100.0,
        revision_count=0,
        last_studied=datetime.utcnow().date().isoformat(),
        document_id=document_id
    )

def log_revision_activity(
    db: sqlite3.Connection,
    user_id: int,
    topic_id: str
) -> Optional[DBStudyTopic]:
    """
    Updates the retention and study metrics for a topic following a retrieval activity.
    Increments revision count only if the topic hasn't already been reviewed today.
    """
    topic = get_topic_by_id(db, topic_id, user_id)
    if not topic:
        return None
        
    today_str = datetime.utcnow().date().isoformat()
    new_revision_count = topic.revision_count
    
    # Avoid artificial score inflation on multiple interactions on the same day
    if topic.last_studied != today_str:
        new_revision_count += 1
        
    return update_topic(
        db=db,
        topic_id=topic_id,
        user_id=user_id,
        title=topic.title,
        difficulty=topic.difficulty,
        duration=topic.duration,
        confidence_score=topic.confidence_score,
        quiz_score=topic.quiz_score,
        revision_count=new_revision_count,
        last_studied=today_str,
        document_id=topic.document_id,
        note_id=topic.note_id
    )
