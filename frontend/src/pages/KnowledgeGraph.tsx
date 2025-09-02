import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Space, Slider, Switch, Select, Typography, Tooltip, Drawer } from 'antd';
import {
  FullscreenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
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

const KnowledgeGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [physics, setPhysics] = useState(true);
  const [hierarchical, setHierarchical] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Sample data - replace with actual data from API
    const nodes = new DataSet<any>([
      { id: '1', label: 'Python数据分析', group: 'course', level: 0, size: 30 },
      { id: '2', label: '第1章 Python基础', group: 'chapter', level: 1 },
      { id: '3', label: '第2章 NumPy数组', group: 'chapter', level: 1 },
      { id: '4', label: '第3章 Pandas处理', group: 'chapter', level: 1 },
      { id: '5', label: '第4章 数据可视化', group: 'chapter', level: 1 },
      { id: '6', label: '变量与数据类型', group: 'topic', level: 2 },
      { id: '7', label: '控制流程', group: 'topic', level: 2 },
      { id: '8', label: '函数定义', group: 'topic', level: 2 },
      { id: '9', label: '数组创建', group: 'topic', level: 2 },
      { id: '10', label: '数组运算', group: 'topic', level: 2 },
      { id: '11', label: 'DataFrame操作', group: 'topic', level: 2 },
      { id: '12', label: '数据清洗', group: 'topic', level: 2 },
      { id: '13', label: 'Matplotlib绘图', group: 'topic', level: 2 },
      { id: '14', label: 'Seaborn高级图表', group: 'topic', level: 2 },
    ]);

    const edges = new DataSet<any>([
      { from: '1', to: '2', label: '包含' },
      { from: '1', to: '3', label: '包含' },
      { from: '1', to: '4', label: '包含' },
      { from: '1', to: '5', label: '包含' },
      { from: '2', to: '6', label: '包含' },
      { from: '2', to: '7', label: '包含' },
      { from: '2', to: '8', label: '包含' },
      { from: '3', to: '9', label: '包含' },
      { from: '3', to: '10', label: '包含' },
      { from: '4', to: '11', label: '包含' },
      { from: '4', to: '12', label: '包含' },
      { from: '5', to: '13', label: '包含' },
      { from: '5', to: '14', label: '包含' },
      { from: '7', to: '8', label: '前置', dashes: true, color: { color: '#ff9800' } },
      { from: '9', to: '10', label: '前置', dashes: true, color: { color: '#ff9800' } },
      { from: '3', to: '11', label: '依赖', dashes: true, color: { color: '#9c27b0' } },
    ]);

    const options = {
      nodes: {
        shape: 'dot',
        font: {
          size: 14,
          face: 'Microsoft YaHei',
        },
        borderWidth: 2,
        shadow: true,
      },
      edges: {
        width: 2,
        shadow: true,
        smooth: {
          type: 'cubicBezier',
        },
        font: {
          size: 12,
          align: 'middle',
          face: 'Microsoft YaHei',
        },
      },
      groups: {
        course: {
          color: { background: '#0ea5e9', border: '#0284c7' },
          size: 35,
          font: { color: 'white', size: 16, bold: true },
        },
        chapter: {
          color: { background: '#22c55e', border: '#16a34a' },
          size: 25,
          font: { color: 'white' },
        },
        topic: {
          color: { background: '#f59e0b', border: '#d97706' },
          size: 20,
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
          levelSeparation: 150,
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
        const node = nodes.get(nodeId);
        setSelectedNode({
          id: nodeId,
          label: node.label,
          type: node.group,
          level: node.level,
          description: `这是${node.label}的详细描述信息`,
        });
        setDrawerVisible(true);
      }
    });

    networkRef.current = network;

    return () => {
      network.destroy();
    };
  }, [physics, hierarchical]);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Title level={2}>知识图谱可视化</Title>
        <Space>
          <Tooltip title="物理引擎">
            <Switch
              checked={physics}
              onChange={setPhysics}
              checkedChildren="动态"
              unCheckedChildren="静态"
            />
          </Tooltip>
          <Tooltip title="层次布局">
            <Switch
              checked={hierarchical}
              onChange={setHierarchical}
              checkedChildren="层次"
              unCheckedChildren="自由"
            />
          </Tooltip>
          <Select
            defaultValue="all"
            style={{ width: 120 }}
            options={[
              { value: 'all', label: '全部节点' },
              { value: 'chapter', label: '仅章节' },
              { value: 'topic', label: '仅知识点' },
            ]}
          />
        </Space>
      </div>

      <Card
        className="shadow-lg"
        bodyStyle={{ padding: 0, position: 'relative' }}
      >
        <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-md p-2">
          <Space direction="vertical">
            <Tooltip title="放大" placement="left">
              <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} />
            </Tooltip>
            <Tooltip title="缩小" placement="left">
              <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
            </Tooltip>
            <Tooltip title="重置" placement="left">
              <Button icon={<ReloadOutlined />} onClick={handleReset} />
            </Tooltip>
            <Tooltip title="全屏" placement="left">
              <Button icon={<FullscreenOutlined />} onClick={handleFullscreen} />
            </Tooltip>
            <Tooltip title="设置" placement="left">
              <Button icon={<SettingOutlined />} onClick={() => setDrawerVisible(true)} />
            </Tooltip>
          </Space>
        </div>

        <div ref={containerRef} style={{ height: '600px', width: '100%' }} />

        <div className="p-4 border-t">
          <Space size="large">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-2" />
              <Text>课程</Text>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2" />
              <Text>章节</Text>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-amber-500 rounded-full mr-2" />
              <Text>知识点</Text>
            </div>
            <div className="flex items-center">
              <div className="w-8 border-t-2 border-solid border-gray-400 mr-2" />
              <Text>包含关系</Text>
            </div>
            <div className="flex items-center">
              <div className="w-8 border-t-2 border-dashed border-orange-500 mr-2" />
              <Text>前置依赖</Text>
            </div>
          </Space>
        </div>
      </Card>

      <Drawer
        title="节点详情"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={400}
      >
        {selectedNode && (
          <div className="space-y-4">
            <div>
              <Text type="secondary">节点名称</Text>
              <Title level={4}>{selectedNode.label}</Title>
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
            <div className="pt-4 border-t">
              <Title level={5}>相关操作</Title>
              <Space direction="vertical" className="w-full">
                <Button type="primary" block>编辑节点</Button>
                <Button block>查看详细内容</Button>
                <Button block>生成学习路径</Button>
                <Button danger block>删除节点</Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default KnowledgeGraph;