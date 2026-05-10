import { create } from 'zustand';
import api from '../api/api';

interface OrderHistoryState {
    orders: any[];
    stats: any;
    pendingRefundIds: string[];
    isLoading: boolean;
    fetchHistory: (branchId: string, range: string) => Promise<void>;
    requestRefund: (orderId: string, reason: string, userId: string) => Promise<void>;
    handleRefund: (orderId: string, action: 'APPROVE' | 'REJECT', managerId: string) => Promise<void>;
}

export const useOrderHistoryStore = create<OrderHistoryState>((set, get) => ({
    orders: [],
    stats: { totalOmzet: 0, totalCount: 0, paidCount: 0, unpaidCount: 0, refundPendingCount: 0, refundedCount: 0 },
    pendingRefundIds: [],
    isLoading: false,

    fetchHistory: async (branchId, range) => {
        set({ isLoading: true });
        try {
            const res = await api.get('/orders-history', { params: { branchId, range } });
            set({ orders: res.data.orders, stats: res.data.stats });
        } catch (error) {
            console.error(error);
        } finally {
            set({ isLoading: false });
        }
    },

    requestRefund: async (orderId, reason, userId) => {
        await api.post('/orders-history/refund-request', { orderId, reason, userId });
    },

    handleRefund: async (orderId, action, managerId) => {
        await api.post('/orders-history/refund-handle', { orderId, action, managerId });
    }
}));