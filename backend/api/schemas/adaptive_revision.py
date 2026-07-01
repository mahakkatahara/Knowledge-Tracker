from pydantic import BaseModel, Field, AliasChoices, ConfigDict
from typing import List, Optional
from backend.api.schemas.models import TopicRecord

class AdaptiveRevisionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    records: List[TopicRecord] = Field(..., validation_alias=AliasChoices('records', 'topics'))
    max_daily_queue: int = Field(default=5, validation_alias=AliasChoices('max_daily_queue', 'maxDailyQueue'))
    reference_date: Optional[str] = Field(default=None, validation_alias=AliasChoices('reference_date', 'referenceDate'))

class TopicCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    difficulty: str = Field(default="Medium")
    duration: int
    confidence_score: int = Field(..., validation_alias=AliasChoices('confidence_score', 'confidenceScore'))
    quiz_score: float = Field(..., validation_alias=AliasChoices('quiz_score', 'quizScore'))
    revision_count: int = Field(default=0, validation_alias=AliasChoices('revision_count', 'revisionCount'))
    last_studied: str = Field(..., validation_alias=AliasChoices('last_studied', 'lastStudied'))
    document_id: Optional[str] = Field(None, validation_alias=AliasChoices("document_id", "documentId"))
    note_id: Optional[int] = Field(None, validation_alias=AliasChoices("note_id", "noteId"))

class TopicUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str
    difficulty: str = Field(default="Medium")
    duration: int
    confidence_score: int = Field(..., validation_alias=AliasChoices('confidence_score', 'confidenceScore'))
    quiz_score: float = Field(..., validation_alias=AliasChoices('quiz_score', 'quizScore'))
    revision_count: int = Field(..., validation_alias=AliasChoices('revision_count', 'revisionCount'))
    last_studied: str = Field(..., validation_alias=AliasChoices('last_studied', 'lastStudied'))
    document_id: Optional[str] = Field(None, validation_alias=AliasChoices("document_id", "documentId"))
    note_id: Optional[int] = Field(None, validation_alias=AliasChoices("note_id", "noteId"))

class DailyQueueItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    priority_score: int = Field(..., serialization_alias="priorityScore", validation_alias=AliasChoices("priority_score", "priorityScore"))
    retention_val: int = Field(..., serialization_alias="retentionVal", validation_alias=AliasChoices("retention_val", "retentionVal"))
    risk: str
    reason: str
    document_id: Optional[str] = Field(None, serialization_alias="documentId", validation_alias=AliasChoices("document_id", "documentId"))
    note_id: Optional[int] = Field(None, serialization_alias="noteId", validation_alias=AliasChoices("note_id", "noteId"))

class RecommendedOrderItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    priority_score: int = Field(..., serialization_alias="priorityScore", validation_alias=AliasChoices("priority_score", "priorityScore"))
    document_id: Optional[str] = Field(None, serialization_alias="documentId", validation_alias=AliasChoices("document_id", "documentId"))
    note_id: Optional[int] = Field(None, serialization_alias="noteId", validation_alias=AliasChoices("note_id", "noteId"))

class PostponedQueueItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    priority_score: int = Field(..., serialization_alias="priorityScore", validation_alias=AliasChoices("priority_score", "priorityScore"))
    retention_val: int = Field(..., serialization_alias="retentionVal", validation_alias=AliasChoices("retention_val", "retentionVal"))
    risk: str
    document_id: Optional[str] = Field(None, serialization_alias="documentId", validation_alias=AliasChoices("document_id", "documentId"))
    note_id: Optional[int] = Field(None, serialization_alias="noteId", validation_alias=AliasChoices("note_id", "noteId"))

class AdaptiveRevisionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    daily_queue: List[DailyQueueItem] = Field(..., serialization_alias="dailyQueue", validation_alias=AliasChoices("daily_queue", "dailyQueue"))
    recommended_order: List[RecommendedOrderItem] = Field(..., serialization_alias="recommendedOrder", validation_alias=AliasChoices("recommended_order", "recommendedOrder"))
    postponed_queue: List[PostponedQueueItem] = Field(..., serialization_alias="postponedQueue", validation_alias=AliasChoices("postponed_queue", "postponedQueue"))
