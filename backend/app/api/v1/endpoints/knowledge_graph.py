from fastapi import APIRouter, Depends
from app.core.database import get_neo4j

router = APIRouter()

@router.get("/{course_id}")
async def get_knowledge_graph(course_id: int):
    """Get knowledge graph for a course"""
    # Sample data
    return {
        "nodes": [
            {"id": "1", "label": "Course Root", "type": "course"},
            {"id": "2", "label": "Chapter 1", "type": "chapter"},
            {"id": "3", "label": "Topic 1.1", "type": "topic"},
        ],
        "edges": [
            {"from": "1", "to": "2", "relationship": "contains"},
            {"from": "2", "to": "3", "relationship": "contains"},
        ]
    }

@router.post("/{course_id}/update")
async def update_knowledge_graph(course_id: int, graph_data: dict):
    """Update knowledge graph"""
    return {"message": "Graph updated successfully"}