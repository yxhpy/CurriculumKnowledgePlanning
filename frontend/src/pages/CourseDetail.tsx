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
  Breadcrumb,
  Row,
  Col,
  Statistic,
  Timeline,
  List,
  Badge,
  Divider,
  Tabs,
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
} from '@ant-design/icons';
import axios from 'axios';

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
      <div className="space-y-6">
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
                            <Space>
                              <Badge status="processing" text={section.section_number} />
                              <Text strong>{section.title}</Text>
                              <Text type="secondary">
                                ({section.estimated_minutes} 分钟)
                              </Text>
                            </Space>
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
                                    <List.Item>
                                      <Space className="w-full">
                                        {getPointTypeIcon(point.point_type)}
                                        <div className="flex-1">
                                          <div>
                                            <Tag color="blue">{point.point_id}</Tag>
                                            <Text strong>{point.title}</Text>
                                            <Tag color="default" className="ml-2">
                                              {getPointTypeText(point.point_type)}
                                            </Tag>
                                            <Text type="secondary" className="ml-2">
                                              ({point.estimated_minutes} 分钟)
                                            </Text>
                                          </div>
                                          <Paragraph type="secondary" className="mt-1 mb-0">
                                            {point.description}
                                          </Paragraph>
                                        </div>
                                      </Space>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Breadcrumb>
          <Breadcrumb.Item>
            <a onClick={() => navigate('/dashboard')}>首页</a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <a onClick={() => navigate('/courses')}>课程管理</a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{course.title}</Breadcrumb.Item>
        </Breadcrumb>
        
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/courses')}>
            返回列表
          </Button>
          <Button icon={<EditOutlined />} type="primary">
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
        </Tabs>
      </Card>
    </div>
  );
};

export default CourseDetail;