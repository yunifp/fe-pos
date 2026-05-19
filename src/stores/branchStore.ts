import { create } from 'zustand';
import api from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BranchState {
  branches: any[];
  selectedBranchId: string | null;
  isLoading: boolean;
  fetchBranches: () => Promise<void>;
  setSelectedBranchId: (id: string | null) => void;
  createBranch: (data: any) => Promise<void>;
  updateBranch: (id: string, data: any) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
}

export const useBranchStore = create<BranchState>((set, get) => ({
  branches: [],
  selectedBranchId: null,
  isLoading: false,

  fetchBranches: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/branches');
      const branchList = res.data.data || [];
      set({ branches: branchList, isLoading: false });

      // Sinkronisasi otomatis: Jika belum ada cabang terpilih, ambil cabang default user dari storage
      if (!get().selectedBranchId && branchList.length > 0) {
        const u = await AsyncStorage.getItem('user');
        if (u) {
          const parsed = JSON.parse(u);
          const userBranchId = parsed.branchId || parsed.branch?.id;
          set({ selectedBranchId: userBranchId || branchList[0].id });
        } else {
          set({ selectedBranchId: branchList[0].id });
        }
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  setSelectedBranchId: (id) => set({ selectedBranchId: id }),

  createBranch: async (data) => {
      await api.post('/branches', data);
      // PENTING: Panggil ulang fetch agar cabang baru langsung instan masuk ke pilihan seluruh screen
      await get().fetchBranches(); 
  },

  updateBranch: async (id, data) => {
      await api.put(`/branches/${id}`, data);
      await get().fetchBranches();
  },

  deleteBranch: async (id) => {
      await api.delete(`/branches/${id}`);
      set(state => {
        const updatedBranches = state.branches.filter(b => b.id !== id);
        const nextSelected = state.selectedBranchId === id 
          ? (updatedBranches[0]?.id || null) 
          : state.selectedBranchId;
        return { branches: updatedBranches, selectedBranchId: nextSelected };
      });
  }
}));