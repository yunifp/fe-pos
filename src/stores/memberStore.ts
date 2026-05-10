import { create } from 'zustand';
import api from '../api/api';

interface MemberState {
    members: any[];
    isLoading: boolean;
    fetchMembers: (branchId?: string | null, search?: string) => Promise<void>;
    saveMember: (data: any) => Promise<void>;
    deleteMember: (id: string) => Promise<void>;
}

export const useMemberStore = create<MemberState>((set) => ({
    members: [],
    isLoading: false,

    fetchMembers: async (branchId, search) => {
        set({ isLoading: true });
        try {
            // Gunakan params sesuai controller: ?branchId=xxx&search=xxx
            const res = await api.get('/members', { 
                params: { branchId: branchId === 'all' ? undefined : branchId, search } 
            });
            set({ members: res.data, isLoading: false });
        } catch (e) {
            set({ members: [], isLoading: false });
        }
    },

    saveMember: async (data) => {
        if (data.id) {
            // Edit: Mengarah ke PUT /api/members/:id
            await api.put(`/members/${data.id}`, data);
        } else {
            // Tambah: Mengarah ke POST /api/members
            await api.post('/members', data);
        }
    },

    deleteMember: async (id) => {
        // Hapus: Mengarah ke DELETE /api/members/:id
        await api.delete(`/members/${id}`);
    }
}));