"""
Document upload and processing endpoints
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from pathlib import Path

from app.core.database import get_db
from app.core.config import settings
from app.models.document import Document
from app.services.document_processor import DocumentProcessor
from app.schemas.document import DocumentResponse, DocumentList

router = APIRouter()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process a document"""
    
    # Validate file type
    file_extension = file.filename.split('.')[-1].lower()
    if file_extension not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type {file_extension} not allowed")
    
    # Validate file size
    file_size = 0
    content = await file.read()
    file_size = len(content)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(400, f"File size exceeds maximum of {settings.MAX_UPLOAD_SIZE} bytes")
    
    # Save file
    upload_dir = settings.UPLOAD_DIR
    upload_dir.mkdir(exist_ok=True)
    
    file_path = upload_dir / file.filename
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Create database record
    document = Document(
        filename=file.filename,
        file_type=file_extension,
        file_path=str(file_path),
        file_size=file_size,
        status="uploaded",
        owner_id=1  # TODO: Get from authenticated user
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # Process document in background
    background_tasks.add_task(process_document_task, document.id, str(file_path), file_extension)
    
    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        file_type=document.file_type,
        file_size=document.file_size,
        status=document.status,
        created_at=document.created_at
    )

def process_document_task(document_id: int, file_path: str, file_type: str):
    """Background task to process document"""
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    try:
        # Get document
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return
        
        # Update status
        document.status = "processing"
        db.commit()
        
        # Process document
        processor = DocumentProcessor()
        result = processor.process_document(file_path, file_type)
        
        if result.get('success'):
            document.raw_content = result.get('content', '')
            document.processed_content = result.get('content', '')
            document.metadata = str(result.get('metadata', {}))
            document.content_hash = result.get('file_hash', '')
            document.status = "processed"
        else:
            document.status = "failed"
            document.error_message = result.get('error', 'Unknown error')
        
        db.commit()
        
    except Exception as e:
        document.status = "failed"
        document.error_message = str(e)
        db.commit()
    finally:
        db.close()

@router.get("/stats")
async def get_document_stats(db: Session = Depends(get_db)):
    """Get document statistics"""
    from sqlalchemy import func
    
    # 总文档数
    total_documents = db.query(Document).count()
    
    # 各状态文档数
    processed_documents = db.query(Document).filter(Document.status == "processed").count()
    failed_documents = db.query(Document).filter(Document.status == "failed").count()
    
    # 总文件大小
    total_size = db.query(func.sum(Document.file_size)).scalar() or 0
    
    # 文件类型分布
    file_type_distribution = db.query(
        Document.file_type.label('type'),
        func.count(Document.id).label('count')
    ).group_by(Document.file_type).all()
    
    return {
        "total_documents": total_documents,
        "processed_documents": processed_documents,
        "failed_documents": failed_documents,
        "total_size": total_size,
        "file_type_distribution": [{"type": item.type, "count": item.count} for item in file_type_distribution]
    }

@router.get("/", response_model=List[DocumentList])
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all documents"""
    documents = db.query(Document).offset(skip).limit(limit).all()
    return documents

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get document details"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(404, "Document not found")
    return document

@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Delete a document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(404, "Document not found")
    
    # Delete file
    if document.file_path and os.path.exists(document.file_path):
        os.remove(document.file_path)
    
    # Delete database record
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted successfully"}