import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  App,
  Typography,
  Statistic,
  Row,
  Col,
  Progress,
  Tabs,
  Tooltip,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import api, { documentAPI, Document as ApiDocument } from '@/services/api';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface DocumentManagementItem extends ApiDocument {
  updated_at: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  processing_started_at?: string;
  processing_completed_at?: string;
  processed_content?: string;
  raw_content?: string;
}

interface ProcessingStatus {
  status_counts: Array<{ status: string; count: number }>;
  retryable_documents: number;
  avg_processing_time_seconds: number;
  currently_processing: number;
}

const DocumentManagement: React.FC = () => {
  const { message, modal } = App.useApp();
  const [documents, setDocuments] = useState<DocumentManagementItem[]>([]);
  const [failedDocuments, setFailedDocuments] = useState<DocumentManagementItem[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentManagementItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const getFileIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      pdf: <FilePdfOutlined className="text-red-500" />,
      docx: <FileWordOutlined className="text-blue-500" />,
      doc: <FileWordOutlined className="text-blue-500" />,
      xlsx: <FileExcelOutlined className="text-green-500" />,
      xls: <FileExcelOutlined className="text-green-500" />,
      txt: <FileTextOutlined className="text-gray-500" />,
      md: <FileTextOutlined className="text-purple-500" />,
    };
    return iconMap[type] || <FileTextOutlined />;
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      uploaded: { color: 'blue', icon: <ClockCircleOutlined />, text: '已上传' },
      processing: { color: 'orange', icon: <SyncOutlined spin />, text: '处理中' },
      processed: { color: 'green', icon: <CheckCircleOutlined />, text: '已完成' },
      failed: { color: 'red', icon: <CloseCircleOutlined />, text: '失败' },
    };
    const config = statusMap[status] || { color: 'default', icon: <ExclamationCircleOutlined />, text: status };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const documents = await documentAPI.getDocuments();
      setDocuments(documents as DocumentManagementItem[]);
    } catch (error) {
      message.error('获取文档列表失败');
    }
    setLoading(false);
  };

  const fetchFailedDocuments = async () => {
    try {
      const failedDocs = await documentAPI.getFailedDocuments();
      setFailedDocuments(failedDocs as DocumentManagementItem[]);
    } catch (error) {
      message.error('获取失败文档列表失败');
    }
  };

  const fetchProcessingStatus = async () => {
    try {
      const status = await documentAPI.getProcessingStatus();
      setProcessingStatus(status);
    } catch (error) {
      message.error('获取处理状态失败');
    }
  };

  const handleRetryDocument = async (documentId: number) => {
    try {
      await documentAPI.retryDocument(documentId);
      message.success('文档重新处理已启动');
      fetchDocuments();
      fetchFailedDocuments();
      fetchProcessingStatus();
    } catch (error) {
      message.error('重新处理失败');
    }
  };

  const handleDeleteDocument = async (documentId: number, force: boolean = false) => {
    try {
      await documentAPI.deleteDocument(documentId, force);
      message.success('文档删除成功');
      fetchDocuments();
      fetchFailedDocuments();
      fetchProcessingStatus();
    } catch (error) {
      message.error('删除文档失败');
    }
  };

  const handleCleanupTimeouts = async () => {
    try {
      const result = await documentAPI.cleanupTimeouts();
      message.success(result.message);
      fetchDocuments();
      fetchFailedDocuments();
      fetchProcessingStatus();
    } catch (error) {
      message.error('清理超时文档失败');
    }
  };

  const showDocumentDetail = (doc: DocumentManagementItem) => {
    setSelectedDoc(doc);
    setDetailVisible(true);
  };

  useEffect(() => {
    fetchDocuments();
    fetchFailedDocuments();
    fetchProcessingStatus();
    
    // 设置定期刷新
    const interval = setInterval(() => {
      fetchProcessingStatus();
      // 如果有正在处理的文档，也刷新文档列表
      if (processingStatus?.currently_processing && processingStatus.currently_processing > 0) {
        fetchDocuments();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const documentColumns: ColumnsType<DocumentManagementItem> = [
    {
      title: '文件',
      dataIndex: 'filename',
      key: 'filename',
      render: (filename: string, record: Document) => (
        <Space>
          {getFileIcon(record.file_type)}
          <span>{filename}</span>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '重试次数',
      key: 'retry_info',
      render: (_, record: Document) => `${record.retry_count}/${record.max_retries}`,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: DocumentManagementItem) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => showDocumentDetail(record)}
            />
          </Tooltip>
          {record.status === 'failed' && record.retry_count < record.max_retries && (
            <Tooltip title="重新处理">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => handleRetryDocument(record.id)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定要删除这个文档吗？"
            onConfirm={() => handleDeleteDocument(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const failedColumns: ColumnsType<DocumentManagementItem> = [
    ...documentColumns.filter(col => col.key !== 'actions'),
    {
      title: '错误信息',
      dataIndex: 'error_message',
      key: 'error_message',
      render: (error: string) => (
        <Tooltip title={error}>
          <Text type="danger" ellipsis style={{ maxWidth: 200 }}>
            {error}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: DocumentManagementItem) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => showDocumentDetail(record)}
            />
          </Tooltip>
          {record.retry_count < record.max_retries && (
            <Tooltip title="重新处理">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => handleRetryDocument(record.id)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定要强制删除这个文档吗？"
            onConfirm={() => handleDeleteDocument(record.id, true)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="强制删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <Title level={2}>文档管理</Title>
          <Space>
            <Button onClick={handleCleanupTimeouts}>
              清理超时文档
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => {
              fetchDocuments();
              fetchFailedDocuments();
              fetchProcessingStatus();
            }}>
              刷新
            </Button>
          </Space>
        </div>
      </div>

      {/* 统计信息 */}
      {processingStatus && (
        <div className="page-section">
          <Card title="处理状态概览" className="shadow-md">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="正在处理"
                  value={processingStatus.currently_processing}
                  prefix={<SyncOutlined spin />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="可重试文档"
                  value={processingStatus.retryable_documents}
                  prefix={<ReloadOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="平均处理时间"
                  value={formatDuration(processingStatus.avg_processing_time_seconds)}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <div className="bg-gray-50 p-4 rounded">
                  <Text type="secondary" className="block mb-2">状态分布</Text>
                  <Space wrap>
                    {processingStatus.status_counts.map(({ status, count }) => (
                      <div key={status} className="flex items-center">
                        {getStatusTag(status)}
                        <Text className="ml-1">{count}</Text>
                      </div>
                    ))}
                  </Space>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      )}

      {/* 文档列表 */}
      <div className="page-section">
        <Card className="shadow-md">
          <Tabs defaultActiveKey="all">
            <TabPane tab="所有文档" key="all">
              <Table
                columns={documentColumns}
                dataSource={documents}
                rowKey="id"
                loading={loading}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                }}
              />
            </TabPane>
            <TabPane tab={`失败文档 (${failedDocuments.length})`} key="failed">
              <Table
                columns={failedColumns}
                dataSource={failedDocuments}
                rowKey="id"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                }}
              />
            </TabPane>
          </Tabs>
        </Card>
      </div>

      {/* 文档详情模态框 */}
      <Modal
        title="文档详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={1000}
        styles={{
          body: {
            maxHeight: '70vh',
            overflow: 'hidden',
            padding: '24px'
          }
        }}
      >
        {selectedDoc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <div className="bg-gray-50 p-4 rounded-lg">
              <Title level={4}>
                <Space>
                  {getFileIcon(selectedDoc.file_type)}
                  {selectedDoc.filename}
                </Space>
              </Title>
              
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text type="secondary">文件类型：</Text>
                  <Text>{selectedDoc.file_type.toUpperCase()}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">文件大小：</Text>
                  <Text>{formatFileSize(selectedDoc.file_size)}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">状态：</Text>
                  {getStatusTag(selectedDoc.status)}
                </Col>
                <Col span={12}>
                  <Text type="secondary">重试次数：</Text>
                  <Text>{selectedDoc.retry_count}/{selectedDoc.max_retries}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">创建时间：</Text>
                  <Text>{new Date(selectedDoc.created_at).toLocaleString()}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">更新时间：</Text>
                  <Text>{new Date(selectedDoc.updated_at).toLocaleString()}</Text>
                </Col>
              </Row>

              {selectedDoc.processing_started_at && (
                <Row gutter={[16, 8]} className="mt-4">
                  <Col span={12}>
                    <Text type="secondary">开始处理：</Text>
                    <Text>{new Date(selectedDoc.processing_started_at).toLocaleString()}</Text>
                  </Col>
                  {selectedDoc.processing_completed_at && (
                    <Col span={12}>
                      <Text type="secondary">处理完成：</Text>
                      <Text>{new Date(selectedDoc.processing_completed_at).toLocaleString()}</Text>
                    </Col>
                  )}
                </Row>
              )}

              {selectedDoc.error_message && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <Text type="secondary" className="block mb-1">错误信息：</Text>
                  <Text type="danger">{selectedDoc.error_message}</Text>
                </div>
              )}

              {selectedDoc.status === 'processed' && (
                <div style={{ marginTop: '16px', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                  <Title level={5}>文档内容预览</Title>
                  <div 
                    style={{ 
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      maxHeight: '384px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      padding: '16px',
                      boxSizing: 'border-box',
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0
                    }}
                  >
                    {selectedDoc.processed_content ? (
                      <div 
                        style={{ 
                          fontSize: '14px',
                          color: '#374151',
                          wordBreak: 'break-all',
                          overflowWrap: 'anywhere',
                          whiteSpace: 'pre-wrap',
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: 0,
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Menlo", monospace',
                          lineHeight: '1.5',
                          margin: 0,
                          padding: 0,
                          boxSizing: 'border-box'
                        }}
                      >
                        {selectedDoc.processed_content.substring(0, 3000)}
                        {selectedDoc.processed_content.length > 3000 && '\n\n[内容过长，仅显示前3000字符]'}
                      </div>
                    ) : (
                      <Text type="secondary">暂无处理后的内容</Text>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedDoc.status === 'failed' && selectedDoc.retry_count < selectedDoc.max_retries && (
              <div className="flex justify-end">
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    handleRetryDocument(selectedDoc.id);
                    setDetailVisible(false);
                  }}
                >
                  重新处理
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentManagement;