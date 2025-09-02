import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import DocumentUpload from './pages/DocumentUpload';
import CourseGeneration from './pages/CourseGeneration';
import KnowledgeGraph from './pages/KnowledgeGraph';
import CourseDetail from './pages/CourseDetail';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#0ea5e9',
          borderRadius: 8,
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="upload" element={<DocumentUpload />} />
            <Route path="generate" element={<CourseGeneration />} />
            <Route path="knowledge-graph" element={<KnowledgeGraph />} />
            <Route path="course/:id" element={<CourseDetail />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;