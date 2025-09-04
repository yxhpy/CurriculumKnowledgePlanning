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
    
    return DocumentResponse.model_validate(document)

def process_document_task(document_id: int, file_path: str, file_type: str):
    """Background task to process document"""
    from app.core.database import SessionLocal
    from sqlalchemy.sql import func
    
    db = SessionLocal()
    try:
        # Get document
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return
        
        # Update status and start time
        document.status = "processing"
        document.processing_started_at = func.now()
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
            document.processing_completed_at = func.now()
        else:
            document.status = "failed"
            document.error_message = result.get('error', 'Unknown error')
            document.retry_count += 1
            document.processing_completed_at = func.now()
        
        db.commit()
        
    except Exception as e:
        document.status = "failed"
        document.error_message = str(e)
        document.retry_count += 1
        document.processing_completed_at = func.now()
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
    documents = db.query(Document).filter(
        Document.is_deleted.is_(False)
    ).offset(skip).limit(limit).all()
    return documents

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get document details"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.is_deleted.is_(False)
    ).first()
    if not document:
        raise HTTPException(404, "Document not found")
    return document

@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    force: bool = False,
    db: Session = Depends(get_db)
):
    """Delete a document (soft delete by default)"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.is_deleted.is_(False)
    ).first()
    if not document:
        raise HTTPException(404, "Document not found")
    
    if force:
        # Hard delete - remove file and database record
        if document.file_path and os.path.exists(document.file_path):
            os.remove(document.file_path)
        db.delete(document)
    else:
        # Soft delete - mark as deleted
        from sqlalchemy.sql import func
        document.is_deleted = True
        document.deleted_at = func.now()
    
    db.commit()
    
    return {"message": "Document deleted successfully"}

@router.post("/{document_id}/retry")
async def retry_document_processing(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Retry processing a failed document"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.is_deleted.is_(False)
    ).first()
    if not document:
        raise HTTPException(404, "Document not found")
    
    if not document.can_retry():
        raise HTTPException(400, "Document cannot be retried")
    
    # Reset document status
    document.status = "uploaded"
    document.error_message = None
    db.commit()
    
    # Process document in background
    background_tasks.add_task(process_document_task, document.id, document.file_path, document.file_type)
    
    return {"message": "Document retry initiated"}

@router.get("/management/status")
async def get_processing_status(db: Session = Depends(get_db)):
    """Get current processing status and queue info"""
    from sqlalchemy import func, case
    
    # Document counts by status
    status_counts = db.query(
        Document.status.label('status'),
        func.count(Document.id).label('count')
    ).filter(Document.is_deleted.is_(False)).group_by(Document.status).all()
    
    # Failed documents that can be retried
    retryable_count = db.query(Document).filter(
        Document.status == "failed",
        Document.retry_count < Document.max_retries,
        Document.is_deleted.is_(False)
    ).count()
    
    # Processing time statistics
    processing_stats = db.query(
        func.avg(
            case(
                (Document.processing_completed_at.is_not(None),
                 func.extract('epoch', Document.processing_completed_at - Document.processing_started_at))
            )
        ).label('avg_processing_time'),
        func.count(
            case((Document.status == "processing", 1))
        ).label('currently_processing')
    ).filter(Document.is_deleted.is_(False)).first()
    
    return {
        "status_counts": [{"status": item.status, "count": item.count} for item in status_counts],
        "retryable_documents": retryable_count,
        "avg_processing_time_seconds": processing_stats.avg_processing_time or 0,
        "currently_processing": processing_stats.currently_processing or 0
    }

@router.get("/management/failed")
async def get_failed_documents(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get list of failed documents with retry info"""
    documents = db.query(Document).filter(
        Document.status == "failed",
        Document.is_deleted.is_(False)
    ).order_by(Document.updated_at.desc()).offset(skip).limit(limit).all()
    
    return [{
        "id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "error_message": doc.error_message,
        "retry_count": doc.retry_count,
        "max_retries": doc.max_retries,
        "can_retry": doc.can_retry(),
        "updated_at": doc.updated_at
    } for doc in documents]

@router.post("/management/cleanup-timeouts")
async def cleanup_timeout_documents(db: Session = Depends(get_db)):
    """Mark timed-out processing documents as failed"""
    from sqlalchemy.sql import func
    
    timeout_threshold = func.now() - func.make_interval(mins=30)
    
    timed_out_docs = db.query(Document).filter(
        Document.status == "processing",
        Document.processing_started_at < timeout_threshold,
        Document.is_deleted.is_(False)
    ).all()
    
    for doc in timed_out_docs:
        doc.status = "failed"
        doc.error_message = "Processing timeout (30 minutes)"
        doc.processing_completed_at = func.now()
    
    db.commit()
    
    return {
        "message": f"Cleaned up {len(timed_out_docs)} timed-out documents",
        "document_ids": [doc.id for doc in timed_out_docs]
    }