import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Input,
  Select,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FileTextOutlined,
  BookOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../stores/courseStore';
import { Course } from '../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;
const { Search } = Input;

const CourseList: React.FC = () => {
  const navigate = useNavigate();
  const { courses, loading, error, fetchCourses } = useCourseStore();
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    let filtered = courses;

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchText.toLowerCase()) ||
        course.description.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(course => course.status === statusFilter);
    }

    setFilteredCourses(filtered);
  }, [courses, searchText, statusFilter]);

  const getStatusTag = (status: string) => {
    const statusMap = {
      'draft': { color: 'default', text: '草稿' },
      'published': { color: 'green', text: '已发布' },
      'archived': { color: 'red', text: '已归档' },
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleDelete = async (id: number) => {
    try {
      // TODO: Implement course deletion API
      message.success('课程删除成功');
      fetchCourses();
    } catch (error) {
      message.error('删除失败，请重试');
    }
  };

  const columns: ColumnsType<Course> = [
    {
      title: '课程名称',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Course) => (
        <div className="cursor-pointer" onClick={() => navigate(`/course/${record.id}`)}>
          <div className="font-medium text-blue-600 hover:text-blue-800">
            {title}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {record.description}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: getStatusTag,
    },
    {
      title: '章节数',
      dataIndex: 'chapters',
      key: 'chapters',
      width: 80,
      render: (chapters: number) => (
        <div className="flex items-center">
          <BookOutlined className="mr-1 text-gray-400" />
          {chapters}
        </div>
      ),
    },
    {
      title: '文档数',
      dataIndex: 'document_count',
      key: 'document_count',
      width: 80,
      render: (count: number) => (
        <div className="flex items-center">
          <FileTextOutlined className="mr-1 text-gray-400" />
          {count}
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => (
        <div className="flex items-center">
          <ClockCircleOutlined className="mr-1 text-gray-400" />
          {new Date(date).toLocaleDateString()}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record: Course) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/course/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/course/${record.id}/edit`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个课程吗？"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: courses.length,
    published: courses.filter(c => c.status === 'published').length,
    draft: courses.filter(c => c.status === 'draft').length,
    archived: courses.filter(c => c.status === 'archived').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>课程管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/generate')}
        >
          创建新课程
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总课程数"
              value={stats.total}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已发布"
              value={stats.published}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="草稿"
              value={stats.draft}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已归档"
              value={stats.archived}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和过滤 */}
      <Card>
        <Row gutter={16} className="mb-4">
          <Col span={12}>
            <Search
              placeholder="搜索课程名称或描述"
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="选择状态"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: '全部状态', value: 'all' },
                { label: '草稿', value: 'draft' },
                { label: '已发布', value: 'published' },
                { label: '已归档', value: 'archived' },
              ]}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredCourses}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredCourses.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      {error && (
        <Card>
          <div className="text-center py-8 text-red-500">
            {error}
            <br />
            <Button onClick={fetchCourses} className="mt-2">
              重试
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CourseList;