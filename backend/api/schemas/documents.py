from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List

class DocumentUploadResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    document_id: str = Field(..., serialization_alias="documentId")
    filename: str
    status: str
    chunk_count: int = Field(..., serialization_alias="chunkCount")
    message: str

class DocumentListItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    filename: str
    status: str
    upload_time: str = Field(..., serialization_alias="uploadTime")
    chunk_count: int = Field(..., serialization_alias="chunkCount")

class DocumentListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    documents: List[DocumentListItem]
    total_count: int = Field(..., serialization_alias="totalCount")
    page: int
    limit: int

class DocumentMetadata(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    filename: str
    file_hash: str = Field(..., serialization_alias="fileHash")
    file_path: str = Field(..., serialization_alias="filePath")
    file_size: int = Field(..., serialization_alias="fileSize")
    upload_time: str = Field(..., serialization_alias="uploadTime")

class ChunkStatistics(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chunk_count: int = Field(..., serialization_alias="chunkCount")
    average_chunk_length: float = Field(..., serialization_alias="averageChunkLength")
    total_characters: int = Field(..., serialization_alias="totalCharacters")

class DocumentDetailsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    metadata: DocumentMetadata
    processing_status: str = Field(..., serialization_alias="processingStatus")
    chunk_statistics: ChunkStatistics = Field(..., serialization_alias="chunkStatistics")

class DocumentStatusResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    document_id: str = Field(..., serialization_alias="documentId")
    status: str
    error_message: Optional[str] = Field(None, serialization_alias="errorMessage")
