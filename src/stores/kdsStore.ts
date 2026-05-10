import { create } from 'zustand';
import api from '../api/api';

interface KDSState {
    queue: any[];
    isLoading: boolean;
    fetchQueue: (branchId: string) => Promise<void>;
    updateItemReady: (itemId: string, isReady: boolean) => Promise<void>;
    updateStatus: (orderId: string, status: string) => Promise<void>;
}

export const useKDSStore = create<KDSState>((set) => ({
    queue: [],
    isLoading: false,

    fetchQueue: async (branchId: string) => {
        if (!branchId) return;
        set({ isLoading: true });
        try {
            const res = await api.get(`/kds/queue`, { params: { branchId } });
            set({ queue: res.data });
        } catch (error) {
            console.error("Gagal fetch KDS:", error);
        } finally {
            set({ isLoading: false });
        }
    },

    updateItemReady: async (itemId: string, isReady: boolean) => {
        try {
            await api.post('/kds/item-ready', { itemId, isReady });
        } catch (error) {
            console.error("Error toggle item:", error);
            throw error;
        }
    },

    updateStatus: async (orderId: string, status: string) => {
        try {
            await api.post('/kds/status', { orderId, status });
        } catch (error) {
            console.error("Error update status:", error);
            throw error;
        }
    }
}));