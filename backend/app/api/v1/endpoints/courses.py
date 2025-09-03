from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.services.llm_service import LLMService

router = APIRouter()

@router.post("/generate")
async def generate_course(
    request_data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Generate a course from documents"""
    from app.models.course import Course
    
    document_ids = request_data.get("document_ids", [])
    course_config = request_data.get("course_config", {})
    
    # Create course record immediately
    # 支持多种可能的字段名
    title = (course_config.get("name") or 
             course_config.get("title") or 
             course_config.get("courseName") or 
             "AI生成课程")
    
    course = Course(
        title=title,
        description="通过AI自动生成的课程内容",
        target_audience=course_config.get("audience", ""),
        difficulty_level=course_config.get("level", "intermediate"),
        estimated_hours=float(course_config.get("duration", "16").replace("课时", "")),
        status="published",
        creator_id=1  # TODO: Get from authenticated user
    )
    
    db.add(course)
    db.commit()
    db.refresh(course)
    
    # Add background task for detailed course content generation using thread pool
    import asyncio
    import concurrent.futures
    import threading
    
    # 使用线程池执行耗时的课程生成任务，避免阻塞主事件循环
    loop = asyncio.get_event_loop()
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
    
    # 将课程生成任务提交到线程池
    future = executor.submit(
        run_course_generation_sync, 
        course.id, 
        document_ids, 
        course_config
    )
    
    return {
        "message": "Course generation started",
        "course_id": course.id,
        "task_id": f"task-{course.id}"
    }

@router.get("/")
async def list_courses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all courses"""
    from app.models.course import Course
    from sqlalchemy.orm import selectinload
    
    courses = db.query(Course).options(
        selectinload(Course.chapters)
    ).offset(skip).limit(limit).all()
    
    # Format courses to match frontend expectations
    formatted_courses = []
    for course in courses:
        formatted_course = {
            "id": course.id,
            "title": course.title,
            "description": course.description or course.brief_description or "AI生成的智能课程",
            "status": course.status,
            "created_at": course.created_at.isoformat() if course.created_at else "",
            "document_count": 0,  # TODO: Add actual document count from relationships
            "chapters": len(course.chapters) if course.chapters else 0
        }
        formatted_courses.append(formatted_course)
    
    return formatted_courses

@router.get("/stats")
async def get_course_stats(db: Session = Depends(get_db)):
    """Get course statistics"""
    from app.models.course import Course
    
    # 总课程数
    total_courses = db.query(Course).count()
    
    # 各状态课程数
    published_courses = db.query(Course).filter(Course.status == "published").count()
    draft_courses = db.query(Course).filter(Course.status == "draft").count()
    
    return {
        "total_courses": total_courses,
        "published_courses": published_courses,
        "draft_courses": draft_courses,
    }

@router.get("/{course_id}")
async def get_course(
    course_id: int,
    db: Session = Depends(get_db)
):
    """Get course basic info"""
    from app.models.course import Course
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description or "AI生成的课程",
        "status": course.status,
        "created_at": course.created_at.isoformat() if course.created_at else ""
    }

@router.get("/{course_id}/detail")
async def get_course_detail(
    course_id: int,
    db: Session = Depends(get_db)
):
    """Get complete course details with chapters, sections, and knowledge points"""
    from app.models.course import Course, Chapter, Section, KnowledgePoint
    from sqlalchemy.orm import selectinload, joinedload
    
    # Query course with all related data
    course = db.query(Course).options(
        selectinload(Course.chapters).options(
            selectinload(Chapter.sections).options(
                selectinload(Section.knowledge_points)
            )
        )
    ).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Format the response
    course_detail = {
        "id": course.id,
        "title": course.title or "AI生成课程",
        "description": course.description or course.brief_description or "通过AI自动生成的课程内容",
        "difficulty_level": course.difficulty_level or "beginner",
        "target_audience": course.target_audience or "所有学习者",
        "estimated_hours": course.estimated_hours or 0,
        "status": course.status,
        "created_at": course.created_at.isoformat() if course.created_at else "",
        "updated_at": course.updated_at.isoformat() if course.updated_at else "",
        "chapters": []
    }
    
    # Format chapters
    for chapter in sorted(course.chapters, key=lambda x: x.chapter_number):
        chapter_data = {
            "id": chapter.id,
            "chapter_number": chapter.chapter_number,
            "title": chapter.title,
            "description": chapter.description or "",
            "estimated_hours": chapter.estimated_hours or 0,
            "difficulty_level": chapter.difficulty_level or "beginner",
            "learning_objectives": chapter.learning_objectives or [],
            "sections": []
        }
        
        # Format sections
        if chapter.sections:
            for section in sorted(chapter.sections, key=lambda x: x.section_number):
                section_data = {
                    "id": section.id,
                    "section_number": section.section_number,
                    "title": section.title,
                    "description": section.description or "",
                    "content": section.content or "",
                    "estimated_minutes": section.estimated_minutes or 0,
                    "knowledge_points": []
                }
                
                # Format knowledge points
                if section.knowledge_points:
                    for point in sorted(section.knowledge_points, key=lambda x: x.point_id):
                        point_data = {
                            "id": point.id,
                            "point_id": point.point_id,
                            "title": point.title,
                            "description": point.description or "",
                            "point_type": point.point_type or "concept",
                            "estimated_minutes": 15  # Default estimate, since not in database
                        }
                        section_data["knowledge_points"].append(point_data)
                
                chapter_data["sections"].append(section_data)
        
        course_detail["chapters"].append(chapter_data)
    
    return course_detail

@router.put("/{course_id}")
async def update_course(
    course_id: int,
    course_data: dict,
    db: Session = Depends(get_db)
):
    """Update course basic information"""
    from app.models.course import Course
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Update basic course information
    if 'title' in course_data:
        course.title = course_data['title']
    if 'description' in course_data:
        course.description = course_data['description']
    if 'difficulty_level' in course_data:
        course.difficulty_level = course_data['difficulty_level']
    if 'target_audience' in course_data:
        course.target_audience = course_data['target_audience']
    if 'estimated_hours' in course_data:
        course.estimated_hours = float(course_data['estimated_hours'])
    if 'status' in course_data:
        course.status = course_data['status']
    
    db.commit()
    db.refresh(course)
    
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "difficulty_level": course.difficulty_level,
        "target_audience": course.target_audience,
        "estimated_hours": course.estimated_hours,
        "status": course.status,
        "updated_at": course.updated_at.isoformat() if course.updated_at else ""
    }

@router.put("/{course_id}/chapters/{chapter_id}")
async def update_chapter(
    course_id: int,
    chapter_id: int,
    chapter_data: dict,
    db: Session = Depends(get_db)
):
    """Update chapter information"""
    from app.models.course import Course, Chapter
    
    # Verify course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Find the chapter
    chapter = db.query(Chapter).filter(
        Chapter.id == chapter_id,
        Chapter.course_id == course_id
    ).first()
    
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    # Update chapter information
    if 'title' in chapter_data:
        chapter.title = chapter_data['title']
    if 'description' in chapter_data:
        chapter.description = chapter_data['description']
    if 'estimated_hours' in chapter_data:
        chapter.estimated_hours = float(chapter_data['estimated_hours'])
    if 'difficulty_level' in chapter_data:
        chapter.difficulty_level = chapter_data['difficulty_level']
    if 'learning_objectives' in chapter_data:
        chapter.learning_objectives = chapter_data['learning_objectives']
    
    db.commit()
    db.refresh(chapter)
    
    return {
        "id": chapter.id,
        "chapter_number": chapter.chapter_number,
        "title": chapter.title,
        "description": chapter.description,
        "estimated_hours": chapter.estimated_hours,
        "difficulty_level": chapter.difficulty_level,
        "learning_objectives": chapter.learning_objectives
    }

@router.put("/{course_id}/chapters/{chapter_id}/sections/{section_id}")
async def update_section(
    course_id: int,
    chapter_id: int,
    section_id: int,
    section_data: dict,
    db: Session = Depends(get_db)
):
    """Update section information"""
    from app.models.course import Course, Chapter, Section
    
    # Verify course and chapter exist
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    chapter = db.query(Chapter).filter(
        Chapter.id == chapter_id,
        Chapter.course_id == course_id
    ).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    # Find the section
    section = db.query(Section).filter(
        Section.id == section_id,
        Section.chapter_id == chapter_id
    ).first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    
    # Update section information
    if 'title' in section_data:
        section.title = section_data['title']
    if 'description' in section_data:
        section.description = section_data['description']
    if 'content' in section_data:
        section.content = section_data['content']
    if 'estimated_minutes' in section_data:
        section.estimated_minutes = int(section_data['estimated_minutes'])
    
    db.commit()
    db.refresh(section)
    
    return {
        "id": section.id,
        "section_number": section.section_number,
        "title": section.title,
        "description": section.description,
        "content": section.content,
        "estimated_minutes": section.estimated_minutes
    }

@router.put("/{course_id}/chapters/{chapter_id}/sections/{section_id}/knowledge-points/{point_id}")
async def update_knowledge_point(
    course_id: int,
    chapter_id: int,
    section_id: int,
    point_id: int,
    point_data: dict,
    db: Session = Depends(get_db)
):
    """Update knowledge point information"""
    from app.models.course import Course, Chapter, Section, KnowledgePoint
    
    # Verify course, chapter, and section exist
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    chapter = db.query(Chapter).filter(
        Chapter.id == chapter_id,
        Chapter.course_id == course_id
    ).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    section = db.query(Section).filter(
        Section.id == section_id,
        Section.chapter_id == chapter_id
    ).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    
    # Find the knowledge point
    knowledge_point = db.query(KnowledgePoint).filter(
        KnowledgePoint.id == point_id,
        KnowledgePoint.section_id == section_id
    ).first()
    
    if not knowledge_point:
        raise HTTPException(status_code=404, detail="Knowledge point not found")
    
    # Update knowledge point information
    if 'title' in point_data:
        knowledge_point.title = point_data['title']
    if 'description' in point_data:
        knowledge_point.description = point_data['description']
    if 'point_type' in point_data:
        knowledge_point.point_type = point_data['point_type']
    
    db.commit()
    db.refresh(knowledge_point)
    
    return {
        "id": knowledge_point.id,
        "point_id": knowledge_point.point_id,
        "title": knowledge_point.title,
        "description": knowledge_point.description,
        "point_type": knowledge_point.point_type
    }

@router.delete("/{course_id}")
async def delete_course(
    course_id: int,
    db: Session = Depends(get_db)
):
    """Delete a course and all its related data"""
    from app.models.course import Course
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.delete(course)
    db.commit()
    
    return {"message": f"Course {course_id} deleted successfully"}

def run_course_generation_sync(course_id: int, document_ids: List[int], config: dict):
    """同步执行课程生成任务，在线程池中运行以避免阻塞主事件循环"""
    import asyncio
    import threading
    
    # 在新线程中创建新的事件循环来处理WebSocket更新
    def setup_websocket_loop():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop
    
    # 为WebSocket通信创建独立的事件循环
    ws_loop = setup_websocket_loop()
    
    try:
        # 运行课程生成任务
        ws_loop.run_until_complete(
            generate_course_content_task_impl(course_id, document_ids, config, ws_loop)
        )
    finally:
        ws_loop.close()

async def generate_course_content_task_impl(course_id: int, document_ids: List[int], config: dict, ws_loop):
    """Background task to generate detailed course content using LLM"""
    from app.core.database import SessionLocal
    from app.models.course import Course, Chapter, Section
    from app.models.document import Document
    from app.api.v1.websocket import send_progress_update, send_completion_update, send_error_update
    import logging
    import asyncio
    import concurrent.futures
    
    logger = logging.getLogger(__name__)
    db = SessionLocal()
    task_id = f"task-{course_id}"
    
    # 创建线程池执行器用于同步LLM调用
    thread_executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    
    try:
        # 发送开始通知
        await send_progress_update(task_id, "initializing", 5, "开始课程生成...")
        
        # Get course
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            error_msg = f"Course {course_id} not found"
            logger.error(error_msg)
            await send_error_update(task_id, error_msg, "initializing")
            return
        
        # Initialize LLM service
        llm_service = LLMService()
        
        await send_progress_update(task_id, "preparing", 10, "准备文档内容...")
        
        # Get documents content
        document_content = ""
        if document_ids:
            documents = db.query(Document).filter(Document.id.in_(document_ids)).all()
            document_content = "\n\n".join([
                doc.processed_content or doc.raw_content or ""
                for doc in documents if doc.processed_content or doc.raw_content
            ])
        
        # If no document content, use course title and description
        if not document_content:
            document_content = f"课程标题：{course.title}\n课程描述：{course.description}"
        
        logger.info(f"Starting LLM-based content generation for course {course_id}")
        
        await send_progress_update(task_id, "introduction", 20, "生成课程介绍...")
        
        # 1. Generate course introduction (异步执行)
        intro_result = await ws_loop.run_in_executor(
            thread_executor,
            llm_service.generate_course_introduction,
            document_content,
            config.get('type', '通用')
        )
        
        if intro_result['success']:
            intro_data = intro_result['data']
            # 更新课程标题和描述
            if intro_data.get('title'):
                course.title = intro_data.get('title')
            course.description = intro_data.get('brief_description') or course.description
            course.brief_description = intro_data.get('brief_description')
            course.target_audience = intro_data.get('target_audience')
            course.prerequisites = intro_data.get('prerequisites')
            course.learning_outcomes = intro_data.get('learning_outcomes', [])
            course.course_highlights = intro_data.get('course_highlights', [])
            course.difficulty_level = intro_data.get('difficulty_level', 'intermediate')
            # 立即提交课程基本信息更新
            db.commit()
            db.refresh(course)
            logger.info("Course introduction generated successfully")
            await send_progress_update(task_id, "introduction", 30, "课程介绍生成完成")
        else:
            error_msg = f"Failed to generate course introduction: {intro_result.get('error')}"
            logger.error(error_msg)
            await send_error_update(task_id, error_msg, "introduction")
        
        await send_progress_update(task_id, "objectives", 40, "生成学习目标...")
        
        # 2. Generate learning objectives (异步执行)
        objectives_result = await ws_loop.run_in_executor(
            thread_executor,
            llm_service.generate_learning_objectives,
            document_content,
            course.difficulty_level
        )
        
        if objectives_result['success']:
            objectives_data = objectives_result['data']
            course.objectives = objectives_data
            logger.info("Learning objectives generated successfully")
            await send_progress_update(task_id, "objectives", 50, "学习目标生成完成")
        else:
            error_msg = f"Failed to generate learning objectives: {objectives_result.get('error')}"
            logger.error(error_msg)
            await send_error_update(task_id, error_msg, "objectives")
        
        await send_progress_update(task_id, "structure", 60, "生成章节结构...")
        
        # 3. Generate chapter structure (framework only) (异步执行)
        structure_result = await ws_loop.run_in_executor(
            thread_executor,
            llm_service.generate_chapter_structure,
            document_content,
            config.get('chapters', 8)
        )
        
        chapters_list = []
        if structure_result['success']:
            structure_data = structure_result['data']
            chapters_data = structure_data.get('chapters', [])
            
            # Create chapter records (without detailed content)
            for i, chapter_info in enumerate(chapters_data):
                chapter = Chapter(
                    course_id=course_id,
                    chapter_number=chapter_info.get('chapter_id', i + 1),
                    title=chapter_info.get('chapter_title', f'第{i+1}章'),
                    description=chapter_info.get('chapter_description', ''),
                    estimated_hours=chapter_info.get('estimated_hours', 2.0),
                    learning_objectives=chapter_info.get('learning_objectives', [])
                )
                db.add(chapter)
                db.flush()  # Get chapter ID
                chapters_list.append((chapter, chapter_info))
            
            # Update total estimated hours
            course.estimated_hours = structure_data.get('estimated_hours', course.estimated_hours)
            logger.info(f"Generated {len(chapters_data)} chapter frameworks")
            await send_progress_update(task_id, "structure", 70, f"生成了 {len(chapters_data)} 个章节框架")
            
        else:
            error_msg = f"Failed to generate chapter structure: {structure_result.get('error')}"
            logger.error(error_msg)
            await send_error_update(task_id, error_msg, "structure")
            # Fallback: create a basic chapter structure
            chapter = Chapter(
                course_id=course_id,
                chapter_number=1,
                title="第一章：课程概述",
                description="本章介绍课程的基本概念和核心内容",
                estimated_hours=2.0
            )
            db.add(chapter)
            db.flush()
            chapters_list.append((chapter, {}))
            await send_progress_update(task_id, "structure", 70, "使用默认章节结构")
        
        # Commit chapters first
        db.commit()
        
        await send_progress_update(task_id, "content", 75, "开始生成章节详细内容...")
        
        # 4. Generate detailed content for each chapter separately
        logger.info("Starting detailed content generation for each chapter...")
        
        total_chapters = len(chapters_list)
        for idx, (chapter, chapter_info) in enumerate(chapters_list, 1):
            progress = 75 + (idx / total_chapters) * 20  # 75-95%的进度
            await send_progress_update(task_id, "content", int(progress), 
                                     f"正在生成第 {chapter.chapter_number} 章内容: {chapter.title}")
            logger.info(f"Generating content for Chapter {chapter.chapter_number}: {chapter.title}")
            
            try:
                # 异步执行章节内容生成
                content_result = await ws_loop.run_in_executor(
                    thread_executor,
                    llm_service.generate_simple_chapter_content,
                    document_content,
                    chapter_info,
                    chapter.chapter_number
                )
                
                if content_result['success']:
                    content_data = content_result['data']
                    sections_data = content_data.get('sections', [])
                    
                    # Create sections and knowledge points
                    for i, section_info in enumerate(sections_data, 1):
                        # 使用LLM生成的概要内容，而不是重新构建
                        section_content = section_info.get('content', f"## {section_info.get('title', '')}\n\n暂无内容概要")
                        knowledge_points_data = section_info.get('knowledge_points', [])
                        
                        section = Section(
                            chapter_id=chapter.id,
                            section_number=f"{chapter.chapter_number}.{i}",
                            title=section_info.get('title', ''),
                            description=f"第{chapter.chapter_number}.{i}节 - {section_info.get('title', '')}",
                            content=section_content,  # 保存详细的内容
                            estimated_minutes=45
                        )
                        db.add(section)
                        db.flush()  # Get section ID
                        
                        # Create knowledge points
                        for j, kp_info in enumerate(knowledge_points_data, 1):
                            from app.models.course import KnowledgePoint
                            knowledge_point = KnowledgePoint(
                                section_id=section.id,
                                point_id=f"{chapter.chapter_number}.{i}.{j}",
                                title=kp_info.get('title', ''),
                                description=kp_info.get('description', ''),
                                point_type='concept',  # 简化类型
                                prerequisites=[]  # 简化依赖
                            )
                            db.add(knowledge_point)
                    
                    logger.info(f"Generated {len(sections_data)} sections for Chapter {chapter.chapter_number}")
                    
                else:
                    logger.error(f"Failed to generate content for Chapter {chapter.chapter_number}: {content_result.get('error')}")
                    # Create a basic section as fallback
                    fallback_content = f"""## 第{chapter.chapter_number}章内容概述

### 主要内容：
本章将介绍{chapter.title}的核心概念和重要知识点。

### 学习目标：
通过本章学习，学员将能够：
- 理解{chapter.title}的基本概念
- 掌握相关的实践方法
- 应用所学知识解决实际问题

### 重点内容：
1. **基础概念** - 介绍基本理论和定义
2. **实践方法** - 学习具体的操作技能  
3. **案例分析** - 通过实例深化理解
4. **总结与展望** - 整合知识并展望发展"""
                    
                    section = Section(
                        chapter_id=chapter.id,
                        section_number=f"{chapter.chapter_number}.1",
                        title=f"第{chapter.chapter_number}章内容概述",
                        description=f"第{chapter.chapter_number}章 - {chapter.title}概述",
                        content=fallback_content,
                        estimated_minutes=60
                    )
                    db.add(section)
                    
            except Exception as e:
                logger.error(f"Error generating content for Chapter {chapter.chapter_number}: {str(e)}")
                # Create fallback section
                error_fallback_content = f"""## 第{chapter.chapter_number}章内容

### 内容生成状态：
章节内容生成过程中遇到技术问题，系统正在处理中。

### 临时内容：
本章节将涵盖{chapter.title}相关的重要内容，包括：
- 核心概念和理论基础
- 实际应用和操作方法
- 案例分析和最佳实践

请稍后刷新页面查看完整内容，或联系管理员获取帮助。

**错误信息：** {str(e)[:100]}..."""

                section = Section(
                    chapter_id=chapter.id,
                    section_number=f"{chapter.chapter_number}.1",
                    title=f"第{chapter.chapter_number}章内容",
                    description=f"第{chapter.chapter_number}章 - 内容生成中",
                    content=error_fallback_content,
                    estimated_minutes=60
                )
                db.add(section)
        
        # Update course status
        course.status = "published"
        
        # Commit all changes
        db.commit()
        logger.info(f"Course content generation completed for course {course_id}")
        
        # 发送完成通知
        await send_completion_update(task_id, True, "课程生成完成！", course_id)
        
    except Exception as e:
        error_msg = f"Course content generation error: {str(e)}"
        logger.error(error_msg)
        await send_error_update(task_id, error_msg)
        db.rollback()
        # Update course status to indicate error
        try:
            course = db.query(Course).filter(Course.id == course_id).first()
            if course:
                course.status = "failed"
                db.commit()
            await send_completion_update(task_id, False, f"课程生成失败: {error_msg}")
        except Exception as commit_error:
            logger.error(f"Failed to update course status: {commit_error}")
    finally:
        # 清理资源
        thread_executor.shutdown(wait=True)
        db.close()