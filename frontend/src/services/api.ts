import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// 文档接口
export interface Document {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  created_at: string;
  processed_content?: string;
  metadata?: any;
}

export interface DocumentStats {
  total_documents: number;
  processed_documents: number;
  failed_documents: number;
  total_size: number;
  file_type_distribution: Array<{ type: string; count: number }>;
}

// 课程接口
export interface Course {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  document_count: number;
  chapters: number;
}

export interface CourseStats {
  total_courses: number;
  published_courses: number;
  draft_courses: number;
}

// API函数
export const documentAPI = {
  // 获取文档列表
  async getDocuments(): Promise<Document[]> {
    const response = await api.get('/documents/');
    return response.data;
  },

  // 获取文档统计
  async getDocumentStats(): Promise<DocumentStats> {
    const response = await api.get('/documents/stats');
    return response.data;
  },

  // 上传文档
  async uploadDocument(file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // 删除文档
  async deleteDocument(id: number): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  // 获取单个文档
  async getDocument(id: number): Promise<Document> {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },
};

export const courseAPI = {
  // 获取课程列表
  async getCourses(): Promise<Course[]> {
    const response = await api.get('/courses/');
    return response.data;
  },

  // 获取课程统计
  async getCourseStats(): Promise<CourseStats> {
    const response = await api.get('/courses/stats');
    return response.data;
  },

  // 生成课程
  async generateCourse(data: {
    document_ids: number[];
    course_config: {
      name: string;
      level: string;
      audience: string;
      duration: string;
      mode: string;
    };
  }): Promise<{ message: string; task_id: string }> {
    const response = await api.post('/courses/generate', data);
    return response.data;
  },

  // 获取单个课程
  async getCourse(id: number): Promise<Course> {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  },

  // 删除课程
  async deleteCourse(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/courses/${id}`);
    return response.data;
  },

  // 获取课程详细信息（包含章节、小节、知识点）
  async getCourseDetail(id: number): Promise<any> {
    const response = await api.get(`/courses/${id}/detail`);
    return response.data;
  },

  // 更新课程信息
  async updateCourse(id: number, data: any): Promise<any> {
    const response = await api.put(`/courses/${id}`, data);
    return response.data;
  },

  // 更新章节信息
  async updateChapter(courseId: number, chapterId: number, data: any): Promise<any> {
    const response = await api.put(`/courses/${courseId}/chapters/${chapterId}`, data);
    return response.data;
  },

  // 更新小节信息
  async updateSection(courseId: number, chapterId: number, sectionId: number, data: any): Promise<any> {
    const response = await api.put(`/courses/${courseId}/chapters/${chapterId}/sections/${sectionId}`, data);
    return response.data;
  },

  // 更新知识点信息
  async updateKnowledgePoint(courseId: number, chapterId: number, sectionId: number, pointId: number, data: any): Promise<any> {
    const response = await api.put(`/courses/${courseId}/chapters/${chapterId}/sections/${sectionId}/knowledge-points/${pointId}`, data);
    return response.data;
  },
};

export default api;