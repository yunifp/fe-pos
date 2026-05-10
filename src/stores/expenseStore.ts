import { create } from 'zustand';
import api from '../api/api';
import { Platform } from 'react-native';

// --- expenseStore.ts ---

export const useExpenseStore = create((set, get: any) => ({
    expenses: [],
    suggestions: [], // State baru untuk saran
    isLoading: false,

    // Action baru untuk mengambil saran dari backend
    fetchSuggestions: async () => {
        try {
            const res = await api.get('/expenses/keterangan');
            set({ suggestions: res.data });
        } catch (e) {
            console.error("Gagal load saran", e);
        }
    },

    addExpense: async (payload: any) => {
        const formData = new FormData();
        formData.append('branchId', payload.branchId);
        formData.append('amount', payload.amount.toString());
        formData.append('category', payload.category);
        formData.append('description', payload.description);
        formData.append('date', payload.date);
        formData.append('recordedBy', payload.recordedBy);
        formData.append('role', payload.role);
        // Tambahkan type agar backend tahu ini OPERATIONAL
        formData.append('type', 'OPERATIONAL');

        if (payload.receiptUrl) {
            if (Platform.OS === 'web') {
                const response = await fetch(payload.receiptUrl);
                const blob = await response.blob();
                formData.append('image', blob, 'receipt.jpg');
            } else {
                const uri = payload.receiptUrl;
                const filename = uri.split('/').pop() || 'receipt.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                formData.append('image', { uri, name: filename, type } as any);
            }
        }

        await api.post('/expenses', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        get().fetchExpenses(payload.branchId);
        get().fetchSuggestions(); // Refresh saran setelah input baru
    },

    // ... (updateExpense & fetchExpenses tetap sama)
    updateExpense: async (id: string, payload: any) => {
        const formData = new FormData();
        formData.append('amount', payload.amount.toString());
        formData.append('description', payload.description);
        formData.append('category', payload.category);
        formData.append('date', payload.date);
        formData.append('role', payload.role);
        formData.append('type', 'OPERATIONAL');

        if (payload.receiptUrl) {
            const isLocalUri = payload.receiptUrl.startsWith('file') || payload.receiptUrl.startsWith('content') || payload.receiptUrl.startsWith('blob');
            if (isLocalUri) {
                if (Platform.OS === 'web') {
                    const response = await fetch(payload.receiptUrl);
                    const blob = await response.blob();
                    formData.append('image', blob, 'receipt.jpg');
                } else {
                    const uri = payload.receiptUrl;
                    const filename = uri.split('/').pop() || 'receipt.jpg';
                    formData.append('image', { uri, name: filename, type: 'image/jpeg' } as any);
                }
            }
        }

        await api.put(`/expenses/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        get().fetchExpenses(payload.branchId);
    },

    fetchExpenses: async (branchId: string) => {
        set({ isLoading: true });
        const res = await api.get(`/expenses?branchId=${branchId}`);
        set({ expenses: res.data, isLoading: false });
    },

    // Contoh implementasi di expenseStore.ts
    removeExpense: async (id: string, branchId: string, role: string) => {
        set({ isLoading: true });
        try {
            // Mengirim role melalui query string sesuai permintaan backend (?role=...)
            await api.delete(`/expenses/${id}?role=${role}`);

            // Refresh data setelah hapus
            get().fetchExpenses(branchId);
        } catch (error) {
            throw error;
        } finally {
            set({ isLoading: false });
        }
    }
}));