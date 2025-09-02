import React, { useState } from 'react';
import {
  Steps,
  Card,
  Button,
  Form,
  Input,
  Select,
  Radio,
  Space,
  Typography,
  Divider,
  Result,
  Spin,
  message,
  Progress,
} from 'antd';
import {
  FileTextOutlined,
  SettingOutlined,
  RobotOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CourseGeneration: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [form] = Form.useForm();

  const steps = [
    {
      title: '选择文档',
      icon: <FileTextOutlined />,
    },
    {
      title: '配置参数',
      icon: <SettingOutlined />,
    },
    {
      title: 'AI生成',
      icon: <RobotOutlined />,
    },
    {
      title: '完成',
      icon: <CheckCircleOutlined />,
    },
  ];

  const next = () => {
    if (current === 2) {
      handleGenerate();
    } else {
      setCurrent(current + 1);
    }
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationProgress(0);
    
    // Simulate generation progress
    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setGenerating(false);
          setCurrent(3);
          message.success('课程生成成功！');
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const renderStepContent = () => {
    switch (current) {
      case 0:
        return (
          <div className="py-8">
            <Title level={4}>选择源文档</Title>
            <Paragraph type="secondary">
              请选择已上传的文档作为课程生成的素材
            </Paragraph>
            <Form layout="vertical">
              <Form.Item label="文档选择" required>
                <Select
                  mode="multiple"
                  placeholder="请选择文档"
                  style={{ width: '100%' }}
                  options={[
                    { label: 'Python基础教程.pdf', value: '1' },
                    { label: '数据分析指南.docx', value: '2' },
                    { label: '机器学习入门.md', value: '3' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="补充材料（可选）">
                <TextArea
                  rows={4}
                  placeholder="输入额外的课程内容或要求..."
                />
              </Form.Item>
            </Form>
          </div>
        );
        
      case 1:
        return (
          <div className="py-8">
            <Title level={4}>配置生成参数</Title>
            <Paragraph type="secondary">
              根据您的需求配置课程生成参数
            </Paragraph>
            <Form form={form} layout="vertical">
              <Form.Item label="课程名称" name="courseName" required>
                <Input placeholder="输入课程名称" />
              </Form.Item>
              <Form.Item label="课程级别" name="level" required>
                <Radio.Group>
                  <Radio value="beginner">初级</Radio>
                  <Radio value="intermediate">中级</Radio>
                  <Radio value="advanced">高级</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item label="目标受众" name="audience" required>
                <Input placeholder="例如：大学生、在职人员、初学者等" />
              </Form.Item>
              <Form.Item label="预计课时" name="duration" required>
                <Select
                  placeholder="选择预计课时"
                  options={[
                    { label: '8课时', value: '8' },
                    { label: '16课时', value: '16' },
                    { label: '24课时', value: '24' },
                    { label: '32课时', value: '32' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="生成选项" name="options">
                <Radio.Group>
                  <Space direction="vertical">
                    <Radio value="fast">快速生成（质量标准）</Radio>
                    <Radio value="balanced">平衡模式（推荐）</Radio>
                    <Radio value="quality">高质量生成（耗时较长）</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Form>
          </div>
        );
        
      case 2:
        return (
          <div className="py-8 text-center">
            {generating ? (
              <div>
                <Spin size="large" />
                <Title level={4} className="mt-6">
                  AI正在生成课程内容...
                </Title>
                <Progress
                  percent={generationProgress}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  className="mt-4"
                />
                <div className="mt-6 space-y-2">
                  {generationProgress >= 20 && (
                    <Text className="block">✓ 文档分析完成</Text>
                  )}
                  {generationProgress >= 40 && (
                    <Text className="block">✓ 课程大纲生成</Text>
                  )}
                  {generationProgress >= 60 && (
                    <Text className="block">✓ 章节内容填充</Text>
                  )}
                  {generationProgress >= 80 && (
                    <Text className="block">✓ 知识图谱构建</Text>
                  )}
                  {generationProgress >= 100 && (
                    <Text className="block">✓ 质量检查完成</Text>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <Title level={4}>准备生成课程</Title>
                <Paragraph>
                  点击"开始生成"按钮，AI将根据您的配置生成完整的课程内容
                </Paragraph>
                <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
                  <Title level={5}>生成配置摘要</Title>
                  <Space direction="vertical" size="small">
                    <Text>• 选择文档：3个</Text>
                    <Text>• 课程级别：中级</Text>
                    <Text>• 目标受众：大学生</Text>
                    <Text>• 预计课时：16课时</Text>
                    <Text>• 生成模式：平衡模式</Text>
                  </Space>
                </div>
              </div>
            )}
          </div>
        );
        
      case 3:
        return (
          <Result
            status="success"
            title="课程生成成功！"
            subTitle="您的课程已成功生成，可以查看详情或继续编辑"
            extra={[
              <Button type="primary" key="view">
                查看课程
              </Button>,
              <Button key="edit">编辑课程</Button>,
              <Button key="new">生成新课程</Button>,
            ]}
          >
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <Title level={5}>生成结果</Title>
              <Space direction="vertical" size="small">
                <Text>课程名称：Python数据分析实战</Text>
                <Text>章节数量：8章</Text>
                <Text>知识点：45个</Text>
                <Text>预计学时：16小时</Text>
                <Text>生成时间：2024-01-15 14:30</Text>
              </Space>
            </div>
          </Result>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Title level={2}>智能课程生成</Title>
      
      <Card className="shadow-lg">
        <Steps current={current} items={steps} />
        <Divider />
        
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>
        
        <Divider />
        
        <div className="flex justify-between">
          {current > 0 && current < 3 && (
            <Button onClick={prev}>上一步</Button>
          )}
          {current < 3 && (
            <Button
              type="primary"
              onClick={next}
              loading={generating}
              className="ml-auto"
            >
              {current === 2 ? '开始生成' : '下一步'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CourseGeneration;