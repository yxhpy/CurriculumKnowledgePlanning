"""
API v1 router aggregation
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    documents,
    courses,
    knowledge_graph,
    auth,
    users
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(knowledge_graph.router, prefix="/knowledge-graph", tags=["knowledge-graph"])