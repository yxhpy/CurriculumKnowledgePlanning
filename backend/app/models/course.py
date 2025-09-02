"""
Course related models
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Course(BaseModel):
    __tablename__ = "courses"
    
    title = Column(String(255), nullable=False)
    description = Column(Text)
    brief_description = Column(Text)
    target_audience = Column(String(500))
    prerequisites = Column(Text)
    difficulty_level = Column(String(50))  # beginner, intermediate, advanced
    estimated_hours = Column(Float)
    status = Column(String(50), default="draft")  # draft, published, archived
    
    # Learning outcomes stored as JSON array
    learning_outcomes = Column(JSON)
    course_highlights = Column(JSON)
    
    # Foreign keys
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    creator = relationship("User", back_populates="courses")
    chapters = relationship("Chapter", back_populates="course", cascade="all, delete-orphan")
    
class Chapter(BaseModel):
    __tablename__ = "chapters"
    
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    estimated_hours = Column(Float)
    difficulty_level = Column(String(50))
    learning_objectives = Column(JSON)
    
    # Foreign keys
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    
    # Relationships
    course = relationship("Course", back_populates="chapters")
    sections = relationship("Section", back_populates="chapter", cascade="all, delete-orphan")
    
class Section(BaseModel):
    __tablename__ = "sections"
    
    section_number = Column(String(20))  # e.g., "1.1", "1.2"
    title = Column(String(255), nullable=False)
    description = Column(Text)
    content = Column(Text)
    estimated_minutes = Column(Integer)
    
    # Foreign keys
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False)
    
    # Relationships
    chapter = relationship("Chapter", back_populates="sections")
    knowledge_points = relationship("KnowledgePoint", back_populates="section", cascade="all, delete-orphan")
    
class KnowledgePoint(BaseModel):
    __tablename__ = "knowledge_points"
    
    point_id = Column(String(50))  # e.g., "1.1.1"
    title = Column(String(255), nullable=False)
    description = Column(Text)
    point_type = Column(String(50))  # concept, method, tool, case
    prerequisites = Column(JSON)  # Array of prerequisite point IDs
    
    # Foreign keys
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    
    # Relationships
    section = relationship("Section", back_populates="knowledge_points")