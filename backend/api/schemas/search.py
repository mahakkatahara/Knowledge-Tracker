from pydantic import BaseModel, Field, ConfigDict, AliasChoices
from typing import List, Optional

class SemanticSearchRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str = Field(..., description="Query string for semantic document search")
    top_k: int = Field(
        default=5,
        ge=1,
        le=100,
        validation_alias=AliasChoices("top_k", "topK"),
        serialization_alias="topK",
        description="Maximum number of chunks to return"
    )
    document_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("document_id", "documentId"),
        serialization_alias="documentId",
        description="Filter by specific document UUID"
    )
    filename: Optional[str] = Field(
        default=None,
        description="Filter by file name match (case-insensitive)"
    )
    similarity_threshold: Optional[float] = Field(
        default=0.35,
        ge=0.0,
        le=1.0,
        validation_alias=AliasChoices("similarity_threshold", "similarityThreshold"),
        serialization_alias="similarityThreshold",
        description="Minimum Cosine Similarity threshold score"
    )
    log_revision: bool = Field(
        default=False,
        validation_alias=AliasChoices("log_revision", "logRevision"),
        serialization_alias="logRevision",
        description="Optionally record search interaction as revision log activity"
    )
    topic_id: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("topic_id", "topicId"),
        serialization_alias="topicId",
        description="Target topic ID to log activity against. If omitted and logRevision is true, resolves from documentId search parameters or matches."
    )

class SemanticSearchResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    document_id: str = Field(..., serialization_alias="documentId")
    filename: str
    page: Optional[int]
    chunk_id: int = Field(..., serialization_alias="chunkId")
    score: float
    text: str

class SemanticSearchResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str
    results: List[SemanticSearchResult]
