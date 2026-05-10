import { create } from 'zustand';
import api from '../api/api';

export const useFinancialStore = create<any>((set, get) => ({
    data: null,
    loading: false,
    filters: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        branchId: 'all'
    },
    setFilter: (key: string, val: any) => set((s: any) => ({ filters: { ...s.filters, [key]: val } })),
    fetchFinancialReport: async () => {
        set({ loading: true });
        try {
            const res = await api.get('/financials/report', { params: get().filters });
            set({ data: res.data, loading: false });
        } catch (e) { set({ loading: false }); }
    }
}));