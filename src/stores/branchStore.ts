import { create } from 'zustand';
import api from '../api/api';

interface BranchState {
  branches: any[];
  isLoading: boolean;
  fetchBranches: () => Promise<void>;
  createBranch: (data: any) => Promise<void>;
  updateBranch: (id: string, data: any) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
}

export const useBranchStore = create<BranchState>((set) => ({
  branches: [],
  isLoading: false,

  fetchBranches: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/branches');
      set({ branches: res.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  createBranch: async (data) => {
      await api.post('/branches', data);
  },

  updateBranch: async (id, data) => {
      await api.put(`/branches/${id}`, data);
  },

  deleteBranch: async (id) => {
      await api.delete(`/branches/${id}`);
      set(state => ({ branches: state.branches.filter(b => b.id !== id) }));
  }
}));