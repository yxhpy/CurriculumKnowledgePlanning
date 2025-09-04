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
  Breadcrumb,
  Badge,
  Input,
  Divider,
  Typography,
  Alert,
} from 'antd';
import {
  DashboardOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  RobotOutlined,
  BookOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  SearchOutlined,
  QuestionCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Search } = Input;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
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
      key: 'document-group',
      icon: <FileTextOutlined />,
      label: '文档管理',
      children: [
        {
          key: '/upload',
          icon: <CloudUploadOutlined />,
          label: '文档上传',
          onClick: () => navigate('/upload'),
        },
        {
          key: '/documents',
          icon: <FileTextOutlined />,
          label: '文档管理',
          onClick: () => navigate('/documents'),
        },
      ],
    },
    {
      key: '/generate',
      icon: <RobotOutlined />,
      label: '课程生成',
      onClick: () => navigate('/generate'),
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

  const getBreadcrumbItems = () => {
    const pathname = location.pathname;
    const pathSegments = pathname.split('/').filter(Boolean);
    const items = [{ title: '首页', href: '/dashboard' }];
    
    // 路径名称映射
    const pathNameMap: Record<string, string> = {
      dashboard: '仪表盘',
      upload: '文档上传',
      documents: '文档管理',
      generate: '课程生成',
      courses: '课程管理',
      list: '课程列表',
      drafts: '草稿箱',
      edit: '编辑',
    };
    
    // 动态路由处理规则
    const getDynamicName = (segment: string, index: number, segments: string[]) => {
      // 如果是数字ID，根据上下文确定名称
      if (/^\d+$/.test(segment)) {
        const prevSegment = segments[index - 1];
        const nextSegment = segments[index + 1];
        
        switch (prevSegment) {
          case 'courses':
            return nextSegment === 'edit' ? '课程详情' : '课程详情';
          case 'documents':
            return nextSegment === 'edit' ? '文档详情' : '文档详情';
          case 'users':
            return nextSegment === 'edit' ? '用户详情' : '用户详情';
          default:
            return '详情';
        }
      }
      
      // 如果是已知路径，返回映射名称
      if (pathNameMap[segment]) {
        return pathNameMap[segment];
      }
      
      // 如果是未知路径，返回首字母大写的原始名称
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    };
    
    // 构建面包屑
    let cumulativePath = '';
    pathSegments.forEach((segment, index) => {
      cumulativePath += '/' + segment;
      const title = getDynamicName(segment, index, pathSegments);
      
      // 为非ID段添加链接
      const href = /^\d+$/.test(segment) || segment === 'edit' ? undefined : cumulativePath;
      
      items.push({ 
        title,
        href
      });
    });
    
    return items;
  };

  const notificationMenu: MenuProps['items'] = [
    {
      key: 'notification-1',
      label: (
        <div className="py-2">
          <div className="font-medium text-sm">系统更新通知</div>
          <div className="text-xs text-gray-500 mt-1">课程生成算法已优化，性能提升30%</div>
          <div className="text-xs text-gray-400 mt-1">2小时前</div>
        </div>
      ),
    },
    {
      key: 'notification-2',
      label: (
        <div className="py-2">
          <div className="font-medium text-sm">新功能发布</div>
          <div className="text-xs text-gray-500 mt-1">知识图谱可视化功能已上线</div>
          <div className="text-xs text-gray-400 mt-1">1天前</div>
        </div>
      ),
    },
    {
      key: 'notification-3',
      label: (
        <div className="py-2">
          <div className="font-medium text-sm">维护通知</div>
          <div className="text-xs text-gray-500 mt-1">系统将于今晚23:00-24:00进行例行维护</div>
          <div className="text-xs text-gray-400 mt-1">3天前</div>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'view-all',
      label: (
        <div className="text-center py-1">
          <span className="text-blue-500 text-sm">查看全部通知</span>
        </div>
      ),
    },
  ];

  const userMenu: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: (
        <div>
          <div className="font-medium">个人中心</div>
          <div className="text-xs text-gray-500">查看和编辑个人信息</div>
        </div>
      ),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: (
        <div>
          <div className="font-medium">系统设置</div>
          <div className="text-xs text-gray-500">配置系统参数</div>
        </div>
      ),
    },
    {
      key: 'language',
      icon: <GlobalOutlined />,
      label: (
        <div>
          <div className="font-medium">语言设置</div>
          <div className="text-xs text-gray-500">中文/English</div>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: '帮助中心',
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
      {/* Top Notification Banner */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1001 }}>
        <Alert
          message="系统通知"
          description="欢迎使用智能课程规划系统！当前版本已优化课程生成算法，提升了知识图谱构建效率。"
          type="info"
          showIcon
          closable
          banner
        />
      </div>
      <div style={{ height: '40px' }}></div>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="shadow-sm"
        theme="light"
        style={{ 
          background: '#fafafa'
        }}
      >
        <div className="h-16 flex items-center justify-center border-b" style={{ 
          borderBottom: '1px solid #e8e8e8',
          background: '#ffffff'
        }}>
          <div className="text-lg font-medium" style={{ color: '#1677ff' }}>
            {collapsed ? 'CKP' : '智能课程系统'}
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="border-r-0"
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: '8px'
          }}
          theme="light"
        />
      </Sider>
      <Layout>
        <Header
          style={{ 
            padding: 0, 
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            flex: 1, 
            padding: '0 24px',
            height: '100%'
          }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ 
                marginRight: '16px',
                color: '#666',
                fontSize: '16px',
                height: '32px',
                width: '32px'
              }}
            />
            
            <div style={{ 
              flex: 1, 
              maxWidth: '400px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div className="modern-search-bar">
                <input
                  type="text"
                  placeholder="搜索课程、文档或功能..."
                  className="modern-search-input"
                />
                <button className="modern-search-button" type="button">
                  <SearchOutlined className="modern-search-icon" />
                </button>
              </div>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0 24px',
            height: '100%'
          }}>
            <Dropdown
              menu={{ items: notificationMenu }}
              placement="bottomRight"
              trigger={['click']}
              open={notificationOpen}
              onOpenChange={setNotificationOpen}
              dropdownRender={(menu) => (
                <div style={{ 
                  minWidth: '320px',
                  maxWidth: '400px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ 
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    background: '#fafafa'
                  }}>
                    <div className="font-medium text-sm">通知中心</div>
                  </div>
                  {menu}
                </div>
              )}
            >
              <Badge count={3} size="small" style={{ marginRight: '16px' }}>
                <Button 
                  type="text" 
                  icon={<BellOutlined />} 
                  className="header-action-btn"
                  style={{ 
                    color: notificationOpen ? '#1677ff' : '#666', 
                    fontSize: '16px',
                    height: '32px',
                    width: '32px',
                    background: notificationOpen ? '#f0f6ff' : 'transparent'
                  }}
                />
              </Badge>
            </Dropdown>
            
            <Dropdown 
              menu={{ items: userMenu }} 
              placement="bottomRight"
              trigger={['click']}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: 'background-color 0.2s',
                height: '48px'
              }}
              className="user-dropdown-trigger">
                <Avatar 
                  icon={<UserOutlined />} 
                  style={{ backgroundColor: '#1677ff', marginRight: '8px' }}
                  size="small"
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.2 }}>管理员</Text>
                  <Text style={{ fontSize: '12px', color: '#999', lineHeight: 1.2 }}>admin@system.com</Text>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        
        {/* Breadcrumb Navigation */}
        <div 
          style={{ 
            background: colorBgContainer,
            padding: '12px 24px',
            borderBottom: '1px solid #f0f0f0',
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Breadcrumb 
            items={getBreadcrumbItems()}
            style={{ fontSize: '13px' }}
          />
        </div>
        <Content
          style={{
            margin: '24px',
            padding: '32px',
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