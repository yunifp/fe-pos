import { create } from 'zustand';
import api from '../api/api';

export const useInventoryStore = create<any>((set, get) => ({
    products: [],
    loading: false,
    
    // State History Pagination
    historyLogs: [],
    loadingHistory: false, // Loading awal (spinner besar)
    loadingMoreHistory: false, // Loading saat scroll bawah
    historyPage: 1,
    historyHasMore: true,

    // Fetch Products
    fetchInventory: async (branchId?: string, search?: string) => {
        set({ loading: true });
        try {
            const params: any = {};
            if (branchId) params.branchId = branchId;
            if (search) params.search = search;

            const res = await api.get('/inventory', { params });
            set({ products: res.data, loading: false });
        } catch (error) {
            console.error(error);
            set({ loading: false });
        }
    },

    // Adjust Stock Action
    adjustStock: async (payload: any) => {
        try {
            await api.post('/inventory/adjust', payload);
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.message || 'Gagal' };
        }
    },

    // Fetch History (Support Pagination)
    fetchHistory: async (branchId: string, variantId: number, page = 1) => {
        if (page === 1) {
            set({ loadingHistory: true, historyLogs: [], historyHasMore: true, historyPage: 1 });
        } else {
            set({ loadingMoreHistory: true });
        }

        try {
            const res = await api.get('/inventory/history', { 
                params: { branchId, variantId, page, limit: 15 } 
            });

            const newData = res.data.data;
            const meta = res.data.meta;

            set((state: any) => ({
                historyLogs: page === 1 ? newData : [...state.historyLogs, ...newData],
                historyPage: meta.page,
                historyHasMore: meta.page < meta.lastPage,
                loadingHistory: false,
                loadingMoreHistory: false
            }));
        } catch (error) {
            set({ loadingHistory: false, loadingMoreHistory: false });
        }
    },

    // Helper untuk Load More
    loadMoreHistory: (branchId: string, variantId: number) => {
        const { historyPage, historyHasMore, loadingMoreHistory } = get();
        if (historyHasMore && !loadingMoreHistory) {
            get().fetchHistory(branchId, variantId, historyPage + 1);
        }
    }
}));