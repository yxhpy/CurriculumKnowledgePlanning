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
    content_hash: Optional[str] = None
    
    class Config:
        from_attributes = True

class DocumentList(DocumentResponse):
    pass