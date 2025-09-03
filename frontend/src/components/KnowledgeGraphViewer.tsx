import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Space, Switch, Select, Typography, Tooltip, Drawer, message, Empty, Spin } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import axios from 'axios';
import 'vis-network/styles/vis-network.css';

const { Title, Text, Paragraph } = Typography;

interface Node {
  id: string;
  label: string;
  type: string;
  level: number;
  description?: string;
}

interface Edge {
  from: string;
  to: string;
  label?: string;
  type: string;
}

interface KnowledgeGraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    level?: number;
    description?: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    relationship: string;
    label?: string;
  }>;
}

interface KnowledgeGraphViewerProps {
  courseId: number;
  height?: number;
  onGenerate?: () => void;
}

const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({ 
  courseId, 
  height = 400,
  onGenerate 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [physics, setPhysics] = useState(true);
  const [hierarchical, setHierarchical] = useState(true);
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchKnowledgeGraph();
  }, [courseId]);

  useEffect(() => {
    if (graphData && containerRef.current) {
      renderGraph();
    }
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [graphData, physics, hierarchical]);

  const fetchKnowledgeGraph = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/knowledge-graph/${courseId}`);
      if (response.data && response.data.nodes && response.data.nodes.length > 0) {
        setGraphData(response.data);
      } else {
        setGraphData(null);
      }
    } catch (error) {
      console.error('Failed to fetch knowledge graph:', error);
      setGraphData(null);
    } finally {
      setLoading(false);
    }
  };

  const generateKnowledgeGraph = async () => {
    try {
      setGenerating(true);
      const response = await axios.post(`/api/v1/knowledge-graph/${courseId}/generate`);
      if (response.data) {
        setGraphData(response.data);
        message.success('知识图谱生成成功！');
        if (onGenerate) {
          onGenerate();
        }
      }
    } catch (error) {
      console.error('Failed to generate knowledge graph:', error);
      message.error('知识图谱生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const renderGraph = () => {
    if (!graphData || !containerRef.current) return;

    // Convert data to vis-network format
    const nodes = new DataSet(
      graphData.nodes.map(node => ({
        id: node.id,
        label: node.label,
        group: node.type,
        level: node.level || 0,
        title: node.description || node.label,
      }))
    );

    const edges = new DataSet(
      graphData.edges.map(edge => ({
        from: edge.from,
        to: edge.to,
        label: edge.label || edge.relationship,
        type: edge.relationship,
        color: edge.relationship === 'prerequisite' ? { color: '#ff9800' } : 
               edge.relationship === 'dependency' ? { color: '#9c27b0' } : undefined,
        dashes: edge.relationship !== 'contains',
      }))
    );

    const options = {
      nodes: {
        shape: 'dot',
        font: {
          size: 12,
          face: 'Microsoft YaHei',
        },
        borderWidth: 2,
        shadow: true,
        scaling: {
          min: 10,
          max: 30,
        },
      },
      edges: {
        width: 2,
        shadow: true,
        smooth: {
          type: 'cubicBezier',
          forceDirection: hierarchical ? 'vertical' : 'none',
          roundness: 0.4,
        },
        font: {
          size: 10,
          align: 'middle',
          face: 'Microsoft YaHei',
        },
      },
      groups: {
        course: {
          color: { background: '#0ea5e9', border: '#0284c7' },
          size: 25,
          font: { color: 'white', size: 14, bold: true },
        },
        chapter: {
          color: { background: '#22c55e', border: '#16a34a' },
          size: 20,
          font: { color: 'white', size: 12 },
        },
        topic: {
          color: { background: '#f59e0b', border: '#d97706' },
          size: 15,
        },
        concept: {
          color: { background: '#8b5cf6', border: '#7c3aed' },
          size: 12,
        },
      },
      physics: {
        enabled: physics,
        barnesHut: {
          gravitationalConstant: -8000,
          springConstant: 0.001,
          springLength: 200,
        },
      },
      layout: hierarchical ? {
        hierarchical: {
          direction: 'UD',
          sortMethod: 'directed',
          levelSeparation: 100,
          nodeSpacing: 100,
          treeSpacing: 200,
        },
      } : {},
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
      },
    };

    const network = new Network(
      containerRef.current,
      { nodes, edges },
      options
    );

    network.on('selectNode', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const nodeData = nodes.get(nodeId);
        const originalNode = graphData.nodes.find(n => n.id === nodeId);
        setSelectedNode({
          id: nodeId,
          label: nodeData.label,
          type: nodeData.group,
          level: nodeData.level,
          description: originalNode?.description || `这是${nodeData.label}的详细描述信息`,
        });
        setDrawerVisible(true);
      }
    });

    networkRef.current = network;
  };

  const handleZoomIn = () => {
    networkRef.current?.moveTo({ scale: networkRef.current.getScale() * 1.2 });
  };

  const handleZoomOut = () => {
    networkRef.current?.moveTo({ scale: networkRef.current.getScale() * 0.8 });
  };

  const handleReset = () => {
    networkRef.current?.fit();
  };

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen();
  };

  if (loading) {
    return (
      <Card className="h-full">
        <div className="flex justify-center items-center" style={{ height }}>
          <Spin size="large" tip="加载知识图谱中..." />
        </div>
      </Card>
    );
  }

  if (!graphData) {
    return (
      <Card className="h-full" title="知识图谱">
        <div className="flex flex-col justify-center items-center" style={{ height }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                暂无知识图谱数据
                <br />
                <Text type="secondary">点击下方按钮智能生成知识图谱</Text>
              </span>
            }
          >
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={generating}
              onClick={generateKnowledgeGraph}
              size="large"
            >
              智能生成知识图谱
            </Button>
          </Empty>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="h-full"
      title="知识图谱"
      extra={
        <Space>
          <Tooltip title="重新生成">
            <Button
              icon={<ThunderboltOutlined />}
              loading={generating}
              onClick={generateKnowledgeGraph}
              size="small"
            >
              重新生成
            </Button>
          </Tooltip>
          <Tooltip title="物理引擎">
            <Switch
              checked={physics}
              onChange={setPhysics}
              size="small"
            />
          </Tooltip>
          <Tooltip title="层次布局">
            <Switch
              checked={hierarchical}
              onChange={setHierarchical}
              size="small"
            />
          </Tooltip>
        </Space>
      }
      bodyStyle={{ padding: '8px', position: 'relative' }}
    >
      <div className="absolute top-2 right-2 z-10 bg-white rounded shadow-sm p-1">
        <Space size="small">
          <Tooltip title="放大" placement="bottom">
            <Button size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
          </Tooltip>
          <Tooltip title="缩小" placement="bottom">
            <Button size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
          </Tooltip>
          <Tooltip title="重置" placement="bottom">
            <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} />
          </Tooltip>
          <Tooltip title="全屏" placement="bottom">
            <Button size="small" icon={<FullscreenOutlined />} onClick={handleFullscreen} />
          </Tooltip>
          <Tooltip title="设置" placement="bottom">
            <Button size="small" icon={<SettingOutlined />} onClick={() => setDrawerVisible(true)} />
          </Tooltip>
        </Space>
      </div>

      <div ref={containerRef} style={{ height, width: '100%' }} />

      <div className="pt-2 border-t mt-2">
        <Space size="large">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-1" />
            <Text type="secondary" style={{ fontSize: '12px' }}>课程</Text>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1" />
            <Text type="secondary" style={{ fontSize: '12px' }}>章节</Text>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-amber-500 rounded-full mr-1" />
            <Text type="secondary" style={{ fontSize: '12px' }}>知识点</Text>
          </div>
          <div className="flex items-center">
            <div className="w-6 border-t border-solid border-gray-400 mr-1" />
            <Text type="secondary" style={{ fontSize: '12px' }}>包含</Text>
          </div>
          <div className="flex items-center">
            <div className="w-6 border-t border-dashed border-orange-500 mr-1" />
            <Text type="secondary" style={{ fontSize: '12px' }}>依赖</Text>
          </div>
        </Space>
      </div>

      <Drawer
        title="节点详情"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={300}
      >
        {selectedNode && (
          <div className="space-y-4">
            <div>
              <Text type="secondary">节点名称</Text>
              <Title level={5}>{selectedNode.label}</Title>
            </div>
            <div>
              <Text type="secondary">节点类型</Text>
              <Paragraph>{selectedNode.type}</Paragraph>
            </div>
            <div>
              <Text type="secondary">层级</Text>
              <Paragraph>第 {selectedNode.level} 层</Paragraph>
            </div>
            <div>
              <Text type="secondary">描述</Text>
              <Paragraph>{selectedNode.description}</Paragraph>
            </div>
          </div>
        )}
      </Drawer>
    </Card>
  );
};

export default KnowledgeGraphViewer;