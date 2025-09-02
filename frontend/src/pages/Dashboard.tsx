import React from 'react';
import { Card, Row, Col, Statistic, Progress, List, Tag, Typography, Space } from 'antd';
import {
  FileTextOutlined,
  BookOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  // Sample data for charts
  const lineData = [
    { date: '2024-01', value: 3 },
    { date: '2024-02', value: 4 },
    { date: '2024-03', value: 3.5 },
    { date: '2024-04', value: 5 },
    { date: '2024-05', value: 4.9 },
    { date: '2024-06', value: 6 },
    { date: '2024-07', value: 7 },
    { date: '2024-08', value: 9 },
  ];

  const pieData = [
    { type: 'PDF', value: 27 },
    { type: 'Word', value: 25 },
    { type: 'Excel', value: 18 },
    { type: 'Markdown', value: 15 },
    { type: '文本', value: 10 },
    { type: '其他', value: 5 },
  ];

  const recentActivities = [
    {
      id: 1,
      action: '生成课程',
      course: 'Python数据分析入门',
      time: '10分钟前',
      status: 'success',
    },
    {
      id: 2,
      action: '上传文档',
      course: 'machine_learning.pdf',
      time: '30分钟前',
      status: 'processing',
    },
    {
      id: 3,
      action: '编辑知识图谱',
      course: 'Web开发基础',
      time: '1小时前',
      status: 'success',
    },
    {
      id: 4,
      action: '发布课程',
      course: '人工智能导论',
      time: '2小时前',
      status: 'success',
    },
  ];

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
      type: 'outer',
      content: '{name} {percentage}',
    },
    interactions: [
      {
        type: 'pie-legend-active',
      },
      {
        type: 'element-active',
      },
    ],
  };

  return (
    <div className="space-y-6">
      <Title level={2}>仪表盘</Title>
      
      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="文档总数"
              value={156}
              prefix={<FileTextOutlined />}
              suffix="份"
              valueStyle={{ color: '#3f8600' }}
            />
            <Progress percent={75} strokeColor="#52c41a" showInfo={false} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="已生成课程"
              value={23}
              prefix={<BookOutlined />}
              suffix="门"
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress percent={60} strokeColor="#1890ff" showInfo={false} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="AI处理次数"
              value={432}
              prefix={<RobotOutlined />}
              suffix="次"
              valueStyle={{ color: '#722ed1' }}
            />
            <Progress percent={85} strokeColor="#722ed1" showInfo={false} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="本月增长"
              value={28.3}
              prefix={<RiseOutlined />}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
            />
            <Progress percent={90} strokeColor="#ff4d4f" showInfo={false} />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
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

      {/* Recent Activities */}
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
  );
};

export default Dashboard;