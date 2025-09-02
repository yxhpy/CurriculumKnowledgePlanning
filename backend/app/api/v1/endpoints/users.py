from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter()

@router.get("/me")
async def get_current_user():
    """Get current user information"""
    return {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com"
    }

@router.put("/me")
async def update_user():
    """Update user profile"""
    return {"message": "User profile update endpoint - to be implemented"}