from pydantic import BaseModel, Field, AliasChoices, ConfigDict
from typing import Optional


class SessionCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    date: str
    minutes: int = 0
    topic_id: Optional[str] = Field(None, validation_alias=AliasChoices("topic_id", "topicId"))


class SessionRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    date: str
    minutes: int
    topic_id: Optional[str] = Field(None, serialization_alias="topicId", validation_alias=AliasChoices("topic_id", "topicId"))
    created_at: Optional[str] = Field(None, serialization_alias="createdAt", validation_alias=AliasChoices("created_at", "createdAt"))


class QuizAttemptCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    date: str
    mode: Optional[str] = None
    difficulty: Optional[str] = None
    score: int = 0
    total: int = 0
    correct: int = 0


class QuizAttemptRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    date: str
    mode: Optional[str] = None
    difficulty: Optional[str] = None
    score: int
    total: int
    correct: int
    created_at: Optional[str] = Field(None, serialization_alias="createdAt", validation_alias=AliasChoices("created_at", "createdAt"))
