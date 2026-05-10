import { create } from 'zustand';
import api from '../api/api';

interface CategoryState {
  categories: any[];
  branches: any[];
  isLoading: boolean;
  
  fetchInitialData: () => Promise<void>;
  fetchCategories: (branchId?: string) => Promise<void>;
  createCategory: (data: any) => Promise<void>;
  updateCategory: (id: number, data: any) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  branches: [],
  isLoading: false,

  fetchInitialData: async () => {
      try {
          const res = await api.get('/branches');
          set({ branches: res.data });
      } catch (e) { console.error("Gagal load branches", e); }
  },

  fetchCategories: async (branchId) => {
    set({ isLoading: true });
    try {
      const params = branchId ? { branchId } : {}; 
      const res = await api.get('/categories', { params });
      set({ categories: res.data, isLoading: false });
    } catch (error) {
      console.error("Gagal fetch kategori", error);
      set({ isLoading: false });
    }
  },

  createCategory: async (data) => {
      await api.post('/categories', data);
  },

  updateCategory: async (id, data) => {
      // Pastikan ID dikonversi ke tipe yang benar jika perlu, tapi biasanya number aman
      await api.put(`/categories/${id}`, data);
  },

  deleteCategory: async (id) => {
      // 1. Panggil API
      await api.delete(`/categories/${id}`);
      
      // 2. [CRITICAL FIX] Update state lokal secara instan
      const currentCategories = get().categories;
      const updatedCategories = currentCategories.filter(c => c.id !== id);
      set({ categories: updatedCategories });
  }
}));