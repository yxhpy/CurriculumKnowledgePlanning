import React, { useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress, List, Tag, Typography, Space, Spin, Alert } from 'antd';
import {
  FileTextOutlined,
  BookOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';
import { useDashboardStore } from '../stores/dashboardStore';
import { useDocumentStore } from '../stores/documentStore';
import { useCourseStore } from '../stores/courseStore';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { stats, loading, error, fetchStats } = useDashboardStore();
  const { documents, fetchDocuments } = useDocumentStore();
  const { courses, fetchCourses } = useCourseStore();
  
  useEffect(() => {
    fetchStats();
    fetchDocuments();
    fetchCourses();
  }, [fetchStats, fetchDocuments, fetchCourses]);

  // 生成图表数据
  const pieData = useMemo(() => {
    if (!stats.documentStats?.file_type_distribution) {
      return [];
    }
    return stats.documentStats.file_type_distribution.map(item => ({
      type: item.type.toUpperCase(),
      value: item.count
    }));
  }, [stats.documentStats?.file_type_distribution]);

  // 基于真实课程创建时间生成趋势数据
  const lineData = useMemo(() => {
    if (!courses.length) {
      return [
        { date: '无数据', value: 0 }
      ];
    }

    // 按月份分组课程
    const monthlyData: Record<string, number> = {};
    
    courses.forEach(course => {
      const date = new Date(course.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    // 生成最近6个月的数据
    const result = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      result.push({
        date: monthName,
        value: monthlyData[monthKey] || 0
      });
    }

    return result;
  }, [courses]);

  // 最近活动（基于真实文档数据）
  const recentActivities = useMemo(() => {
    return documents.slice(0, 4).map((doc, index) => ({
      id: doc.id,
      action: '上传文档',
      course: doc.filename,
      time: new Date(doc.created_at).toLocaleDateString(),
      status: doc.status === 'processed' ? 'success' : doc.status === 'failed' ? 'error' : 'processing',
    }));
  }, [documents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        className="mb-4"
        action={<a onClick={fetchStats}>重试</a>}
      />
    );
  }

  const lineConfig = {
    data: lineData,
    xField: 'date',
    yField: 'value',
    smooth: true,
    point: {
      size: 5,
      shape: 'diamond',
    },
    label: {
      style: {
        fill: '#aaa',
      },
    },
  };

  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer'
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2}>仪表盘</Title>
      </div>
      
      {/* Statistics Cards */}
      <div className="page-section">
        <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="文档总数"
              value={stats.documentStats?.total_documents || 0}
              prefix={<FileTextOutlined />}
              suffix="份"
              valueStyle={{ color: '#3f8600' }}
            />
            <Progress 
              percent={stats.documentStats ? Math.round((stats.documentStats.processed_documents / stats.documentStats.total_documents) * 100) : 0} 
              strokeColor="#52c41a" 
              showInfo={false} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="已生成课程"
              value={stats.courseStats?.total_courses || 0}
              prefix={<BookOutlined />}
              suffix="门"
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress 
              percent={stats.courseStats ? Math.round((stats.courseStats.published_courses / (stats.courseStats.total_courses || 1)) * 100) : 0} 
              strokeColor="#1890ff" 
              showInfo={false} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="已处理文档"
              value={stats.documentStats?.processed_documents || 0}
              prefix={<RobotOutlined />}
              suffix="个"
              valueStyle={{ color: '#722ed1' }}
            />
            <Progress 
              percent={stats.documentStats ? Math.round((stats.documentStats.processed_documents / (stats.documentStats.total_documents || 1)) * 100) : 0} 
              strokeColor="#722ed1" 
              showInfo={false} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="文件大小"
              value={stats.documentStats && stats.documentStats.total_size > 0 
                ? (stats.documentStats.total_size / 1024 / 1024).toFixed(1) 
                : '0'
              }
              prefix={<RiseOutlined />}
              suffix="MB"
              valueStyle={{ color: '#cf1322' }}
            />
            <Progress 
              percent={stats.documentStats && stats.documentStats.total_size > 0 
                ? Math.min(Math.round((stats.documentStats.total_size / 1024 / 1024) / 100 * 100), 100)
                : 0
              } 
              strokeColor="#ff4d4f" 
              showInfo={false} 
            />
          </Card>
        </Col>
        </Row>
      </div>

      {/* Charts */}
      <div className="page-section">
        <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="课程生成趋势" className="hover:shadow-lg transition-shadow">
            <Line {...lineConfig} height={300} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="文档类型分布" className="hover:shadow-lg transition-shadow">
            <Pie {...pieConfig} height={300} />
          </Card>
        </Col>
        </Row>
      </div>

      {/* Recent Activities */}
      <div className="page-section">
        <Card title="最近活动" className="hover:shadow-lg transition-shadow">
        <List
          itemLayout="horizontal"
          dataSource={recentActivities}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  item.status === 'success' ? (
                    <CheckCircleOutlined className="text-2xl text-green-500" />
                  ) : (
                    <ClockCircleOutlined className="text-2xl text-orange-500" />
                  )
                }
                title={
                  <Space>
                    <Text strong>{item.action}</Text>
                    <Tag color={item.status === 'success' ? 'green' : 'orange'}>
                      {item.status === 'success' ? '完成' : '处理中'}
                    </Tag>
                  </Space>
                }
                description={
                  <Space>
                    <Text>{item.course}</Text>
                    <Text type="secondary">• {item.time}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;