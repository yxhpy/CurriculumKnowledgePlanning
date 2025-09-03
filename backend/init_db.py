#!/usr/bin/env python3
"""Initialize database with default data"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.base import Base
from app.models.user import User
from passlib.context import CryptContext
import logging

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize database with default data"""
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL.replace("+asyncpg", ""))
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    
    # Create session
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Check if default user exists
        default_user = db.query(User).filter(User.id == 1).first()
        if not default_user:
            # Create default user with hashed password
            default_user = User(
                id=1,
                username="admin",
                email="admin@example.com",
                full_name="System Administrator",
                hashed_password=pwd_context.hash("admin123")
            )
            db.add(default_user)
            db.commit()
            logger.info("Default user created")
        else:
            logger.info("Default user already exists")
            
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
    print("Database initialized successfully")