from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DocumentBase(BaseModel):
    filename: str
    file_type: str

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: int
    file_size: int
    status: str
    created_at: datetime
    updated_at: datetime
    content_hash: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    processed_content: Optional[str] = None
    raw_content: Optional[str] = None
    
    class Config:
        from_attributes = True

class DocumentList(DocumentResponse):
    pass

class DocumentManagement(DocumentResponse):
    can_retry: bool
    is_deleted: bool
    deleted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProcessingStatus(BaseModel):
    status_counts: list
    retryable_documents: int
    avg_processing_time_seconds: float
    currently_processing: int