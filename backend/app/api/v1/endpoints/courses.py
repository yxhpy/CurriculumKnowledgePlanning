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
    course = Course(
        title=course_config.get("name", "AI生成课程"),
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
            course.brief_description = intro_data.get('brief_description')
            course.target_audience = intro_data.get('target_audience')
            course.prerequisites = intro_data.get('prerequisites')
            course.learning_outcomes = intro_data.get('learning_outcomes', [])
            course.course_highlights = intro_data.get('course_highlights', [])
            course.difficulty_level = intro_data.get('difficulty_level', 'intermediate')
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
                        section = Section(
                            chapter_id=chapter.id,
                            section_number=f"{chapter.chapter_number}.{i}",
                            title=section_info.get('title', ''),
                            description=f"第{chapter.chapter_number}.{i}节内容",
                            content=section_info.get('title', ''),  # 使用标题作为内容
                            estimated_minutes=45
                        )
                        db.add(section)
                        db.flush()  # Get section ID
                        
                        # Create knowledge points
                        knowledge_points_data = section_info.get('knowledge_points', [])
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
                    section = Section(
                        chapter_id=chapter.id,
                        section_number=f"{chapter.chapter_number}.1",
                        title=f"第{chapter.chapter_number}章内容概述",
                        content="本章节内容概述...",
                        estimated_minutes=60
                    )
                    db.add(section)
                    
            except Exception as e:
                logger.error(f"Error generating content for Chapter {chapter.chapter_number}: {str(e)}")
                # Create fallback section
                section = Section(
                    chapter_id=chapter.id,
                    section_number=f"{chapter.chapter_number}.1",
                    title=f"第{chapter.chapter_number}章内容",
                    content="章节内容生成中遇到错误，请稍后重试",
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