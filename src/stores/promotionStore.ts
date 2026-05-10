import { create } from 'zustand';
import api from '../api/api';

interface PromotionState {
  promotions: any[];
  branches: any[];
  products: any[]; // Untuk selector produk saat buat promo
  isLoading: boolean;
  
  fetchInitialData: (branchId?: string) => Promise<void>;
  fetchPromotions: (branchId?: string) => Promise<void>;
  fetchPromotionsByType: (branchId?: string, type?: string) => Promise<void>;
  createPromotion: (data: any) => Promise<void>;
  updatePromotion: (id: string, data: any) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
}

export const usePromotionStore = create<PromotionState>((set) => ({
  promotions: [],
  branches: [],
  products: [],
  isLoading: false,

  fetchInitialData: async (branchId) => {
      try {
          // Ambil Cabang & Produk (Untuk pilihan target promo)
          const [branchRes, prodRes] = await Promise.all([
              api.get('/branches'),
              api.get('/products', { params: branchId ? { branchId } : {} })
          ]);
          set({ branches: branchRes.data, products: prodRes.data });
      } catch (e) { console.error(e); }
  },

  fetchPromotions: async (branchId) => {
    set({ isLoading: true });
    try {
      const params = branchId ? { branchId } : {}; 
      const res = await api.get('/promotions', { params });
      set({ promotions: res.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  // fech by branch id & type
  fetchPromotionsByType: async (branchId?: string, type?: string) => {
    set({ isLoading: true });
    try {
      const params = branchId ? { branchId, type } : { type };
      const res = await api.get('/promotions/by-branch-and-type', { params });
      set({ promotions: res.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  createPromotion: async (data) => {
      await api.post('/promotions', data);
  },

  updatePromotion: async (id, data) => {
      await api.put(`/promotions/${id}`, data);
  },

  deletePromotion: async (id) => {
      await api.delete(`/promotions/${id}`);
      set(state => ({ promotions: state.promotions.filter(p => p.id !== id) }));
  }
}));