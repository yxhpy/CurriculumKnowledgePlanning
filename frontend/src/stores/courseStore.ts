import { create } from 'zustand';
import { courseAPI, Course } from '../services/api';
import { ProgressUpdate, CompletionUpdate, ErrorUpdate } from '../hooks/useWebSocket';

interface CourseStore {
  courses: Course[];
  loading: boolean;
  error: string | null;
  generating: boolean;
  generationProgress: number;
  generationStep: string;
  generationMessage: string;
  currentTaskId: string | null;
  generatedCourseId: number | null;
  
  fetchCourses: () => Promise<void>;
  generateCourse: (data: {
    document_ids: number[];
    course_config: {
      name: string;
      level: string;
      audience: string;
      duration: string;
      mode: string;
    };
  }) => Promise<void>;
  setGenerationProgress: (progress: number) => void;
  handleProgressUpdate: (update: ProgressUpdate) => void;
  handleCompletionUpdate: (update: CompletionUpdate) => void;
  handleErrorUpdate: (update: ErrorUpdate) => void;
  resetGenerationState: () => void;
}

export const useCourseStore = create<CourseStore>((set, get) => ({
  courses: [],
  loading: false,
  error: null,
  generating: false,
  generationProgress: 0,
  generationStep: '',
  generationMessage: '',
  currentTaskId: null,
  generatedCourseId: null,
  
  fetchCourses: async () => {
    set({ loading: true, error: null });
    try {
      const courses = await courseAPI.getCourses();
      set({ courses, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch courses', loading: false });
    }
  },
  
  generateCourse: async (data) => {
    set({ 
      generating: true, 
      generationProgress: 0, 
      error: null,
      generationStep: 'initializing',
      generationMessage: '正在初始化课程生成...',
      currentTaskId: null,
      generatedCourseId: null
    });
    
    try {
      const result = await courseAPI.generateCourse(data);
      // 从API结果中提取task_id
      const taskId = result.task_id;
      set({ currentTaskId: taskId });
      
      // WebSocket连接将在组件中使用taskId建立
      // 不再使用模拟进度更新
      
    } catch (error) {
      set({ 
        error: 'Failed to start course generation', 
        generating: false,
        generationStep: 'error',
        generationMessage: '课程生成启动失败'
      });
    }
  },
  
  setGenerationProgress: (progress: number) => {
    set({ generationProgress: progress });
  },
  
  handleProgressUpdate: (update: ProgressUpdate) => {
    set({
      generationProgress: update.progress,
      generationStep: update.step,
      generationMessage: update.message
    });
  },
  
  handleCompletionUpdate: (update: CompletionUpdate) => {
    if (update.success) {
      set({
        generating: false,
        generationProgress: 100,
        generationStep: 'completed',
        generationMessage: update.message,
        generatedCourseId: update.course_id || null,
        error: null
      });
    } else {
      set({
        generating: false,
        generationStep: 'failed',
        generationMessage: update.message,
        error: update.message
      });
    }
  },
  
  handleErrorUpdate: (update: ErrorUpdate) => {
    set({
      error: update.message,
      generationStep: 'error',
      generationMessage: update.message
    });
  },
  
  resetGenerationState: () => {
    set({
      generating: false,
      generationProgress: 0,
      generationStep: '',
      generationMessage: '',
      currentTaskId: null,
      generatedCourseId: null,
      error: null
    });
  },
}));