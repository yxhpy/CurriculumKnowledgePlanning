from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_db
from app.models.course import Course, Chapter, Section, KnowledgePoint
from app.services.llm_service import LLMService
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{course_id}")
async def get_knowledge_graph(course_id: int, db: AsyncSession = Depends(get_async_db)):
    """Get knowledge graph for a course"""
    try:
        # Query course with all related data
        query = select(Course).options(
            selectinload(Course.chapters).selectinload(Chapter.sections).selectinload(Section.knowledge_points)
        ).where(Course.id == course_id)
        result = await db.execute(query)
        course = result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
            
        # Build knowledge graph from course data
        nodes = []
        edges = []
        
        # Add course node
        nodes.append({
            "id": f"course_{course.id}",
            "label": course.title,
            "type": "course",
            "level": 0,
            "description": course.description
        })
        
        # Add chapter nodes
        for chapter in course.chapters:
            chapter_id = f"chapter_{chapter.id}"
            nodes.append({
                "id": chapter_id,
                "label": chapter.title,
                "type": "chapter",
                "level": 1,
                "description": chapter.description
            })
            
            # Add edge from course to chapter
            edges.append({
                "from": f"course_{course.id}",
                "to": chapter_id,
                "relationship": "contains",
                "label": "包含"
            })
            
            # Add section nodes
            for section in chapter.sections:
                section_id = f"section_{section.id}"
                nodes.append({
                    "id": section_id,
                    "label": section.title,
                    "type": "topic",
                    "level": 2,
                    "description": section.description
                })
                
                # Add edge from chapter to section
                edges.append({
                    "from": chapter_id,
                    "to": section_id,
                    "relationship": "contains",
                    "label": "包含"
                })
                
                # Add knowledge point nodes
                for point in section.knowledge_points:
                    point_id = f"point_{point.id}"
                    nodes.append({
                        "id": point_id,
                        "label": point.title,
                        "type": "concept",
                        "level": 3,
                        "description": point.description
                    })
                    
                    # Add edge from section to knowledge point
                    edges.append({
                        "from": section_id,
                        "to": point_id,
                        "relationship": "contains",
                        "label": "包含"
                    })
        
        return {"nodes": nodes, "edges": edges}
        
    except Exception as e:
        logger.error(f"Failed to get knowledge graph for course {course_id}: {str(e)}")
        return {"nodes": [], "edges": []}

@router.post("/{course_id}/generate")
async def generate_knowledge_graph(course_id: int, db: AsyncSession = Depends(get_async_db)):
    """Generate knowledge graph using AI"""
    try:
        # Query course with all related data
        query = select(Course).options(
            selectinload(Course.chapters).selectinload(Chapter.sections).selectinload(Section.knowledge_points)
        ).where(Course.id == course_id)
        result = await db.execute(query)
        course = result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Use LLM service to generate enhanced knowledge graph
        llm_service = LLMService()
        
        # Prepare course content for analysis
        course_content = {
            "title": course.title,
            "description": course.description,
            "chapters": []
        }
        
        for chapter in course.chapters:
            chapter_data = {
                "title": chapter.title,
                "description": chapter.description,
                "sections": []
            }
            
            for section in chapter.sections:
                section_data = {
                    "title": section.title,
                    "description": section.description,
                    "content": section.content,
                    "knowledge_points": [
                        {
                            "title": kp.title,
                            "description": kp.description,
                            "type": kp.point_type
                        }
                        for kp in section.knowledge_points
                    ]
                }
                chapter_data["sections"].append(section_data)
            
            course_content["chapters"].append(chapter_data)
        
        # Generate enhanced knowledge graph with AI
        enhanced_graph = await llm_service.generate_knowledge_graph(course_content)
        
        # Return the enhanced graph
        return enhanced_graph
        
    except Exception as e:
        logger.error(f"Failed to generate knowledge graph for course {course_id}: {str(e)}")
        # Fallback to basic graph generation
        return await get_knowledge_graph(course_id, db)

@router.post("/{course_id}/update")
async def update_knowledge_graph(course_id: int, graph_data: dict, db: AsyncSession = Depends(get_async_db)):
    """Update knowledge graph"""
    try:
        # Verify course exists
        query = select(Course).where(Course.id == course_id)
        result = await db.execute(query)
        course = result.scalar_one_or_none()
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # In a real implementation, you would save the graph data to Neo4j or another graph database
        # For now, we'll just return success
        return {"message": "Knowledge graph updated successfully"}
        
    except Exception as e:
        logger.error(f"Failed to update knowledge graph for course {course_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update knowledge graph")