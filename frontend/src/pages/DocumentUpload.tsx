import React, { useState } from 'react';
import {
  Upload,
  Button,
  Card,
  List,
  Tag,
  Progress,
  App,
  Typography,
  Space,
  Tooltip,
  Modal,
} from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { documentAPI } from '@/services/api';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface DocumentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploaded' | 'uploading' | 'processing' | 'processed' | 'completed' | 'failed';
  progress: number;
  uploadTime: string;
  processed_content?: string;
  raw_content?: string;
}

const DocumentUpload: React.FC = () => {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  // 获取文档列表
  const fetchDocuments = async () => {
    try {
      const response = await documentAPI.getDocuments();
      const documentItems: DocumentItem[] = response.map(doc => ({
        id: doc.id.toString(),
        name: doc.filename,
        size: doc.file_size,
        type: doc.file_type,
        status: doc.status as DocumentItem['status'],
        progress: doc.status === 'processed' ? 100 : doc.status === 'processing' ? 50 : doc.status === 'uploaded' ? 0 : 100,
        uploadTime: new Date(doc.created_at).toLocaleString(),
        processed_content: doc.processed_content,
        raw_content: doc.raw_content,
      }));
      setDocuments(documentItems);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  React.useEffect(() => {
    fetchDocuments();
    // 设置定时刷新以更新处理状态
    const interval = setInterval(fetchDocuments, 3000);
    return () => clearInterval(interval);
  }, []);

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
      uploading: { color: 'blue', icon: <ClockCircleOutlined />, text: '上传中' },
      processing: { color: 'orange', icon: <ClockCircleOutlined />, text: '处理中' },
      processed: { color: 'green', icon: <CheckCircleOutlined />, text: '已完成' },
      completed: { color: 'green', icon: <CheckCircleOutlined />, text: '已完成' },
      failed: { color: 'red', icon: <CloseCircleOutlined />, text: '失败' },
    };
    const config = statusMap[status] || { color: 'default', icon: <ClockCircleOutlined />, text: status };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.md',
    fileList,
    action: '/api/v1/documents/upload',
    onChange(info) {
      const { status } = info.file;
      setFileList(info.fileList);
      
      if (status === 'done') {
        message.success(`${info.file.name} 上传成功`);
        // 刷新文档列表以获取最新状态
        fetchDocuments();
      } else if (status === 'error') {
        message.error(`${info.file.name} 上传失败`);
      }
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex justify-between items-center">
          <Title level={2}>文档上传与处理</Title>
          <Text type="secondary">支持 PDF、Word、Excel、文本、Markdown 格式</Text>
        </div>
      </div>

      <div className="page-section">
        <Card className="shadow-md">
        <Dragger {...uploadProps} className="bg-gray-50">
          <p className="ant-upload-drag-icon">
            <InboxOutlined className="text-5xl text-primary-500" />
          </p>
          <p className="ant-upload-text text-lg">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint text-gray-500">
            支持单个或批量上传，严禁上传公司数据或其他敏感文件
          </p>
        </Dragger>
        </Card>
      </div>

      {documents.length > 0 && (
        <div className="page-section">
          <Card title="已上传文档" className="shadow-md">
          <List
            itemLayout="horizontal"
            dataSource={documents}
            renderItem={(item) => (
              <List.Item
                className="hover:bg-gray-50 px-4 py-3 rounded-lg transition-colors"
                actions={[
                  <Tooltip title="预览">
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={async () => {
                        try {
                          // 获取完整的文档信息，包括处理后的内容
                          const fullDoc = await documentAPI.getDocument(parseInt(item.id));
                          const documentItem: DocumentItem = {
                            id: fullDoc.id.toString(),
                            name: fullDoc.filename,
                            size: fullDoc.file_size,
                            type: fullDoc.file_type,
                            status: fullDoc.status as DocumentItem['status'],
                            progress: fullDoc.status === 'processed' ? 100 : fullDoc.status === 'processing' ? 50 : fullDoc.status === 'uploaded' ? 0 : 100,
                            uploadTime: new Date(fullDoc.created_at).toLocaleString(),
                            processed_content: fullDoc.processed_content,
                            raw_content: fullDoc.raw_content,
                          };
                          setSelectedDoc(documentItem);
                          setPreviewVisible(true);
                        } catch (error) {
                          message.error('获取文档详情失败');
                          // 降级处理，使用当前文档信息
                          setSelectedDoc(item);
                          setPreviewVisible(true);
                        }
                      }}
                    />
                  </Tooltip>,
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={async () => {
                        try {
                          await documentAPI.deleteDocument(parseInt(item.id));
                          message.success('文档已删除');
                          fetchDocuments();
                        } catch (error) {
                          message.error('删除失败');
                        }
                      }}
                    />
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  avatar={<div className="text-2xl">{getFileIcon(item.type)}</div>}
                  title={
                    <Space>
                      <Text strong>{item.name}</Text>
                      {getStatusTag(item.status)}
                    </Space>
                  }
                  description={
                    <Space size="large">
                      <Text type="secondary">{formatFileSize(item.size)}</Text>
                      <Text type="secondary">{item.uploadTime}</Text>
                      {item.status === 'processing' && (
                        <Progress percent={50} size="small" style={{ width: 100 }} />
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
          </Card>
        </div>
      )}

      <Modal
        title="文档预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
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
              <Title level={4}>{selectedDoc.name}</Title>
              <Paragraph>
                <Text type="secondary">文件类型：</Text> {selectedDoc.type.toUpperCase()}
              </Paragraph>
              <Paragraph>
                <Text type="secondary">文件大小：</Text> {formatFileSize(selectedDoc.size)}
              </Paragraph>
              <Paragraph>
                <Text type="secondary">上传时间：</Text> {selectedDoc.uploadTime}
              </Paragraph>
              <Paragraph>
                <Text type="secondary">处理状态：</Text> {getStatusTag(selectedDoc.status)}
              </Paragraph>
            </div>
            {selectedDoc.status === 'processed' && (
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                <Title level={5}>文档内容预览</Title>
                <div 
                  style={{ 
                    backgroundColor: 'white',
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
        )}
      </Modal>
    </div>
  );
};

export default DocumentUpload;