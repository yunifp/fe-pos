import { create } from 'zustand';
import api from '../api/api';

interface CategoryState {
  categories: any[];
  isLoading: boolean;
  
  fetchCategories: () => Promise<void>;
  createCategory: (data: any) => Promise<void>;
  updateCategory: (id: number, data: any) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,

  fetchCategories: async () => {
    set({ isLoading: true });
    try {
      // Backend Kategori sekarang bersifat Global, tidak butuh branchId
      const res = await api.get('/categories');
      
      // PERBAIKAN: Harus menggunakan res.data.data sesuai format response backend
      set({ categories: res.data.data || [], isLoading: false });
    } catch (error: any) {
      console.error("Gagal fetch kategori", error);
      set({ isLoading: false });
      
      // Memberi notifikasi jika terkena 403 Forbidden
      if (error.response?.status === 403) {
          alert("Akses Ditolak (403): Pastikan Anda Login menggunakan akun Owner/Manager untuk mengakses master Kategori.");
      }
    }
  },

  createCategory: async (data) => {
      await api.post('/categories', data);
      await get().fetchCategories(); // Refresh list otomatis
  },

  updateCategory: async (id, data) => {
      await api.put(`/categories/${id}`, data);
      await get().fetchCategories(); // Refresh list otomatis
  },

  deleteCategory: async (id) => {
      await api.delete(`/categories/${id}`);
      await get().fetchCategories(); // Refresh list otomatis
  }
}));