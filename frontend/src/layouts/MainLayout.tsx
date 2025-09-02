import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Space,
  theme,
} from 'antd';
import {
  DashboardOutlined,
  CloudUploadOutlined,
  RobotOutlined,
  DeploymentUnitOutlined,
  BookOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: '/upload',
      icon: <CloudUploadOutlined />,
      label: '文档上传',
      onClick: () => navigate('/upload'),
    },
    {
      key: '/generate',
      icon: <RobotOutlined />,
      label: '课程生成',
      onClick: () => navigate('/generate'),
    },
    {
      key: '/knowledge-graph',
      icon: <DeploymentUnitOutlined />,
      label: '知识图谱',
      onClick: () => navigate('/knowledge-graph'),
    },
    {
      key: '/courses',
      icon: <BookOutlined />,
      label: '课程管理',
      children: [
        {
          key: '/courses/list',
          label: '课程列表',
          onClick: () => navigate('/courses'),
        },
        {
          key: '/courses/drafts',
          label: '草稿箱',
          onClick: () => navigate('/courses/drafts'),
        },
      ],
    },
  ];

  const userMenu: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="shadow-lg"
        theme="light"
      >
        <div className="h-16 flex items-center justify-center border-b">
          <div className="text-xl font-bold text-primary-600">
            {collapsed ? 'CKP' : '智能课程系统'}
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="border-r-0"
        />
      </Sider>
      <Layout>
        <Header
          className="bg-white px-6 flex items-center justify-between shadow-sm"
          style={{ padding: 0, background: colorBgContainer }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg"
          />
          <Space size="middle">
            <Dropdown menu={{ items: userMenu }} placement="bottomRight">
              <Space className="cursor-pointer">
                <Avatar icon={<UserOutlined />} />
                <span>管理员</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          className="m-6"
          style={{
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;