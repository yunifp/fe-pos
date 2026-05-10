import { create } from 'zustand';
import api from '../api/api';

interface SalesState {
  reportData: any | null;
  isLoading: boolean;
  filters: {
    startDate: string;
    endDate: string;
    orderType: string;
    paymentMethod: string;
    branchId: string; // Tambahkan ini
    search: string;
    status?: string;
    paymentStatus?: string;
  };
  setFilter: (key: string, value: string) => void;
  fetchReport: (branchId?: string) => Promise<void>;
}

export const useSalesStore = create<SalesState>((set, get) => ({
  reportData: null,
  isLoading: false,
  filters: {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    orderType: 'ALL',
    paymentMethod: 'ALL',
    branchId: 'all', // Default ke 'all' untuk Owner
    search: '',
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }));
  },

  fetchReport: async (selectedBranchId) => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      const params = { 
        ...filters, 
        // Jika parameter fungsi ada (manager), gunakan itu. Jika tidak, gunakan dari filter state (owner)
        branchId: selectedBranchId || filters.branchId,
        search: filters.search || undefined,
        orderType: filters.orderType === 'ALL' ? undefined : filters.orderType,
        paymentMethod: filters.paymentMethod === 'ALL' ? undefined : filters.paymentMethod
      };
      const res = await api.get('/sales/reports', { params });
      set({ reportData: res.data, isLoading: false });
    } catch (error) {
      console.error("Gagal mengambil laporan penjualan:", error);
      set({ isLoading: false });
    }
  }
}));