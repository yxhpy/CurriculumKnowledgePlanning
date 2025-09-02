import { create } from 'zustand';
import axios from 'axios';

interface Document {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: string;
  uploadTime: string;
  content?: string;
  metadata?: any;
}

interface DocumentStore {
  documents: Document[];
  loading: boolean;
  error: string | null;
  
  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  processDocument: (id: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  loading: false,
  error: null,
  
  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/v1/documents');
      set({ documents: response.data, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch documents', loading: false });
    }
  },
  
  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('/api/v1/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const newDoc = response.data;
      set((state) => ({
        documents: [...state.documents, newDoc],
      }));
    } catch (error) {
      set({ error: 'Failed to upload document' });
      throw error;
    }
  },
  
  deleteDocument: async (id: string) => {
    try {
      await axios.delete(`/api/v1/documents/${id}`);
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
      }));
    } catch (error) {
      set({ error: 'Failed to delete document' });
      throw error;
    }
  },
  
  processDocument: async (id: string) => {
    try {
      await axios.post(`/api/v1/documents/${id}/process`);
      // Update document status
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, status: 'processing' } : doc
        ),
      }));
    } catch (error) {
      set({ error: 'Failed to process document' });
      throw error;
    }
  },
}));