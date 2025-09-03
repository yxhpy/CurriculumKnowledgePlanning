"""
Initialize sample data for development and testing
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User  
from app.models.course import Course, Chapter, Section, KnowledgePoint
from app.models.document import Document
from sqlalchemy.exc import IntegrityError

def init_sample_data():
    """Initialize sample data"""
    db = SessionLocal()
    
    try:
        # Create sample user if not exists
        existing_user = db.query(User).filter(User.email == "admin@example.com").first()
        if not existing_user:
            user = User(
                email="admin@example.com",
                username="admin",
                hashed_password="hashed_password_here",  # This should be properly hashed in real app
                full_name="系统管理员",
                is_active=True,
                is_superuser=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print("Created sample user")
        else:
            user = existing_user
            print("Using existing user")
        
        # Create sample documents if not exists
        sample_documents = [
            {
                "filename": "Python编程基础.pdf",
                "file_type": "PDF",
                "file_size": 2048576,
                "status": "processed",
                "processed_content": "Python编程语言基础知识内容...",
            },
            {
                "filename": "数据结构与算法.docx", 
                "file_type": "DOCX",
                "file_size": 1536789,
                "status": "processed",
                "processed_content": "数据结构与算法相关知识点...",
            },
            {
                "filename": "机器学习入门.txt",
                "file_type": "TXT", 
                "file_size": 512345,
                "status": "processed",
                "processed_content": "机器学习基础概念和应用...",
            }
        ]
        
        doc_ids = []
        for doc_data in sample_documents:
            existing_doc = db.query(Document).filter(Document.filename == doc_data["filename"]).first()
            if not existing_doc:
                document = Document(
                    filename=doc_data["filename"],
                    file_type=doc_data["file_type"],
                    file_size=doc_data["file_size"],
                    status=doc_data["status"],
                    processed_content=doc_data["processed_content"],
                    owner_id=user.id
                )
                db.add(document)
                db.commit()
                db.refresh(document)
                doc_ids.append(document.id)
                print(f"Created sample document: {doc_data['filename']}")
            else:
                doc_ids.append(existing_doc.id)
                print(f"Using existing document: {doc_data['filename']}")
        
        # Create sample courses if not exists
        sample_courses = [
            {
                "title": "Python编程基础课程",
                "description": "从零开始学习Python编程，掌握编程基础知识和实践技能",
                "brief_description": "Python编程入门课程",
                "target_audience": "编程初学者、大学生、转行人员",
                "prerequisites": "无需编程基础",
                "difficulty_level": "beginner",
                "estimated_hours": 24.0,
                "status": "published",
                "learning_outcomes": [
                    "掌握Python基础语法",
                    "理解面向对象编程概念", 
                    "能够编写简单的Python程序",
                    "了解常用的Python库和工具"
                ],
                "course_highlights": [
                    "理论与实践相结合",
                    "丰富的编程案例",
                    "循序渐进的学习路径"
                ]
            },
            {
                "title": "数据结构与算法进阶", 
                "description": "深入学习常用数据结构和算法，提升编程思维和解决问题的能力",
                "brief_description": "数据结构算法核心课程",
                "target_audience": "有一定编程基础的学员",
                "prerequisites": "熟悉至少一门编程语言",
                "difficulty_level": "intermediate",
                "estimated_hours": 36.0,
                "status": "published",
                "learning_outcomes": [
                    "掌握常用数据结构的实现和应用",
                    "理解经典算法的设计思想",
                    "提升算法分析和优化能力",
                    "培养解决复杂问题的思维"
                ],
                "course_highlights": [
                    "经典算法详解",
                    "实际项目应用",
                    "性能优化技巧"
                ]
            },
            {
                "title": "机器学习实战入门",
                "description": "通过实际项目学习机器学习核心概念和常用算法，培养数据科学思维",
                "brief_description": "机器学习实践课程", 
                "target_audience": "对AI感兴趣的技术人员、数据分析师",
                "prerequisites": "Python基础、基础数学知识",
                "difficulty_level": "intermediate",
                "estimated_hours": 32.0,
                "status": "draft",
                "learning_outcomes": [
                    "理解机器学习基本概念和流程",
                    "掌握常用机器学习算法",
                    "能够使用Python进行机器学习项目开发",
                    "具备数据预处理和模型评估能力"
                ],
                "course_highlights": [
                    "项目驱动学习",
                    "真实数据集应用", 
                    "业界最佳实践"
                ]
            }
        ]
        
        for i, course_data in enumerate(sample_courses):
            existing_course = db.query(Course).filter(Course.title == course_data["title"]).first()
            if not existing_course:
                course = Course(
                    title=course_data["title"],
                    description=course_data["description"],
                    brief_description=course_data["brief_description"],
                    target_audience=course_data["target_audience"],
                    prerequisites=course_data["prerequisites"],
                    difficulty_level=course_data["difficulty_level"],
                    estimated_hours=course_data["estimated_hours"],
                    status=course_data["status"],
                    learning_outcomes=course_data["learning_outcomes"],
                    course_highlights=course_data["course_highlights"],
                    creator_id=user.id
                )
                db.add(course)
                db.commit()
                db.refresh(course)
                print(f"Created sample course: {course_data['title']}")
                
                # Create sample chapters for each course
                chapter_data = [
                    {
                        "chapter_number": 1,
                        "title": f"第一章：{course_data['title'].split('课程')[0]}概述",
                        "description": "介绍基础概念和学习目标",
                        "estimated_hours": 4.0,
                        "difficulty_level": course_data["difficulty_level"],
                        "learning_objectives": ["理解基本概念", "掌握学习方法", "建立知识框架"]
                    },
                    {
                        "chapter_number": 2,
                        "title": f"第二章：核心知识点",
                        "description": "深入学习核心内容",
                        "estimated_hours": 8.0,
                        "difficulty_level": course_data["difficulty_level"],
                        "learning_objectives": ["掌握核心技能", "理解关键概念", "进行实践练习"]
                    }
                ]
                
                for chapter_info in chapter_data:
                    chapter = Chapter(
                        course_id=course.id,
                        chapter_number=chapter_info["chapter_number"],
                        title=chapter_info["title"],
                        description=chapter_info["description"],
                        estimated_hours=chapter_info["estimated_hours"],
                        difficulty_level=chapter_info["difficulty_level"],
                        learning_objectives=chapter_info["learning_objectives"]
                    )
                    db.add(chapter)
                    db.commit()
                    db.refresh(chapter)
                    
                    # Create sample sections for each chapter
                    section_data = [
                        {
                            "section_number": f"{chapter_info['chapter_number']}.1",
                            "title": "理论基础",
                            "description": "基础理论知识讲解",
                            "content": f"这里是{chapter_info['title']}中理论基础部分的详细内容...",
                            "estimated_minutes": 90
                        },
                        {
                            "section_number": f"{chapter_info['chapter_number']}.2", 
                            "title": "实践应用",
                            "description": "实际应用和案例分析",
                            "content": f"这里是{chapter_info['title']}中实践应用部分的详细内容...",
                            "estimated_minutes": 120
                        }
                    ]
                    
                    for section_info in section_data:
                        section = Section(
                            chapter_id=chapter.id,
                            section_number=section_info["section_number"],
                            title=section_info["title"], 
                            description=section_info["description"],
                            content=section_info["content"],
                            estimated_minutes=section_info["estimated_minutes"]
                        )
                        db.add(section)
                        db.commit()
                        db.refresh(section)
                        
                        # Create sample knowledge points for each section
                        knowledge_points = [
                            {
                                "point_id": f"{section_info['section_number']}.1",
                                "title": f"知识点：基础概念",
                                "description": "重要的基础概念介绍",
                                "point_type": "concept",
                                "prerequisites": []
                            },
                            {
                                "point_id": f"{section_info['section_number']}.2", 
                                "title": f"知识点：实践方法",
                                "description": "具体的实践方法和技巧",
                                "point_type": "method", 
                                "prerequisites": [f"{section_info['section_number']}.1"]
                            }
                        ]
                        
                        for kp_info in knowledge_points:
                            knowledge_point = KnowledgePoint(
                                section_id=section.id,
                                point_id=kp_info["point_id"],
                                title=kp_info["title"],
                                description=kp_info["description"],
                                point_type=kp_info["point_type"],
                                prerequisites=kp_info["prerequisites"]
                            )
                            db.add(knowledge_point)
                
                db.commit()
            else:
                print(f"Course already exists: {course_data['title']}")
        
        print("\n✅ Sample data initialization completed!")
        print("📚 Created courses with chapters, sections, and knowledge points")
        print("📄 Created sample documents")
        print("👤 Created admin user")
        
    except IntegrityError as e:
        print(f"❌ Database integrity error: {e}")
        db.rollback()
    except Exception as e:
        print(f"❌ Error initializing sample data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Initializing sample data...")
    init_sample_data()