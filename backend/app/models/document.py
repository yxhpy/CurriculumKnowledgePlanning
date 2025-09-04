"""
Document model
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Float, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import BaseModel

class Document(BaseModel):
    __tablename__ = "documents"
    
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50))  # pdf, docx, xlsx, txt, md
    file_path = Column(String(500))
    file_size = Column(Integer)  # in bytes
    content_hash = Column(String(64))  # SHA256 hash
    
    # Extracted content
    raw_content = Column(Text)
    processed_content = Column(Text)
    doc_metadata = Column("metadata", Text)  # JSON string
    
    # Processing status and timing
    status = Column(String(50), default="uploaded")  # uploaded, processing, processed, failed
    error_message = Column(Text)
    processing_started_at = Column(DateTime(timezone=True))
    processing_completed_at = Column(DateTime(timezone=True))
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Management flags
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True))
    
    # Foreign keys
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="documents")
    
    def can_retry(self) -> bool:
        """Check if document can be retried"""
        return self.status == "failed" and self.retry_count < self.max_retries
    
    def is_processing_timeout(self, timeout_minutes: int = 30) -> bool:
        """Check if processing has timed out"""
        if self.status != "processing" or not self.processing_started_at:
            return False
        
        timeout_threshold = func.now() - func.make_interval(mins=timeout_minutes)
        return self.processing_started_at < timeout_threshold