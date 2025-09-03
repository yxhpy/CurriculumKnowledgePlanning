import { create } from 'zustand';
import { documentAPI, courseAPI, DocumentStats, CourseStats } from '../services/api';

interface DashboardStats {
  documentStats: DocumentStats | null;
  courseStats: CourseStats | null;
}

interface DashboardStore {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  
  fetchStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  stats: {
    documentStats: null,
    courseStats: null,
  },
  loading: false,
  error: null,
  
  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const [documentStats, courseStats] = await Promise.all([
        documentAPI.getDocumentStats().catch(() => null),
        courseAPI.getCourseStats().catch(() => null),
      ]);
      
      set({ 
        stats: { documentStats, courseStats }, 
        loading: false 
      });
    } catch (error) {
      set({ 
        error: 'Failed to fetch dashboard statistics', 
        loading: false 
      });
    }
  },
  
  refreshStats: async () => {
    await get().fetchStats();
  },
}));