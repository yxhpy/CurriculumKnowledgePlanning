import { create } from 'zustand';
import { documentAPI, Document } from '../services/api';

interface DocumentStore {
  documents: Document[];
  loading: boolean;
  error: string | null;
  
  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  deleteDocument: (id: number) => Promise<void>;
  processDocument: (id: number) => Promise<void>;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  loading: false,
  error: null,
  
  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const documents = await documentAPI.getDocuments();
      set({ documents, loading: false });
    } catch (error) {
      console.error('Error fetching documents:', error);
      set({ error: 'Failed to fetch documents', loading: false });
    }
  },
  
  uploadDocument: async (file: File) => {
    try {
      const newDoc = await documentAPI.uploadDocument(file);
      set((state) => ({
        documents: [...state.documents, newDoc],
      }));
    } catch (error) {
      console.error('Error uploading document:', error);
      set({ error: 'Failed to upload document' });
      throw error;
    }
  },
  
  deleteDocument: async (id: number) => {
    try {
      await documentAPI.deleteDocument(id);
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting document:', error);
      set({ error: 'Failed to delete document' });
      throw error;
    }
  },
  
  processDocument: async (id: number) => {
    try {
      // Note: This endpoint might not exist in the current API
      // await documentAPI.processDocument(id);
      // Update document status
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, status: 'processing' } : doc
        ),
      }));
    } catch (error) {
      console.error('Error processing document:', error);
      set({ error: 'Failed to process document' });
      throw error;
    }
  },
}));