import { create } from 'zustand';
import api from '../api/api';

interface UserState {
  users: any[];
  branches: any[];
  isLoading: boolean;
  
  fetchInitialData: () => Promise<void>;
  fetchUsers: (branchId?: string) => Promise<void>;
  createUser: (data: any) => Promise<void>;
  updateUser: (id: string, data: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  branches: [],
  isLoading: false,

  fetchInitialData: async () => {
      try {
          const res = await api.get('/branches');
          set({ branches: res.data });
      } catch (e) { console.error("Gagal load branches", e); }
  },

  fetchUsers: async (branchId) => {
    set({ isLoading: true });
    try {
      const params = branchId ? { branchId } : {}; 
      const res = await api.get('/users', { params });
      set({ users: res.data, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  createUser: async (data) => {
      await api.post('/users', data);
  },

  updateUser: async (id, data) => {
      await api.put(`/users/${id}`, data);
  },

  deleteUser: async (id) => {
      await api.delete(`/users/${id}`);
      set(state => ({ users: state.users.filter(u => u.id !== id) }));
  }
}));