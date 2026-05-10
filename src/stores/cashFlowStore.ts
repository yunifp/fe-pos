import { create } from 'zustand';
import api from '../api/api';
import { Platform } from 'react-native';

interface CashFlowState {
    cashFlows: any[];
    isLoading: boolean;
    fetchCashFlows: (params: { branchId?: string; startDate?: string; endDate?: string; type?: string }) => Promise<void>;
    saveCashFlow: (data: any) => Promise<void>;
    deleteCashFlow: (id: string) => Promise<void>;
}

export const useCashFlowStore = create<CashFlowState>((set) => ({
    cashFlows: [],
    isLoading: false,

    fetchCashFlows: async (params) => {
        set({ isLoading: true });
        try {
            // Mengirim branchId, startDate, endDate, dan type ke backend
            const res = await api.get('/cashflows', { params });
            set({ cashFlows: res.data, isLoading: false });
        } catch (e) {
            set({ cashFlows: [], isLoading: false });
        }
    },

    saveCashFlow: async (data) => {
        if (data.id) {
            if (data.receiptUrl) {
                if (Platform.OS === 'web') {
                    const response = await fetch(data.receiptUrl);
                    const blob = await response.blob();
                    data.append('image', blob, 'receipt.jpg');
                } else {
                    const uri = data.receiptUrl;
                    const filename = uri.split('/').pop() || 'receipt.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpeg`;
                    data.append('image', { uri, name: filename, type } as any);
                }
            }

            await api.put(`/cashflows/${data.id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

        } else {
            // Create jika tidak ada ID

            if (data.receiptUrl) {
                if (Platform.OS === 'web') {
                    const response = await fetch(data.receiptUrl);
                    const blob = await response.blob();
                    data.append('image', blob, 'receipt.jpg');
                } else {
                    const uri = data.receiptUrl;
                    const filename = uri.split('/').pop() || 'receipt.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpeg`;
                    data.append('image', { uri, name: filename, type } as any);
                }
            }

            await api.post('/cashflows', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

        }
    },

    deleteCashFlow: async (id) => {
        // Delete (Khusus Owner sesuai backend)
        await api.delete(`/cashflows/${id}`);
    }
}));