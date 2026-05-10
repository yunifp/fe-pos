// src/stores/printStore.ts
import { create } from 'zustand';
import api from '../api/api';

export const usePrintStore = create<any>((set) => ({
    getPrintPayload: async (orderId: string) => {
        try {
            const res = await api.get(`/orders/print/${orderId}`);
            return res.data; // Mengembalikan { order, receiptSetting }
        } catch (e) {
            console.error("Gagal mengambil data cetak", e);
            return null;
        }
    }
}));