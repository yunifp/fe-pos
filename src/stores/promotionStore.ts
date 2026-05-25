import { create } from 'zustand';
import api from '../api/api';

interface PromotionState {
  promotions: any[];
  branches: any[];
  products: any[];
  isLoading: boolean;
  
  fetchInitialData: (branchId?: string) => Promise<void>;
  fetchPromotions: (branchId?: string) => Promise<void>;
  fetchPromotionsByType: (branchId?: string, type?: string) => Promise<void>;
  createPromotion: (data: any) => Promise<void>;
  updatePromotion: (id: string, data: any) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
}

export const usePromotionStore = create<PromotionState>((set, get) => ({
  promotions: [],
  branches: [],
  products: [],
  isLoading: false,

  fetchInitialData: async (branchId) => {
      try {
          const [branchRes, prodRes] = await Promise.all([
              api.get('/branches'),
              api.get('/products', { params: branchId ? { branchId } : {} })
          ]);
          // BACKEND MENGGUNAKAN .data.data
          set({ 
              branches: branchRes.data.data || [], 
              products: prodRes.data.data || [] 
          });
      } catch (e) { console.error("Error fetching initial data", e); }
  },

  fetchPromotions: async (branchId) => {
    set({ isLoading: true });
    try {
      const params = branchId ? { branchId } : {}; 
      const res = await api.get('/promotions', { params });
      // BACKEND MENGGUNAKAN .data.data
      set({ promotions: res.data.data || [], isLoading: false });
    } catch (error) {
      set({ isLoading: false, promotions: [] });
    }
  },

  fetchPromotionsByType: async (branchId?: string, type?: string) => {
    set({ isLoading: true });
    try {
      const params = branchId ? { branchId, type } : { type };
      const res = await api.get('/promotions/by-branch-and-type', { params });
      set({ promotions: res.data.data || [], isLoading: false });
    } catch (error) {
      set({ isLoading: false, promotions: [] });
    }
  },

  createPromotion: async (data) => {
      await api.post('/promotions', data);
      await get().fetchPromotions(); // REFRESH LIST OTOMATIS
  },

  updatePromotion: async (id, data) => {
      await api.put(`/promotions/${id}`, data);
      await get().fetchPromotions(); // REFRESH LIST OTOMATIS
  },

  deletePromotion: async (id) => {
      await api.delete(`/promotions/${id}`);
      set(state => ({ promotions: state.promotions.filter(p => p.id !== id) }));
  }
}));