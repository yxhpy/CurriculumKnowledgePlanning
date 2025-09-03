"""
LLM service for course content generation using LangChain
"""
import json
import logging
import time
import asyncio
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

# Custom exceptions
class LLMEmptyResponseError(Exception):
    """Raised when LLM returns empty or invalid response"""
    pass

class LLMMaxRetriesExceededError(Exception):
    """Raised when all retry attempts are exhausted"""
    pass

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
    application_objectives: List[LearningObjective] = Field(description="Application objectives")

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
    content: str = Field(description="小节概要内容")
    knowledge_points: List[SimpleKnowledgePoint] = Field(description="知识点列表")

class SimpleChapterContent(BaseModel):
    sections: List[SimpleSection] = Field(description="小节列表")

class LLMService:
    """Service for LLM-based content generation"""
    
    def __init__(self):
        # 从环境变量中读取配置
        import os
        api_key = os.getenv('OPENAI_API_KEY', settings.OPENAI_API_KEY)
        api_base = os.getenv('OPENAI_API_BASE', settings.OPENAI_API_BASE)
        model = os.getenv('OPENAI_MODEL', settings.OPENAI_MODEL)
        
        logger.info(f"Initializing LLM with model: {model}, base: {api_base}")
        
        self.llm = ChatOpenAI(
            temperature=0.3,  # 降低温度以获得更稳定的输出
            model_name=model,
            openai_api_key=api_key,
            openai_api_base=api_base,
            max_tokens=4000,  # 增加到4000 tokens以生成更完整的内容
            request_timeout=180,  # 增加超时时间到3分钟
            max_retries=0  # 禁用内部重试，使用我们自己的重试机制
        )
        
    def _retry_llm_call(self, prompt_messages, max_retries: int = 3, initial_delay: float = 1.0):
        """Retry LLM call with exponential backoff and enhanced error handling"""
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                logger.info(f"LLM call attempt {attempt + 1}/{max_retries + 1}")
                logger.debug(f"Prompt length: {len(str(prompt_messages))} characters")
                
                result = self.llm(prompt_messages)
                
                # 详细检查响应质量
                if not result:
                    raise LLMEmptyResponseError("LLM returned None result")
                
                if not result.content:
                    raise LLMEmptyResponseError("LLM returned empty content")
                
                response_content = result.content.strip()
                if len(response_content) < 10:
                    raise LLMEmptyResponseError(f"LLM response too short: {len(response_content)} characters")
                
                # 检查是否是有效的JSON开始（对于期待JSON的响应）
                if response_content and (response_content.startswith('{') or response_content.startswith('[')):
                    logger.info(f"Valid JSON-like response received on attempt {attempt + 1}")
                else:
                    logger.info(f"Non-JSON response received on attempt {attempt + 1}, length: {len(response_content)}")
                
                logger.info(f"LLM call successful on attempt {attempt + 1}")
                logger.debug(f"Response preview: {response_content[:200]}...")
                
                return result
                
            except (LLMEmptyResponseError, Exception) as e:
                last_exception = e
                logger.warning(f"LLM call failed on attempt {attempt + 1}: {type(e).__name__}: {str(e)}")
                
                if attempt < max_retries:
                    delay = initial_delay * (2 ** attempt)  # 指数退避
                    logger.info(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
                else:
                    logger.error(f"All {max_retries + 1} attempts failed. Final error: {type(last_exception).__name__}: {str(last_exception)}")
                    raise LLMMaxRetriesExceededError(f"Failed after {max_retries + 1} attempts. Last error: {str(last_exception)}") from last_exception
        
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
            
            # 使用重试机制
            result = self._retry_llm_call(prompt.format_messages())
            
            # 先尝试直接解析，如果失败则使用修复解析器
            try:
                parsed_result = parser.parse(result.content)
            except Exception as parse_error:
                logger.warning(f"Direct parsing failed: {parse_error}, using fixing parser")
                # 手动修复常见的JSON格式问题
                content = result.content.strip()
                # 修复缺少逗号的问题
                import re
                content = re.sub(r'(\])(\s*"[a-zA-Z_]+"\s*:)', r'\1,\2', content)
                
                try:
                    parsed_result = parser.parse(content)
                except Exception:
                    # 如果手动修复也失败，使用OutputFixingParser
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
            
            # 使用重试机制
            result = self._retry_llm_call(prompt.format_messages())
            
            # 先尝试直接解析，如果失败则使用修复解析器
            try:
                parsed_result = parser.parse(result.content)
            except Exception as parse_error:
                logger.warning(f"Direct parsing failed: {parse_error}, using fixing parser")
                # 手动修复常见的JSON格式问题
                content = result.content.strip()
                # 修复缺少逗号的问题（特别是array后面缺少逗号）
                import re
                content = re.sub(r'(\])(\s*"[a-zA-Z_]+"\s*:)', r'\1,\2', content)
                
                try:
                    parsed_result = parser.parse(content)
                except Exception:
                    # 如果手动修复也失败，使用OutputFixingParser
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
            
            # 使用重试机制
            result = self._retry_llm_call(prompt.format_messages())
            
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
3. 不要添加任何JSON之外的文字说明
4. 明确区分概要和详细内容的层次"""),
                HumanMessage(content=f"""
请为第{chapter_number}章生成详细的教学内容结构，严格按照JSON格式输出。

文档内容：{document_content[:2000]}

章节信息：
- 标题：{chapter_info.get('chapter_title', f'第{chapter_number}章')}
- 描述：{chapter_info.get('chapter_description', '')}
- 学习目标：{', '.join(chapter_info.get('learning_objectives', []))}

要求：
1. 生成3-4个小节（Section）
2. 每个小节包含：
   - title: 小节标题
   - description: 小节简述（1-2句话概括本小节的学习内容）
   - content: **小节概要** - 用一段话概括描述本小节的整体内容安排和学习要点，不要列举具体知识点
   - knowledge_points: 2-3个具体知识点，每个包含具体的学习要点
3. 知识点ID格式：{chapter_number}.1.1, {chapter_number}.1.2等
4. **关键区别**：
   - section.content: 是整个小节的概要描述，类似"本小节将学习..."，"通过学习本小节，学生将掌握..."这样的概括性描述
   - knowledge_points[].description: 是具体知识点的详细学习内容和要点，应该具体而详实
5. 示例：
   - section.content: "本小节将介绍图形设计的基本概念和应用范畴，帮助学生建立对图形设计的整体认知框架..."
   - knowledge_point.description: "图形设计是指使用视觉元素（如图像、文字、颜色等）来传达信息、表达思想或创造美感的艺术和实践。其范畴包括平面设计、网页设计、UI设计、包装设计等。"
6. 所有内容必须中文
7. 严格JSON格式输出

{parser.get_format_instructions()}

请直接输出JSON，不要任何额外说明：
""")
            ])
            
            # 使用重试机制
            result = self._retry_llm_call(prompt.format_messages())
            
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
    
    async def generate_knowledge_graph(self, course_content: Dict[str, Any]) -> Dict[str, Any]:
        """Generate enhanced knowledge graph from course content"""
        try:
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content="你是一位知识图谱专家，擅长识别和构建知识点之间的复杂关系。"),
                HumanMessage(content=f"""
基于以下课程内容，生成增强的知识图谱。

课程内容：
{json.dumps(course_content, ensure_ascii=False, indent=2)[:4000]}

请分析并构建知识图谱：

1. **节点类型**：
   - course: 课程根节点
   - chapter: 章节节点  
   - topic: 主题/小节节点
   - concept: 概念节点
   - skill: 技能节点
   - tool: 工具节点

2. **关系类型**：
   - contains: 包含关系（上级包含下级）
   - prerequisite: 前置依赖（A是B的前提）
   - dependency: 依赖关系（A依赖于B）
   - related: 相关关系（A与B相关）
   - applies: 应用关系（A应用于B）

3. **智能分析**：
   - 识别隐含的前置依赖关系
   - 发现知识点之间的交叉引用
   - 构建合理的学习路径

请严格按照以下JSON格式输出：
{{
    "nodes": [
        {{
            "id": "course_1",
            "label": "{course_content.get('title', '课程')}",
            "type": "course",
            "level": 0,
            "description": "课程根节点"
        }},
        {{
            "id": "chapter_1",
            "label": "章节名称",
            "type": "chapter", 
            "level": 1,
            "description": "章节描述"
        }},
        {{
            "id": "topic_1",
            "label": "主题名称",
            "type": "topic",
            "level": 2, 
            "description": "主题描述"
        }},
        {{
            "id": "concept_1",
            "label": "概念名称",
            "type": "concept",
            "level": 3,
            "description": "概念描述"
        }}
    ],
    "edges": [
        {{
            "from": "course_1",
            "to": "chapter_1", 
            "relationship": "contains",
            "label": "包含"
        }},
        {{
            "from": "concept_1",
            "to": "concept_2",
            "relationship": "prerequisite", 
            "label": "前置依赖"
        }}
    ]
}}

注意：请确保所有节点ID唯一，关系合理，层级清晰。
""")
            ])
            
            # 使用重试机制
            result = self._retry_llm_call(prompt.format_messages())
            
            # Parse JSON response
            try:
                graph_data = json.loads(result.content)
                
                # Validate and enhance the graph data
                if "nodes" in graph_data and "edges" in graph_data:
                    return graph_data
                else:
                    raise ValueError("Invalid graph structure")
                    
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse AI-generated graph, using fallback: {str(e)}")
                # Fallback to basic structure-based graph
                return self._generate_fallback_graph(course_content)
                    
        except Exception as e:
            logger.error(f"Error generating enhanced knowledge graph: {str(e)}")
            # Return fallback graph
            return self._generate_fallback_graph(course_content)
    
    def _generate_fallback_graph(self, course_content: Dict[str, Any]) -> Dict[str, Any]:
        """Generate basic knowledge graph as fallback"""
        nodes = []
        edges = []
        
        # Add course node
        nodes.append({
            "id": "course_1",
            "label": course_content.get("title", "课程"),
            "type": "course",
            "level": 0,
            "description": course_content.get("description", "")
        })
        
        # Add chapter and section nodes
        for i, chapter in enumerate(course_content.get("chapters", []), 1):
            chapter_id = f"chapter_{i}"
            nodes.append({
                "id": chapter_id,
                "label": chapter.get("title", f"第{i}章"),
                "type": "chapter",
                "level": 1,
                "description": chapter.get("description", "")
            })
            
            # Add edge from course to chapter
            edges.append({
                "from": "course_1",
                "to": chapter_id,
                "relationship": "contains",
                "label": "包含"
            })
            
            # Add section nodes
            for j, section in enumerate(chapter.get("sections", []), 1):
                section_id = f"section_{i}_{j}"
                nodes.append({
                    "id": section_id,
                    "label": section.get("title", f"第{j}节"),
                    "type": "topic",
                    "level": 2,
                    "description": section.get("description", "")
                })
                
                # Add edge from chapter to section
                edges.append({
                    "from": chapter_id,
                    "to": section_id,
                    "relationship": "contains", 
                    "label": "包含"
                })
        
        return {"nodes": nodes, "edges": edges}

    def generate_knowledge_graph_data(self, course_structure: Dict[str, Any]) -> Dict[str, Any]:
        """Generate knowledge graph data from course structure (legacy method)"""
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
            
            # 使用重试机制
            result = self._retry_llm_call(prompt.format_messages())
            
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
      "title": "图形设计基础入门",
      "content": "本小节帮助学生建立图形设计的基础认知框架，掌握设计的核心理念和基本原理，为后续深入学习各类设计工具和技法打下坚实基础。",
      "knowledge_points": [
        {{
          "title": "图形设计的定义",
          "description": "图形设计是通过视觉元素（如图像、文字、颜色等）来传达信息、表达思想或创造美感的艺术和实践。其范畴包括平面设计、网页设计、UI设计、包装设计等多个领域。"
        }}
      ]
    }}
  ]
}}

要求：
1. 生成2个小节
2. 每个小节包含：
   - title: 小节标题
   - content: 小节概要（必须是概括性总结，说明学习目标和意义，禁止列举具体知识点内容）
   - knowledge_points: 2个具体知识点，每个包含详细的学习内容
3. **严格区别**：
   - content: 只写学习目标，例如"本小节帮助学生建立XX的基础认知，掌握XX的核心概念，为后续学习打下基础"
   - description: 写具体知识点的详细内容，包括定义、特点、应用等
4. **禁止**：
   - content中不能包含knowledge_points中的任何具体内容
   - description中不能重复content的内容
5. 所有内容中文
6. 严格JSON格式

直接输出JSON，不要任何额外文字：
""")])
            
            # 使用重试机制
            result = self._retry_llm_call(prompt.format_messages())
            response_content = result.content.strip()
            
            logger.info(f"Simple LLM response for chapter {chapter_number}: '{response_content}'")
            
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
            
            # 使用重试机制
            result = self._retry_llm_call(messages)
            return result.content
            
        except Exception as e:
            logger.error(f"Error optimizing content: {str(e)}")
            return content