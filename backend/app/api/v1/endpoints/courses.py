from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.services.llm_service import LLMService

router = APIRouter()

@router.post("/generate")
async def generate_course(
    background_tasks: BackgroundTasks,
    document_ids: List[int],
    course_config: dict,
    db: Session = Depends(get_db)
):
    """Generate a course from documents"""
    # Add background task for course generation
    background_tasks.add_task(generate_course_task, document_ids, course_config)
    
    return {
        "message": "Course generation started",
        "task_id": "task-123"
    }

@router.get("/")
async def list_courses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all courses"""
    return []

@router.get("/{course_id}")
async def get_course(
    course_id: int,
    db: Session = Depends(get_db)
):
    """Get course details"""
    return {
        "id": course_id,
        "title": "Sample Course",
        "description": "Course details"
    }

def generate_course_task(document_ids: List[int], config: dict):
    """Background task to generate course"""
    llm_service = LLMService()
    # Implementation of course generation
    pass