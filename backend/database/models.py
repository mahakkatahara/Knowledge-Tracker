from datetime import datetime
from typing import Optional, Any, Dict, List

class DBUser:
    def __init__(self, id: Optional[int], name: str, email: str, password_hash: str, created_at: Optional[str] = None):
        self.id = id
        self.name = name
        self.email = email
        self.password_hash = password_hash
        self.created_at = created_at or datetime.utcnow().isoformat()

    @classmethod
    def from_row(cls, row: Any) -> Optional['DBUser']:
        """
        Instantiate a DBUser from an sqlite3.Row object.
        """
        if not row:
            return None
        return cls(
            id=row["id"],
            name=row["name"],
            email=row["email"],
            password_hash=row["password_hash"],
            created_at=row["created_at"]
        )

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert DBUser fields to a dictionary for JSON responses (excluding sensitive password hashes).
        """
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at
        }


class DBNote:
    def __init__(
        self,
        id: Optional[int],
        user_id: int,
        title: str,
        content: str,
        tags: List[str],
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        self.id = id
        self.user_id = user_id
        self.title = title
        self.content = content
        self.tags = tags
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.updated_at = updated_at or datetime.utcnow().isoformat()

    @classmethod
    def from_row(cls, row: Any) -> Optional['DBNote']:
        """
        Instantiate a DBNote from an sqlite3.Row object.
        """
        if not row:
            return None
        import json
        tags_raw = row["tags"]
        try:
            tags = json.loads(tags_raw) if tags_raw else []
        except Exception:
            tags = []
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            title=row["title"],
            content=row["content"],
            tags=tags,
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert DBNote fields to a dictionary with camelCase keys for frontend consumption.
        """
        return {
            "id": self.id,
            "userId": self.user_id,
            "title": self.title,
            "content": self.content,
            "tags": self.tags,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at
        }


from enum import Enum

class DocumentStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class DBDocument:
    def __init__(
        self,
        id: str,
        filename: str,
        file_hash: str,
        file_path: str,
        file_size: int,
        status: DocumentStatus = DocumentStatus.PENDING,
        error_message: Optional[str] = None,
        upload_time: Optional[str] = None
    ):
        self.id = id
        self.filename = filename
        self.file_hash = file_hash
        self.file_path = file_path
        self.file_size = file_size
        self.status = status
        self.error_message = error_message
        self.upload_time = upload_time or datetime.utcnow().isoformat()

    @classmethod
    def from_row(cls, row: Any) -> Optional['DBDocument']:
        """
        Instantiate a DBDocument from an sqlite3.Row object.
        """
        if not row:
            return None
        return cls(
            id=row["id"],
            filename=row["filename"],
            file_hash=row["file_hash"],
            file_path=row["file_path"],
            file_size=row["file_size"],
            status=DocumentStatus(row["status"]),
            error_message=row["error_message"],
            upload_time=row["upload_time"]
        )

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert DBDocument fields to a dictionary.
        """
        return {
            "id": self.id,
            "filename": self.filename,
            "fileHash": self.file_hash,
            "filePath": self.file_path,
            "fileSize": self.file_size,
            "status": self.status.value,
            "errorMessage": self.error_message,
            "uploadTime": self.upload_time
        }


class DBDocumentChunk:
    def __init__(
        self,
        id: Optional[int],
        document_id: str,
        chunk_index: int,
        text_content: str,
        page_number: Optional[int] = None,
        char_start: Optional[int] = None,
        char_end: Optional[int] = None,
        created_at: Optional[str] = None
    ):
        self.id = id
        self.document_id = document_id
        self.chunk_index = chunk_index
        self.text_content = text_content
        self.page_number = page_number
        self.char_start = char_start
        self.char_end = char_end
        self.created_at = created_at or datetime.utcnow().isoformat()

    @classmethod
    def from_row(cls, row: Any) -> Optional['DBDocumentChunk']:
        """
        Instantiate a DBDocumentChunk from an sqlite3.Row object.
        """
        if not row:
            return None
        return cls(
            id=row["id"],
            document_id=row["document_id"],
            chunk_index=row["chunk_index"],
            text_content=row["text_content"],
            page_number=row["page_number"],
            char_start=row["char_start"],
            char_end=row["char_end"],
            created_at=row["created_at"]
        )

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert DBDocumentChunk fields to a dictionary.
        """
        return {
            "id": self.id,
            "documentId": self.document_id,
            "chunkIndex": self.chunk_index,
            "textContent": self.text_content,
            "pageNumber": self.page_number,
            "charStart": self.char_start,
            "charEnd": self.char_end,
            "createdAt": self.created_at
        }


class DBStudyTopic:
    def __init__(
        self,
        id: str,
        user_id: int,
        title: str,
        difficulty: str,
        duration: int,
        confidence_score: int,
        quiz_score: float,
        revision_count: int = 0,
        last_studied: Optional[str] = None,
        created_at: Optional[str] = None,
        document_id: Optional[str] = None,
        note_id: Optional[int] = None
    ):
        self.id = id
        self.user_id = user_id
        self.title = title
        self.difficulty = difficulty
        self.duration = duration
        self.confidence_score = confidence_score
        self.quiz_score = quiz_score
        self.revision_count = revision_count
        self.last_studied = last_studied or datetime.utcnow().date().isoformat()
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.document_id = document_id
        self.note_id = note_id

    @classmethod
    def from_row(cls, row: Any) -> Optional['DBStudyTopic']:
        """
        Instantiate a DBStudyTopic from an sqlite3.Row object.
        """
        if not row:
            return None
            
        keys = []
        try:
            keys = row.keys()
        except AttributeError:
            pass
            
        doc_id = None
        n_id = None
        
        if "document_id" in keys:
            doc_id = row["document_id"]
        elif "documentId" in keys:
            doc_id = row["documentId"]
            
        if "note_id" in keys:
            n_id = row["note_id"]
        elif "noteId" in keys:
            n_id = row["noteId"]
            
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            title=row["title"],
            difficulty=row["difficulty"],
            duration=row["duration"],
            confidence_score=row["confidence_score"],
            quiz_score=row["quiz_score"],
            revision_count=row["revision_count"],
            last_studied=row["last_studied"],
            created_at=row["created_at"],
            document_id=doc_id,
            note_id=n_id
        )

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert DBStudyTopic fields to a dictionary with camelCase keys for frontend consumption.
        """
        return {
            "id": self.id,
            "userId": self.user_id,
            "title": self.title,
            "difficulty": self.difficulty,
            "duration": self.duration,
            "confidenceScore": self.confidence_score,
            "quizScore": self.quiz_score,
            "revisionCount": self.revision_count,
            "lastStudied": self.last_studied,
            "createdAt": self.created_at,
            "documentId": self.document_id,
            "noteId": self.note_id
        }






class DBStudySession:
    def __init__(
        self,
        id: str,
        user_id: int,
        topic_id: Optional[str],
        date: str,
        minutes: int,
        created_at: Optional[str] = None
    ):
        self.id = id
        self.user_id = user_id
        self.topic_id = topic_id
        self.date = date
        self.minutes = minutes
        self.created_at = created_at or datetime.utcnow().isoformat()

    @classmethod
    def from_row(cls, row: Any) -> Optional['DBStudySession']:
        if not row:
            return None
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            topic_id=row["topic_id"],
            date=row["date"],
            minutes=row["minutes"],
            created_at=row["created_at"]
        )

    def to_dict(self) -> Dict[str, Any]:
        """camelCase keys for the frontend session-log shape."""
        return {
            "id": self.id,
            "userId": self.user_id,
            "topicId": self.topic_id,
            "date": self.date,
            "minutes": self.minutes,
            "createdAt": self.created_at
        }


class DBQuizAttempt:
    def __init__(
        self,
        id: str,
        user_id: int,
        date: str,
        mode: Optional[str],
        difficulty: Optional[str],
        score: int,
        total: int,
        correct: int,
        created_at: Optional[str] = None
    ):
        self.id = id
        self.user_id = user_id
        self.date = date
        self.mode = mode
        self.difficulty = difficulty
        self.score = score
        self.total = total
        self.correct = correct
        self.created_at = created_at or datetime.utcnow().isoformat()

    @classmethod
    def from_row(cls, row: Any) -> Optional['DBQuizAttempt']:
        if not row:
            return None
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            date=row["date"],
            mode=row["mode"],
            difficulty=row["difficulty"],
            score=row["score"],
            total=row["total"],
            correct=row["correct"],
            created_at=row["created_at"]
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "userId": self.user_id,
            "date": self.date,
            "mode": self.mode,
            "difficulty": self.difficulty,
            "score": self.score,
            "total": self.total,
            "correct": self.correct,
            "createdAt": self.created_at
        }
