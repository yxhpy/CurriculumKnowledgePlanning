"""
Database configuration and connection management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import redis
from neo4j import GraphDatabase
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# PostgreSQL
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Redis
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

# Neo4j
class Neo4jConnection:
    def __init__(self):
        self.driver = None
        
    def connect(self):
        """Create Neo4j connection"""
        try:
            self.driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            logger.info("Connected to Neo4j")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            
    def close(self):
        """Close Neo4j connection"""
        if self.driver:
            self.driver.close()
            
    def get_session(self):
        """Get Neo4j session"""
        if not self.driver:
            self.connect()
        return self.driver.session()

neo4j_conn = Neo4jConnection()

# Dependency to get DB session
def get_db() -> Generator[Session, None, None]:
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_redis():
    """Get Redis client"""
    return redis_client

def get_neo4j():
    """Get Neo4j session"""
    session = neo4j_conn.get_session()
    try:
        yield session
    finally:
        session.close()

async def init_db():
    """Initialize database connections"""
    try:
        # Create tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created")
        
        # Test Redis connection
        redis_client.ping()
        logger.info("Connected to Redis")
        
        # Connect to Neo4j
        neo4j_conn.connect()
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise