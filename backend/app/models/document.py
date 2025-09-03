"""
Document model
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
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
    
    # Processing status
    status = Column(String(50), default="uploaded")  # uploaded, processing, processed, failed
    error_message = Column(Text)
    
    # Foreign keys
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="documents")