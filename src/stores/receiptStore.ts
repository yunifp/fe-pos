import { create } from 'zustand';
import api from '../api/api';

export const useReceiptStore = create<any>((set, get) => ({
    setting: null,
    loading: false,

    fetchSetting: async (branchId: string) => {
        set({ loading: true });
        try {
            const res = await api.get(`/receipt-settings/${branchId}`);
            set({ setting: res.data, loading: false });
        } catch (e) { set({ loading: false }); }
    },

    updateSetting: async (branchId: string, payload: any) => {
        try {
            const res = await api.put(`/receipt-settings/${branchId}`, payload);
            set({ setting: res.data });
            return { success: true };
        } catch (e) { return { success: false }; }
    },

    uploadLogo: async (branchId: string, formData: FormData) => {
        try {
            // Gunakan instance axios Anda (api)
            const res = await api.post(`/receipt-settings/${branchId}/logo`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                // Jika tetap Network Error, coba hapus baris headers di atas 
                // agar axios yang menentukan sendiri boundary-nya
            });

            if (res.data.url) {
                const current = get().setting;
                set({ setting: { ...current, logoUrl: res.data.url } });
            }
            return { success: true, url: res.data.url };
        } catch (e: any) {
            // DEBUG: Lihat pesan error dari server jika ada
            const errorMsg = e.response?.data?.message || e.message;
            console.error("Upload failed store:", errorMsg);
            return { success: false, message: errorMsg };
        }
    }
}));