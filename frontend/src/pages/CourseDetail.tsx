import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const CourseDetail: React.FC = () => {
  const { id } = useParams();
  
  return (
    <div className="space-y-6">
      <Title level={2}>课程详情</Title>
      <Card>
        <p>课程ID: {id}</p>
        <p>课程详情页面 - 待实现</p>
      </Card>
    </div>
  );
};

export default CourseDetail;