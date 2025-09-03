"""
LLM service for course content generation using LangChain
"""
import json
import logging
from typing import Dict, Any, List, Optional
from langchain.llms import OpenAI
from langchain.chat_models import ChatOpenAI
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate, ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser, OutputFixingParser
from langchain.schema import HumanMessage, SystemMessage
from pydantic import BaseModel, Field
from app.core.config import settings

logger = logging.getLogger(__name__)

# Pydantic models for structured output
class CourseIntroduction(BaseModel):
    title: str = Field(description="Course title")
    brief_description: str = Field(description="Brief course description (100-150 words)")
    target_audience: str = Field(description="Target audience for the course")
    prerequisites: str = Field(description="Prerequisites for the course")
    learning_outcomes: List[str] = Field(description="List of learning outcomes")
    course_highlights: List[str] = Field(description="Course highlights")
    difficulty_level: str = Field(description="Difficulty level: beginner/intermediate/advanced")
    estimated_duration: str = Field(description="Estimated course duration")

class LearningObjective(BaseModel):
    objective: str = Field(description="Learning objective description")
    assessment_method: str = Field(description="How to assess this objective")
    bloom_level: str = Field(description="Bloom's taxonomy level")

class LearningObjectives(BaseModel):
    overall_objectives: List[str] = Field(description="Overall course objectives")
    knowledge_objectives: List[LearningObjective] = Field(description="Knowledge objectives")
    skill_objectives: List[LearningObjective] = Field(description="Skill objectives")
    application_objectives: List[Dict[str, str]] = Field(description="Application objectives")

class ChapterStructure(BaseModel):
    chapter_id: int = Field(description="Chapter ID")
    chapter_title: str = Field(description="Chapter title")
    chapter_description: str = Field(description="Chapter description")
    estimated_hours: float = Field(description="Estimated hours")
    difficulty_level: str = Field(description="Difficulty level")
    learning_objectives: List[str] = Field(description="Chapter learning objectives")

class ChapterKnowledgePoint(BaseModel):
    point_id: str = Field(description="Knowledge point ID (e.g., '1.1.1')")
    title: str = Field(description="Knowledge point title")
    description: str = Field(description="Knowledge point description")
    point_type: str = Field(description="Type: concept, method, tool, case")
    estimated_minutes: int = Field(description="Estimated learning minutes")
    prerequisites: List[str] = Field(description="Prerequisite point IDs")

class SectionContent(BaseModel):
    section_number: str = Field(description="Section number (e.g., '1.1')")
    title: str = Field(description="Section title")
    description: str = Field(description="Section description")
    content: str = Field(description="Section content")
    estimated_minutes: int = Field(description="Estimated minutes")
    knowledge_points: List[ChapterKnowledgePoint] = Field(description="Knowledge points in this section")

class CourseStructure(BaseModel):
    total_chapters: int = Field(description="Total number of chapters")
    estimated_hours: float = Field(description="Total estimated hours")
    chapters: List[ChapterStructure] = Field(description="List of chapters")

class ChapterContentStructure(BaseModel):
    chapter_id: int = Field(description="Chapter ID")
    sections: List[SectionContent] = Field(description="Sections with knowledge points")

# 简化的数据模型用于测试
class SimpleKnowledgePoint(BaseModel):
    title: str = Field(description="知识点标题")
    description: str = Field(description="知识点描述")

class SimpleSection(BaseModel):
    title: str = Field(description="小节标题") 
    knowledge_points: List[SimpleKnowledgePoint] = Field(description="知识点列表")

class SimpleChapterContent(BaseModel):
    sections: List[SimpleSection] = Field(description="小节列表")

class LLMService:
    """Service for LLM-based content generation"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            temperature=0.3,  # 降低温度以获得更稳定的输出
            model_name=settings.OPENAI_MODEL,
            openai_api_key=settings.OPENAI_API_KEY,
            openai_api_base=settings.OPENAI_API_BASE,
            max_completion_tokens=2000,  # 修复: 使用max_completion_tokens而不是max_tokens
            request_timeout=120,  # 增加超时时间到2分钟
            max_retries=2  # 减少重试次数以避免长时间等待
        )
        
    def generate_course_introduction(self, document_content: str, course_type: str = "通用") -> Dict[str, Any]:
        """Generate course introduction from document content"""
        try:
            parser = PydanticOutputParser(pydantic_object=CourseIntroduction)
            
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content="你是一位拥有20年教学经验的资深课程设计专家，擅长将复杂的专业内容转化为清晰易懂的课程描述。"),
                HumanMessage(content=f"""
基于以下文档内容，生成一个优质的课程简介。

文档内容：
{document_content[:3000]}

课程类型：{course_type}

请按照以下要求生成课程简介：
1. 内容概括（100-150字）：准确概括课程的核心内容和主题
2. 适用对象：明确目标学员群体
3. 学习收益：列出3-5个具体的学习成果
4. 课程亮点：突出课程的特色和创新点

{parser.get_format_instructions()}
""")
            ])
            
            result = self.llm(prompt.format_messages())
            
            # Parse the result
            fixing_parser = OutputFixingParser.from_llm(parser=parser, llm=self.llm)
            parsed_result = fixing_parser.parse(result.content)
            
            return {
                'success': True,
                'data': parsed_result.dict()
            }
            
        except Exception as e:
            logger.error(f"Error generating course introduction: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_learning_objectives(self, document_content: str, course_level: str = "中级") -> Dict[str, Any]:
        """Generate SMART learning objectives"""
        try:
            parser = PydanticOutputParser(pydantic_object=LearningObjectives)
            
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content="你是一位教学设计专家，精通基于SMART原则的学习目标制定。"),
                HumanMessage(content=f"""
基于以下文档内容，为课程制定清晰的SMART学习目标。

文档内容：
{document_content[:2500]}

课程水平：{course_level}

SMART原则要求：
- Specific（具体明确）
- Measurable（可衡量）
- Achievable（可达成）
- Relevant（相关性）
- Time-bound（时限性）

请生成：
1. 总体目标（1-2个）
2. 知识目标（3-4个）：使用"理解"、"掌握"、"分析"等认知动词
3. 技能目标（3-5个）：使用"能够"、"会使用"、"可以完成"等表述
4. 应用目标（2-3个）：强调解决实际问题的能力

{parser.get_format_instructions()}
""")
            ])
            
            result = self.llm(prompt.format_messages())
            
            fixing_parser = OutputFixingParser.from_llm(parser=parser, llm=self.llm)
            parsed_result = fixing_parser.parse(result.content)
            
            return {
                'success': True,
                'data': parsed_result.dict()
            }
            
        except Exception as e:
            logger.error(f"Error generating learning objectives: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_chapter_structure(self, document_content: str, max_chapters: int = 8) -> Dict[str, Any]:
        """Generate course chapter structure (overview only, no detailed sections)"""
        try:
            parser = PydanticOutputParser(pydantic_object=CourseStructure)
            
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content="你是一位资深的课程架构师，擅长将复杂内容组织成清晰的章节结构。"),
                HumanMessage(content=f"""
基于以下文档内容，设计一个逻辑清晰的课程章节体系架构。

文档内容：
{document_content[:4000]}

设计要求：
1. 章节数量：3-{max_chapters}个主章节
2. 只需要生成章节级别的结构，不需要详细的小节内容
3. 逻辑顺序：从基础到进阶
4. 内容均衡：各章节内容量相对均衡

请为每个章节提供：
- 章节标题
- 章节描述（50-100字）
- 预估学时
- 难度级别
- 学习目标（3-5个要点）

注意：此阶段只生成章节框架，详细的小节和知识点将在后续单独生成。

{parser.get_format_instructions()}
""")
            ])
            
            result = self.llm(prompt.format_messages())
            
            fixing_parser = OutputFixingParser.from_llm(parser=parser, llm=self.llm)
            parsed_result = fixing_parser.parse(result.content)
            
            return {
                'success': True,
                'data': parsed_result.dict()
            }
            
        except Exception as e:
            logger.error(f"Error generating chapter structure: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_chapter_content(self, document_content: str, chapter_info: Dict[str, Any], chapter_number: int) -> Dict[str, Any]:
        """Generate detailed content for a specific chapter including sections and knowledge points"""
        try:
            parser = PydanticOutputParser(pydantic_object=ChapterContentStructure)
            
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content="""你是一位专业的中文课程内容设计师。请严格按照JSON格式要求输出，所有内容必须使用中文。
重要提醒：
1. 必须输出完整有效的JSON格式
2. 所有文本内容必须使用中文
3. 不要添加任何JSON之外的文字说明"""),
                HumanMessage(content=f"""
请为第{chapter_number}章生成详细的教学内容结构，严格按照JSON格式输出。

文档内容：{document_content[:2000]}

章节信息：
- 标题：{chapter_info.get('chapter_title', f'第{chapter_number}章')}
- 描述：{chapter_info.get('chapter_description', '')}
- 学习目标：{', '.join(chapter_info.get('learning_objectives', []))}

要求：
1. 生成3-4个小节（Section）
2. 每个小节2-3个知识点
3. 知识点ID格式：{chapter_number}.1.1, {chapter_number}.1.2等
4. 所有内容必须中文
5. 严格JSON格式输出

{parser.get_format_instructions()}

请直接输出JSON，不要任何额外说明：
""")
            ])
            
            result = self.llm(prompt.format_messages())
            
            # 多层次的JSON解析尝试
            response_content = result.content.strip()
            logger.info(f"LLM raw response for chapter {chapter_number}: '{response_content}'")
            logger.info(f"Response length: {len(response_content)}")
            
            # 尝试直接解析
            try:
                # 先尝试提取JSON部分
                import re
                json_match = re.search(r'\{.*\}', response_content, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    parsed_data = json.loads(json_str)
                    
                    # 验证数据结构
                    parsed_result = ChapterContentStructure(**parsed_data)
                    return {
                        'success': True,
                        'data': parsed_result.dict()
                    }
                else:
                    logger.warning(f"No JSON found in LLM response: {response_content[:500]}")
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Direct JSON parsing failed: {e}, trying OutputFixingParser")
            
            # 备用：使用OutputFixingParser
            try:
                fixing_parser = OutputFixingParser.from_llm(parser=parser, llm=self.llm)
                parsed_result = fixing_parser.parse(response_content)
                return {
                    'success': True,
                    'data': parsed_result.dict()
                }
            except Exception as e:
                logger.error(f"OutputFixingParser also failed: {e}")
            
            return {
                'success': False,
                'error': f'Failed to parse LLM response: {response_content[:500]}'
            }
            
        except Exception as e:
            logger.error(f"Error generating chapter content: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_knowledge_graph_data(self, course_structure: Dict[str, Any]) -> Dict[str, Any]:
        """Generate knowledge graph data from course structure"""
        try:
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content="你是一位知识图谱专家，擅长识别和构建知识点之间的关系。"),
                HumanMessage(content=f"""
基于以下课程结构，生成知识图谱数据。

课程结构：
{json.dumps(course_structure, ensure_ascii=False, indent=2)[:3000]}

请识别：
1. 知识实体（概念、方法、工具等）
2. 实体之间的关系（前置依赖、包含、相关等）
3. 学习路径建议

输出JSON格式：
{{
    "nodes": [
        {{"id": "1", "label": "节点名称", "type": "类型", "level": 1}}
    ],
    "edges": [
        {{"from": "1", "to": "2", "relationship": "关系类型"}}
    ],
    "learning_paths": [
        {{"path": ["1", "2", "3"], "description": "路径描述"}}
    ]
}}
""")
            ])
            
            result = self.llm(prompt.format_messages())
            
            # Parse JSON response
            try:
                graph_data = json.loads(result.content)
                return {
                    'success': True,
                    'data': graph_data
                }
            except json.JSONDecodeError:
                # Try to extract JSON from the response
                import re
                json_match = re.search(r'\{.*\}', result.content, re.DOTALL)
                if json_match:
                    graph_data = json.loads(json_match.group())
                    return {
                        'success': True,
                        'data': graph_data
                    }
                else:
                    return {
                        'success': False,
                        'error': "Failed to parse JSON response"
                    }
                    
        except Exception as e:
            logger.error(f"Error generating knowledge graph: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_simple_chapter_content(self, document_content: str, chapter_info: Dict[str, Any], chapter_number: int) -> Dict[str, Any]:
        """生成简化版本的章节详细内容"""
        try:
            # 不使用Pydantic解析器，直接请求JSON
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content="你是专业的课程设计师。请严格按照JSON格式输出中文内容。"),
                HumanMessage(content=f"""
为第{chapter_number}章"{chapter_info.get('chapter_title', '')}"生成教学内容。

参考资料：{document_content[:300]}

请按照以下JSON格式输出（所有字段都是必需的）：
{{
  "sections": [
    {{
      "title": "小节标题",
      "knowledge_points": [
        {{
          "title": "知识点标题",
          "description": "知识点描述"
        }}
      ]
    }}
  ]
}}

要求：
1. 生成2个小节
2. 每个小节2个知识点
3. 所有内容中文
4. 严格JSON格式

直接输出JSON，不要任何额外文字：
""")])
            
            result = self.llm(prompt.format_messages())
            response_content = result.content.strip()
            
            logger.info(f"Simple LLM response for chapter {chapter_number}: '{response_content}'")
            
            if not response_content:
                return {
                    'success': False,
                    'error': 'LLM returned empty response'
                }
            
            # 尝试解析JSON
            try:
                import re
                json_match = re.search(r'\{.*\}', response_content, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    parsed_data = json.loads(json_str)
                    parsed_result = SimpleChapterContent(**parsed_data)
                    return {
                        'success': True,
                        'data': parsed_result.dict()
                    }
            except Exception as e:
                logger.error(f"JSON parsing failed: {e}")
            
            return {
                'success': False,
                'error': f'Failed to parse response: {response_content[:200]}'
            }
            
        except Exception as e:
            logger.error(f"Error in simple chapter content generation: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def optimize_content(self, content: str, optimization_type: str = "clarity") -> str:
        """Optimize generated content for specific criteria"""
        optimization_prompts = {
            "clarity": "请优化以下内容，使其更加清晰易懂：",
            "conciseness": "请精简以下内容，保留核心信息：",
            "engagement": "请优化以下内容，使其更加生动有趣：",
            "academic": "请优化以下内容，使其更加学术规范："
        }
        
        prompt = optimization_prompts.get(optimization_type, optimization_prompts["clarity"])
        
        try:
            messages = [
                SystemMessage(content="你是一位专业的内容编辑专家。"),
                HumanMessage(content=f"{prompt}\n\n{content}")
            ]
            
            result = self.llm(messages)
            return result.content
            
        except Exception as e:
            logger.error(f"Error optimizing content: {str(e)}")
            return content