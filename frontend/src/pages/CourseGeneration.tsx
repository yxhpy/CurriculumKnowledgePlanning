import React, { useState, useEffect } from 'react';
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
import { useDocumentStore } from '../stores/documentStore';
import { useCourseStore } from '../stores/courseStore';
import { useWebSocket } from '../hooks/useWebSocket';
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
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [courseConfig, setCourseConfig] = useState<any>({});
  const [form] = Form.useForm();
  
  const { documents, fetchDocuments } = useDocumentStore();
  const { 
    generating, 
    generationProgress, 
    generationStep,
    generationMessage,
    currentTaskId,
    generatedCourseId,
    generateCourse,
    handleProgressUpdate,
    handleCompletionUpdate,
    handleErrorUpdate,
    resetGenerationState,
    error
  } = useCourseStore();
  
  // WebSocket connection for real-time progress updates
  const { connected } = useWebSocket({
    taskId: currentTaskId || '',
    enabled: !!currentTaskId && generating,
    onProgress: handleProgressUpdate,
    onCompletion: (update) => {
      handleCompletionUpdate(update);
      if (update.success) {
        setCurrent(3); // 跳转到完成页面
        message.success('课程生成成功！');
      } else {
        message.error(`课程生成失败: ${update.message}`);
      }
    },
    onError: (update) => {
      handleErrorUpdate(update);
      message.error(`生成过程出错: ${update.message}`);
    },
  });

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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
    } else if (current === 1) {
      goToStep(2);
    } else {
      setCurrent(current + 1);
    }
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      const config = {
        name: values.courseName,
        level: values.level,
        audience: values.audience,
        duration: values.duration,
        mode: values.options || 'balanced'
      };
      
      setCourseConfig(config);
      
      // 重置生成状态
      resetGenerationState();
      
      await generateCourse({
        document_ids: selectedDocuments,
        course_config: config
      });
      
      // 成功启动后，WebSocket会接管进度更新
      // 不再立即跳转到完成页面，等待WebSocket completion事件
      
    } catch (error) {
      console.error('Course generation error:', error);
      message.error('课程生成启动失败，请重试');
    }
  };

  const goToStep = (step: number) => {
    if (step === 2) {
      // 在进入生成步骤前，保存表单数据
      form.validateFields().then(values => {
        setCourseConfig({
          name: values.courseName,
          level: values.level,
          audience: values.audience,
          duration: values.duration,
          mode: values.options || 'balanced'
        });
        setCurrent(step);
      }).catch(() => {
        message.error('请填写完整的课程配置信息');
      });
    } else {
      setCurrent(step);
    }
  };

  // 辅助函数：获取步骤显示名称
  const getStepDisplayName = (step: string): string => {
    const stepNames: Record<string, string> = {
      'initializing': '初始化准备',
      'preparing': '文档内容准备',
      'introduction': '课程介绍生成',
      'objectives': '学习目标制定',
      'structure': '章节结构规划',
      'content': '详细内容生成',
      'completed': '课程生成完成',
      'error': '处理错误',
      'failed': '生成失败'
    };
    return stepNames[step] || step;
  };

  // 辅助函数：检查步骤是否已完成
  const isStepCompleted = (step: string): boolean => {
    const stepOrder = ['initializing', 'preparing', 'introduction', 'objectives', 'structure', 'content', 'completed'];
    const currentStepIndex = stepOrder.indexOf(generationStep);
    const targetStepIndex = stepOrder.indexOf(step);
    
    if (currentStepIndex === -1) return false;
    return currentStepIndex > targetStepIndex || (currentStepIndex === targetStepIndex && generationProgress >= getStepMinProgress(step));
  };

  // 辅助函数：获取步骤的最小进度
  const getStepMinProgress = (step: string): number => {
    const stepProgress: Record<string, number> = {
      'initializing': 5,
      'preparing': 10,
      'introduction': 30,
      'objectives': 50,
      'structure': 70,
      'content': 75,
      'completed': 100
    };
    return stepProgress[step] || 0;
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
            <Form form={form} layout="vertical">
              <Form.Item label="文档选择" required>
                <Select
                  mode="multiple"
                  placeholder="请选择文档"
                  style={{ width: '100%' }}
                  value={selectedDocuments}
                  onChange={setSelectedDocuments}
                  options={documents
                    .filter(doc => doc.status === 'processed')
                    .map(doc => ({ 
                      label: `${doc.filename} (${doc.file_type})`, 
                      value: doc.id 
                    }))
                  }
                />
              </Form.Item>
              <Form.Item label="补充材料（可选）" name="additional">
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
                <div className="mt-4 mb-2">
                  <Text strong>{generationMessage || 'AI正在分析和生成...'}</Text>
                  {connected && (
                    <Text type="success" className="ml-2">● 实时连接</Text>
                  )}
                </div>
                <Progress
                  percent={generationProgress}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  className="mt-4"
                  status={error ? 'exception' : 'active'}
                />
                <div className="mt-6 space-y-2">
                  {generationStep && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <Text className="block">
                        当前步骤: <Text strong>{getStepDisplayName(generationStep)}</Text>
                      </Text>
                    </div>
                  )}
                  
                  {/* 显示各个阶段的完成状态 */}
                  <div className="space-y-1 mt-4">
                    <Text className={`block ${isStepCompleted('initializing') ? 'text-green-600' : 'text-gray-400'}`}>
                      {isStepCompleted('initializing') ? '✓' : '○'} 初始化准备
                    </Text>
                    <Text className={`block ${isStepCompleted('preparing') ? 'text-green-600' : 'text-gray-400'}`}>
                      {isStepCompleted('preparing') ? '✓' : '○'} 文档内容准备
                    </Text>
                    <Text className={`block ${isStepCompleted('introduction') ? 'text-green-600' : 'text-gray-400'}`}>
                      {isStepCompleted('introduction') ? '✓' : '○'} 课程介绍生成
                    </Text>
                    <Text className={`block ${isStepCompleted('objectives') ? 'text-green-600' : 'text-gray-400'}`}>
                      {isStepCompleted('objectives') ? '✓' : '○'} 学习目标制定
                    </Text>
                    <Text className={`block ${isStepCompleted('structure') ? 'text-green-600' : 'text-gray-400'}`}>
                      {isStepCompleted('structure') ? '✓' : '○'} 章节结构规划
                    </Text>
                    <Text className={`block ${isStepCompleted('content') ? 'text-green-600' : 'text-gray-400'}`}>
                      {isStepCompleted('content') ? '✓' : '○'} 详细内容生成
                    </Text>
                    <Text className={`block ${isStepCompleted('completed') ? 'text-green-600' : 'text-gray-400'}`}>
                      {isStepCompleted('completed') ? '✓' : '○'} 课程生成完成
                    </Text>
                  </div>
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
                    <Text>• 选择文档：{selectedDocuments.length}个</Text>
                    <Text>• 课程名称：{courseConfig.name || '未设置'}</Text>
                    <Text>• 课程级别：{courseConfig.level || '未设置'}</Text>
                    <Text>• 目标受众：{courseConfig.audience || '未设置'}</Text>
                    <Text>• 预计课时：{courseConfig.duration || '未设置'}课时</Text>
                    <Text>• 生成模式：{courseConfig.mode === 'fast' ? '快速生成' : courseConfig.mode === 'quality' ? '高质量生成' : '平衡模式'}</Text>
                  </Space>
                </div>
              </div>
            )}
          </div>
        );
        
      case 3:
        return (
          <Result
            status={error ? "error" : "success"}
            title={error ? "课程生成失败" : "课程生成成功！"}
            subTitle={error ? `生成过程中遇到错误: ${error}` : "您的课程已成功生成，可以查看详情或继续编辑"}
            extra={!error ? [
              <Button type="primary" key="view" onClick={() => {
                if (generatedCourseId) {
                  // 跳转到课程详情页面
                  window.location.href = `/courses/${generatedCourseId}`;
                }
              }}>
                查看课程
              </Button>,
              <Button key="edit" onClick={() => {
                if (generatedCourseId) {
                  // 跳转到课程编辑页面
                  window.location.href = `/courses/${generatedCourseId}/edit`;
                }
              }}>
                编辑课程
              </Button>,
              <Button key="new" onClick={() => {
                // 重置状态，开始新的生成流程
                resetGenerationState();
                setSelectedDocuments([]);
                setCourseConfig({});
                form.resetFields();
                setCurrent(0);
              }}>
                生成新课程
              </Button>,
            ] : [
              <Button key="retry" type="primary" onClick={() => {
                // 重试生成
                setCurrent(2);
                handleGenerate();
              }}>
                重试生成
              </Button>,
              <Button key="back" onClick={() => {
                // 返回配置步骤
                setCurrent(1);
                resetGenerationState();
              }}>
                返回配置
              </Button>
            ]}
          >
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <Title level={5}>生成结果</Title>
              <Space direction="vertical" size="small">
                <Text>课程名称：{courseConfig.name || 'AI生成课程'}</Text>
                <Text>文档数量：{selectedDocuments.length}个</Text>
                <Text>目标受众：{courseConfig.audience}</Text>
                <Text>预计学时：{courseConfig.duration}小时</Text>
                <Text>生成时间：{new Date().toLocaleString()}</Text>
                {generatedCourseId && (
                  <Text>课程ID：{generatedCourseId}</Text>
                )}
                {currentTaskId && (
                  <Text>任务ID：{currentTaskId}</Text>
                )}
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