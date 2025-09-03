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
import { useDocumentStore } from '@/stores/documentStore';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface DocumentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  uploadTime: string;
}

const DocumentUpload: React.FC = () => {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

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
      uploading: { color: 'blue', icon: <ClockCircleOutlined />, text: '上传中' },
      processing: { color: 'orange', icon: <ClockCircleOutlined />, text: '处理中' },
      completed: { color: 'green', icon: <CheckCircleOutlined />, text: '已完成' },
      failed: { color: 'red', icon: <CloseCircleOutlined />, text: '失败' },
    };
    const config = statusMap[status];
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
        const newDoc: DocumentItem = {
          id: info.file.uid,
          name: info.file.name,
          size: info.file.size || 0,
          type: info.file.name.split('.').pop() || 'unknown',
          status: 'processing',
          progress: 100,
          uploadTime: new Date().toLocaleString(),
        };
        setDocuments([...documents, newDoc]);
        
        // Simulate processing
        setTimeout(() => {
          setDocuments(prev =>
            prev.map(doc =>
              doc.id === newDoc.id ? { ...doc, status: 'completed' } : doc
            )
          );
        }, 3000);
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
                      onClick={() => {
                        setSelectedDoc(item);
                        setPreviewVisible(true);
                      }}
                    />
                  </Tooltip>,
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setDocuments(documents.filter(doc => doc.id !== item.id));
                        message.success('文档已删除');
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
        width={800}
      >
        {selectedDoc && (
          <div className="space-y-4">
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
            {selectedDoc.status === 'completed' && (
              <div className="border-t pt-4">
                <Title level={5}>文档内容预览</Title>
                <Paragraph className="bg-white p-4 border rounded-lg">
                  这里将显示文档的处理结果和提取的内容...
                </Paragraph>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentUpload;