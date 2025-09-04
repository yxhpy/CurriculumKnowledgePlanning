import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Spin,
  message,
  Descriptions,
  Tag,
  Collapse,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Timeline,
  List,
  Badge,
  Divider,
  Tabs,
  Input,
  Form,
  Select,
  InputNumber,
  Modal,
} from 'antd';
import {
  BookOutlined,
  ClockCircleOutlined,
  UserOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  BulbOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  EditOutlined,
  ShareAltOutlined,
  StarOutlined,
  TeamOutlined,
  TrophyOutlined,
  PartitionOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import KnowledgeGraphViewer from '../components/KnowledgeGraphViewer';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

interface KnowledgePoint {
  id: number;
  point_id: string;
  title: string;
  description: string;
  point_type: string;
  estimated_minutes: number;
}

interface Section {
  id: number;
  section_number: string;
  title: string;
  description: string;
  content: string;
  estimated_minutes: number;
  knowledge_points: KnowledgePoint[];
  chapterId?: number; // 添加可选的chapterId用于编辑时标识
}

interface Chapter {
  id: number;
  chapter_number: number;
  title: string;
  description: string;
  estimated_hours: number;
  difficulty_level: string;
  learning_objectives: string[];
  sections: Section[];
}

interface Course {
  id: number;
  title: string;
  description: string;
  difficulty_level: string;
  target_audience: string;
  estimated_hours: number;
  status: string;
  created_at: string;
  updated_at: string;
  chapters: Chapter[];
}

const CourseDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course>>({});
  const [editingChapter, setEditingChapter] = useState<Partial<Chapter> | null>(null);
  const [editingSection, setEditingSection] = useState<Partial<Section> | null>(null);
  const [editingKnowledgePoint, setEditingKnowledgePoint] = useState<(Partial<KnowledgePoint> & { chapterId?: number; sectionId?: number }) | null>(null);
  const [chapterEditMode, setChapterEditMode] = useState(false);
  const [sectionEditMode, setSectionEditMode] = useState(false);
  const [knowledgePointEditMode, setKnowledgePointEditMode] = useState(false);

  useEffect(() => {
    fetchCourseDetail();
  }, [id]);

  const fetchCourseDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/courses/${id}/detail`);
      setCourse(response.data);
      // 默认展开第一个章节
      if (response.data.chapters && response.data.chapters.length > 0) {
        setExpandedChapters([`chapter-${response.data.chapters[0].id}`]);
      }
    } catch (error) {
      console.error('Failed to fetch course detail:', error);
      message.error('获取课程详情失败');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'green';
      case 'intermediate':
        return 'orange';
      case 'advanced':
        return 'red';
      default:
        return 'default';
    }
  };

  const getDifficultyText = (level: string) => {
    switch (level) {
      case 'beginner':
        return '初级';
      case 'intermediate':
        return '中级';
      case 'advanced':
        return '高级';
      default:
        return level;
    }
  };

  const handleEditStart = () => {
    if (course) {
      setEditingCourse({
        title: course.title,
        description: course.description,
        difficulty_level: course.difficulty_level,
        target_audience: course.target_audience,
        estimated_hours: course.estimated_hours,
      });
      setEditMode(true);
    }
  };

  const handleEditCancel = () => {
    setEditMode(false);
    setEditingCourse({});
  };

  const handleEditSave = async () => {
    if (!course || !editingCourse) return;

    try {
      const response = await axios.put(`http://localhost:8000/api/v1/courses/${course.id}`, {
        title: editingCourse.title,
        description: editingCourse.description,
        difficulty_level: editingCourse.difficulty_level,
        target_audience: editingCourse.target_audience,
        estimated_hours: editingCourse.estimated_hours,
      });

      if (response.data) {
        // Update the course state with the response data
        setCourse(prev => prev ? { ...prev, ...response.data } : null);
        message.success('课程信息更新成功');
        setEditMode(false);
        setEditingCourse({});
      }
    } catch (error) {
      console.error('Failed to update course:', error);
      message.error('更新课程信息失败');
    }
  };

  // 章节编辑函数
  const handleChapterEditStart = (chapter: Chapter) => {
    setEditingChapter({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      estimated_hours: chapter.estimated_hours,
      difficulty_level: chapter.difficulty_level,
      learning_objectives: chapter.learning_objectives,
    });
    setChapterEditMode(true);
  };

  const handleChapterEditCancel = () => {
    setChapterEditMode(false);
    setEditingChapter(null);
  };

  const handleChapterEditSave = async () => {
    if (!course || !editingChapter || !editingChapter.id) return;

    try {
      const response = await axios.put(
        `http://localhost:8000/api/v1/courses/${course.id}/chapters/${editingChapter.id}`, 
        {
          title: editingChapter.title,
          description: editingChapter.description,
          estimated_hours: editingChapter.estimated_hours,
          difficulty_level: editingChapter.difficulty_level,
          learning_objectives: editingChapter.learning_objectives,
        }
      );

      if (response.data) {
        // Update the course chapters
        setCourse(prev => {
          if (!prev) return null;
          const updatedChapters = prev.chapters.map(chapter => 
            chapter.id === editingChapter.id ? { ...chapter, ...response.data } : chapter
          );
          return { ...prev, chapters: updatedChapters };
        });
        message.success('章节信息更新成功');
        setChapterEditMode(false);
        setEditingChapter(null);
      }
    } catch (error) {
      console.error('Failed to update chapter:', error);
      message.error('更新章节信息失败');
    }
  };

  // 小节编辑函数
  const handleSectionEditStart = (section: Section, chapterId: number) => {
    setEditingSection({
      ...section,
      chapterId, // 添加章节ID以便后续更新
    });
    setSectionEditMode(true);
  };

  const handleSectionEditCancel = () => {
    setSectionEditMode(false);
    setEditingSection(null);
  };

  const handleSectionEditSave = async () => {
    if (!course || !editingSection || !editingSection.id || !editingSection.chapterId) return;

    try {
      const response = await axios.put(
        `http://localhost:8000/api/v1/courses/${course.id}/chapters/${editingSection.chapterId}/sections/${editingSection.id}`,
        {
          title: editingSection.title,
          description: editingSection.description,
          content: editingSection.content,
          estimated_minutes: editingSection.estimated_minutes,
        }
      );

      if (response.data) {
        // Update the course sections
        setCourse(prev => {
          if (!prev) return null;
          const updatedChapters = prev.chapters.map(chapter => {
            if (chapter.id === editingSection.chapterId) {
              const updatedSections = chapter.sections.map(section => 
                section.id === editingSection.id ? { ...section, ...response.data } : section
              );
              return { ...chapter, sections: updatedSections };
            }
            return chapter;
          });
          return { ...prev, chapters: updatedChapters };
        });
        message.success('小节信息更新成功');
        setSectionEditMode(false);
        setEditingSection(null);
      }
    } catch (error) {
      console.error('Failed to update section:', error);
      message.error('更新小节信息失败');
    }
  };

  // 知识点编辑函数
  const handleKnowledgePointEditStart = (point: KnowledgePoint, chapterId: number, sectionId: number) => {
    setEditingKnowledgePoint({
      ...point,
      chapterId,
      sectionId,
    });
    setKnowledgePointEditMode(true);
  };

  const handleKnowledgePointEditCancel = () => {
    setKnowledgePointEditMode(false);
    setEditingKnowledgePoint(null);
  };

  const handleKnowledgePointEditSave = async () => {
    if (!course || !editingKnowledgePoint || !editingKnowledgePoint.id || !editingKnowledgePoint.chapterId || !editingKnowledgePoint.sectionId) return;

    try {
      const response = await axios.put(
        `http://localhost:8000/api/v1/courses/${course.id}/chapters/${editingKnowledgePoint.chapterId}/sections/${editingKnowledgePoint.sectionId}/knowledge-points/${editingKnowledgePoint.id}`,
        {
          title: editingKnowledgePoint.title,
          description: editingKnowledgePoint.description,
          point_type: editingKnowledgePoint.point_type,
          estimated_minutes: editingKnowledgePoint.estimated_minutes,
        }
      );

      if (response.data) {
        // Update the course knowledge points
        setCourse(prev => {
          if (!prev) return null;
          const updatedChapters = prev.chapters.map(chapter => {
            if (chapter.id === editingKnowledgePoint.chapterId) {
              const updatedSections = chapter.sections.map(section => {
                if (section.id === editingKnowledgePoint.sectionId) {
                  const updatedPoints = section.knowledge_points.map(point => 
                    point.id === editingKnowledgePoint.id ? { ...point, ...response.data } : point
                  );
                  return { ...section, knowledge_points: updatedPoints };
                }
                return section;
              });
              return { ...chapter, sections: updatedSections };
            }
            return chapter;
          });
          return { ...prev, chapters: updatedChapters };
        });
        message.success('知识点信息更新成功');
        setKnowledgePointEditMode(false);
        setEditingKnowledgePoint(null);
      }
    } catch (error) {
      console.error('Failed to update knowledge point:', error);
      message.error('更新知识点信息失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'processing';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return '已发布';
      case 'draft':
        return '草稿';
      case 'archived':
        return '已归档';
      default:
        return status;
    }
  };

  const getPointTypeIcon = (type: string) => {
    switch (type) {
      case 'concept':
        return <BulbOutlined style={{ color: '#1890ff' }} />;
      case 'method':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'tool':
        return <GlobalOutlined style={{ color: '#fa8c16' }} />;
      case 'case':
        return <FileTextOutlined style={{ color: '#722ed1' }} />;
      default:
        return <BookOutlined />;
    }
  };

  const getPointTypeText = (type: string) => {
    switch (type) {
      case 'concept':
        return '概念';
      case 'method':
        return '方法';
      case 'tool':
        return '工具';
      case 'case':
        return '案例';
      default:
        return '知识点';
    }
  };

  const renderCourseOverview = () => {
    if (!course) return null;

    return (
      <div className="page-section">
        <Card>
          <Descriptions title="课程基本信息" bordered column={2}>
            <Descriptions.Item label="课程名称" span={2}>
              <Text strong style={{ fontSize: '16px' }}>{course.title}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="课程描述" span={2}>
              <Paragraph>{course.description}</Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="难度级别">
              <Tag color={getDifficultyColor(course.difficulty_level)}>
                {getDifficultyText(course.difficulty_level)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="课程状态">
              <Badge status={getStatusColor(course.status)} text={getStatusText(course.status)} />
            </Descriptions.Item>
            <Descriptions.Item label="目标受众" span={2}>
              {course.target_audience}
            </Descriptions.Item>
            <Descriptions.Item label="预计学时">
              <Space>
                <ClockCircleOutlined />
                <Text>{course.estimated_hours} 小时</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="章节数量">
              <Space>
                <BookOutlined />
                <Text>{course.chapters.length} 章</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(course.created_at).toLocaleDateString()}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {new Date(course.updated_at).toLocaleDateString()}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总章节数"
                value={course.chapters.length}
                prefix={<BookOutlined />}
                suffix="章"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总小节数"
                value={course.chapters.reduce((acc, ch) => acc + (ch.sections?.length || 0), 0)}
                prefix={<FileTextOutlined />}
                suffix="节"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="知识点数"
                value={course.chapters.reduce((acc, ch) => 
                  acc + ch.sections?.reduce((sacc, s) => sacc + (s.knowledge_points?.length || 0), 0), 0
                )}
                prefix={<BulbOutlined />}
                suffix="个"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="预计学时"
                value={course.estimated_hours}
                prefix={<ClockCircleOutlined />}
                suffix="小时"
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const renderChapterContent = () => {
    if (!course || !course.chapters) return null;

    return (
      <div className="space-y-4">
        <Card title="课程大纲" extra={
          <Space>
            <Button size="small" onClick={() => setExpandedChapters(course.chapters.map(ch => `chapter-${ch.id}`))}>
              全部展开
            </Button>
            <Button size="small" onClick={() => setExpandedChapters([])}>
              全部折叠
            </Button>
          </Space>
        }>
          <Collapse
            activeKey={expandedChapters}
            onChange={(keys) => setExpandedChapters(keys as string[])}
            expandIconPosition="left"
          >
            {course.chapters.map((chapter) => (
              <Panel
                key={`chapter-${chapter.id}`}
                header={
                  <div className="flex justify-between items-center">
                    <Space>
                      <Badge count={chapter.chapter_number} style={{ backgroundColor: '#1890ff' }} />
                      <Text strong>{chapter.title}</Text>
                      <Tag color={getDifficultyColor(chapter.difficulty_level)}>
                        {getDifficultyText(chapter.difficulty_level)}
                      </Tag>
                    </Space>
                    <Space>
                      <Text type="secondary">
                        <ClockCircleOutlined /> {chapter.estimated_hours} 小时
                      </Text>
                      <Text type="secondary">
                        <FileTextOutlined /> {chapter.sections?.length || 0} 小节
                      </Text>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        type="text"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChapterEditStart(chapter);
                        }}
                        title="编辑章节"
                      />
                    </Space>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div>
                    <Text type="secondary">章节描述：</Text>
                    <Paragraph>{chapter.description}</Paragraph>
                  </div>

                  {chapter.learning_objectives && chapter.learning_objectives.length > 0 && (
                    <div>
                      <Text type="secondary">学习目标：</Text>
                      <ul className="mt-2">
                        {chapter.learning_objectives.map((objective, idx) => (
                          <li key={idx}>
                            <CheckCircleOutlined className="text-green-500 mr-2" />
                            {objective}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Divider />

                  <div>
                    <Title level={5}>小节内容</Title>
                    <Collapse ghost>
                      {chapter.sections?.map((section) => (
                        <Panel
                          key={`section-${section.id}`}
                          header={
                            <div className="flex justify-between items-center w-full">
                              <Space>
                                <Badge status="processing" text={section.section_number} />
                                <Text strong>{section.title}</Text>
                                <Text type="secondary">
                                  ({section.estimated_minutes} 分钟)
                                </Text>
                              </Space>
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                type="text"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSectionEditStart(section, chapter.id);
                                }}
                                title="编辑小节"
                              />
                            </div>
                          }
                        >
                          <div className="space-y-3">
                            {section.description && (
                              <Paragraph type="secondary">{section.description}</Paragraph>
                            )}
                            
                            {section.content && (
                              <div>
                                <Text type="secondary">内容概要：</Text>
                                <Paragraph className="mt-2">{section.content}</Paragraph>
                              </div>
                            )}

                            {section.knowledge_points && section.knowledge_points.length > 0 && (
                              <div>
                                <Text type="secondary">知识点：</Text>
                                <List
                                  className="mt-2"
                                  dataSource={section.knowledge_points}
                                  renderItem={(point) => (
                                    <List.Item
                                      actions={[
                                        <Button
                                          key="edit"
                                          type="text"
                                          size="small"
                                          icon={<EditOutlined />}
                                          onClick={() => handleKnowledgePointEditStart(point, chapter.id, section.id)}
                                        >
                                          编辑
                                        </Button>
                                      ]}
                                    >
                                      <List.Item.Meta
                                        avatar={getPointTypeIcon(point.point_type)}
                                        title={
                                          <Space>
                                            <Tag color="blue">{point.point_id}</Tag>
                                            <Text strong>{point.title}</Text>
                                            <Tag color="default">
                                              {getPointTypeText(point.point_type)}
                                            </Tag>
                                            <Text type="secondary">
                                              ({point.estimated_minutes} 分钟)
                                            </Text>
                                          </Space>
                                        }
                                        description={point.description}
                                      />
                                    </List.Item>
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        </Panel>
                      ))}
                    </Collapse>
                  </div>
                </div>
              </Panel>
            ))}
          </Collapse>
        </Card>
      </div>
    );
  };

  const renderLearningPath = () => {
    if (!course || !course.chapters) return null;

    return (
      <Card title="学习路径">
        <Timeline mode="left">
          {course.chapters.map((chapter) => (
            <Timeline.Item
              key={chapter.id}
              dot={<BookOutlined className="text-blue-500" />}
              label={
                <Space>
                  <Text strong>第 {chapter.chapter_number} 章</Text>
                  <Text type="secondary">({chapter.estimated_hours} 小时)</Text>
                </Space>
              }
            >
              <Card size="small" className="mb-4">
                <Title level={5}>{chapter.title}</Title>
                <Paragraph type="secondary">{chapter.description}</Paragraph>
                <div className="mt-2">
                  {chapter.sections?.map((section) => (
                    <div key={section.id} className="mb-1">
                      <CheckCircleOutlined className="text-green-500 mr-2" />
                      <Text>{section.section_number} {section.title}</Text>
                    </div>
                  ))}
                </div>
              </Card>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spin size="large" tip="加载课程详情中..." />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center">
        <Title level={3}>课程不存在</Title>
        <Button onClick={() => navigate('/courses')}>返回课程列表</Button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex justify-between items-center">
        <Title level={2} style={{ margin: 0 }}>
          {course.title}
        </Title>
        
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/courses')}>
            返回列表
          </Button>
          <Button icon={<EditOutlined />} type="primary" onClick={handleEditStart}>
            编辑课程
          </Button>
          <Button icon={<DownloadOutlined />}>
            导出课程
          </Button>
          <Button icon={<ShareAltOutlined />}>
            分享
          </Button>
        </Space>
        </div>
      </div>

      <div className="page-section">
        <Card>
        <div className="mb-4">
          <Title level={2} className="mb-2">
            {course.title}
          </Title>
          <Space size="large">
            <Tag color={getDifficultyColor(course.difficulty_level)} className="text-base px-3 py-1">
              {getDifficultyText(course.difficulty_level)}
            </Tag>
            <Space>
              <TeamOutlined />
              <Text>{course.target_audience}</Text>
            </Space>
            <Space>
              <ClockCircleOutlined />
              <Text>{course.estimated_hours} 小时</Text>
            </Space>
            <Space>
              <BookOutlined />
              <Text>{course.chapters.length} 章节</Text>
            </Space>
          </Space>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span><BookOutlined />课程概览</span>} key="overview">
            {renderCourseOverview()}
          </TabPane>
          <TabPane tab={<span><FileTextOutlined />章节内容</span>} key="content">
            {renderChapterContent()}
          </TabPane>
          <TabPane tab={<span><TrophyOutlined />学习路径</span>} key="path">
            {renderLearningPath()}
          </TabPane>
          <TabPane tab={<span><PartitionOutlined />知识图谱</span>} key="knowledge-graph">
            <KnowledgeGraphViewer 
              courseId={course.id} 
              height={600}
              onGenerate={() => {
                message.success('知识图谱已更新');
              }}
            />
          </TabPane>
        </Tabs>
        </Card>
      </div>

      {/* 编辑课程模态框 */}
      <Modal
        title="编辑课程信息"
        open={editMode}
        onOk={handleEditSave}
        onCancel={handleEditCancel}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="课程标题">
            <Input
              value={editingCourse.title}
              onChange={(e) => setEditingCourse(prev => ({ ...prev, title: e.target.value }))}
              placeholder="请输入课程标题"
            />
          </Form.Item>
          
          <Form.Item label="课程描述">
            <Input.TextArea
              value={editingCourse.description}
              onChange={(e) => setEditingCourse(prev => ({ ...prev, description: e.target.value }))}
              placeholder="请输入课程描述"
              rows={4}
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="难度等级">
                <Select
                  value={editingCourse.difficulty_level}
                  onChange={(value) => setEditingCourse(prev => ({ ...prev, difficulty_level: value }))}
                  placeholder="请选择难度等级"
                >
                  <Select.Option value="beginner">初级</Select.Option>
                  <Select.Option value="intermediate">中级</Select.Option>
                  <Select.Option value="advanced">高级</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="预计学时">
                <InputNumber
                  value={editingCourse.estimated_hours}
                  onChange={(value) => setEditingCourse(prev => ({ ...prev, estimated_hours: value || 0 }))}
                  placeholder="请输入预计学时"
                  min={0}
                  max={500}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item label="目标受众">
            <Input
              value={editingCourse.target_audience}
              onChange={(e) => setEditingCourse(prev => ({ ...prev, target_audience: e.target.value }))}
              placeholder="请输入目标受众"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑章节模态框 */}
      <Modal
        title="编辑章节信息"
        open={chapterEditMode}
        onOk={handleChapterEditSave}
        onCancel={handleChapterEditCancel}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        {editingChapter && (
          <Form layout="vertical">
            <Form.Item label="章节标题">
              <Input
                value={editingChapter.title}
                onChange={(e) => setEditingChapter(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                placeholder="请输入章节标题"
              />
            </Form.Item>
            
            <Form.Item label="章节描述">
              <Input.TextArea
                value={editingChapter.description}
                onChange={(e) => setEditingChapter(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                placeholder="请输入章节描述"
                rows={3}
              />
            </Form.Item>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="难度等级">
                  <Select
                    value={editingChapter.difficulty_level}
                    onChange={(value) => setEditingChapter(prev => prev ? ({ ...prev, difficulty_level: value }) : null)}
                    placeholder="请选择难度等级"
                  >
                    <Select.Option value="beginner">初级</Select.Option>
                    <Select.Option value="intermediate">中级</Select.Option>
                    <Select.Option value="advanced">高级</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="预计学时">
                  <InputNumber
                    value={editingChapter.estimated_hours}
                    onChange={(value) => setEditingChapter(prev => prev ? ({ ...prev, estimated_hours: value || 0 }) : null)}
                    placeholder="请输入预计学时"
                    min={0}
                    max={50}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item label="学习目标">
              <Input.TextArea
                value={editingChapter.learning_objectives?.join('\n')}
                onChange={(e) => {
                  const objectives = e.target.value.split('\n').filter(obj => obj.trim());
                  setEditingChapter(prev => prev ? ({ ...prev, learning_objectives: objectives }) : null);
                }}
                placeholder="请输入学习目标，每行一个"
                rows={4}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 编辑小节模态框 */}
      <Modal
        title="编辑小节信息"
        open={sectionEditMode}
        onOk={handleSectionEditSave}
        onCancel={handleSectionEditCancel}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        {editingSection && (
          <Form layout="vertical">
            <Form.Item label="小节标题">
              <Input
                value={editingSection.title}
                onChange={(e) => setEditingSection(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                placeholder="请输入小节标题"
              />
            </Form.Item>
            
            <Form.Item label="小节描述">
              <Input.TextArea
                value={editingSection.description}
                onChange={(e) => setEditingSection(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                placeholder="请输入小节描述"
                rows={2}
              />
            </Form.Item>
            
            <Form.Item label="小节内容">
              <Input.TextArea
                value={editingSection.content}
                onChange={(e) => setEditingSection(prev => prev ? ({ ...prev, content: e.target.value }) : null)}
                placeholder="请输入小节的详细内容"
                rows={8}
              />
            </Form.Item>
            
            <Form.Item label="预计分钟数">
              <InputNumber
                value={editingSection.estimated_minutes}
                onChange={(value) => setEditingSection(prev => prev ? ({ ...prev, estimated_minutes: value || 0 }) : null)}
                placeholder="请输入预计学习分钟数"
                min={0}
                max={300}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 编辑知识点模态框 */}
      <Modal
        title="编辑知识点信息"
        open={knowledgePointEditMode}
        onOk={handleKnowledgePointEditSave}
        onCancel={handleKnowledgePointEditCancel}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        {editingKnowledgePoint && (
          <Form layout="vertical">
            <Form.Item label="知识点标题">
              <Input
                value={editingKnowledgePoint.title}
                onChange={(e) => setEditingKnowledgePoint(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                placeholder="请输入知识点标题"
              />
            </Form.Item>
            
            <Form.Item label="知识点描述">
              <Input.TextArea
                value={editingKnowledgePoint.description}
                onChange={(e) => setEditingKnowledgePoint(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                placeholder="请输入知识点描述"
                rows={4}
              />
            </Form.Item>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="知识点类型">
                  <Select
                    value={editingKnowledgePoint.point_type}
                    onChange={(value) => setEditingKnowledgePoint(prev => prev ? ({ ...prev, point_type: value }) : null)}
                    placeholder="请选择知识点类型"
                  >
                    <Select.Option value="concept">概念</Select.Option>
                    <Select.Option value="method">方法</Select.Option>
                    <Select.Option value="tool">工具</Select.Option>
                    <Select.Option value="case">案例</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="预计分钟数">
                  <InputNumber
                    value={editingKnowledgePoint.estimated_minutes}
                    onChange={(value) => setEditingKnowledgePoint(prev => prev ? ({ ...prev, estimated_minutes: value || 0 }) : null)}
                    placeholder="请输入预计学习分钟数"
                    min={0}
                    max={120}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default CourseDetail;