import { create } from 'zustand';
import api from '../api/api';

interface DistributionState {
  distributions: any[];
  isLoading: boolean;
  error: string | null;
  fetchDistributions: () => Promise<void>;
  createDistribution: (data: { sourceWarehouseId: string, destBranchId: string, notes?: string, items: { materialId: string, quantity: number }[] }) => Promise<void>;
  receiveDistribution: (id: string) => Promise<void>;
}

export const useDistributionStore = create<DistributionState>((set, get) => ({
  distributions: [],
  isLoading: false,
  error: null,

  fetchDistributions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/warehouses/distributions/all');
      set({ distributions: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal mengambil data distribusi', isLoading: false });
    }
  },

  createDistribution: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/warehouses/distributions', data);
      await get().fetchDistributions();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal membuat distribusi', isLoading: false });
      throw error;
    }
  },

  receiveDistribution: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/warehouses/distributions/${id}/receive`);
      await get().fetchDistributions();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal menerima distribusi', isLoading: false });
      throw error;
    }
  },
}));