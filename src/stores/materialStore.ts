import { create } from 'zustand';
import api from '../api/api';

export interface Material {
  id: string;
  name: string;
  unit: string;
  costPerUnit: string | number;
}

interface MaterialState {
  materials: Material[];
  isLoading: boolean;
  error: string | null;
  fetchMaterials: () => Promise<void>;
  createMaterial: (data: Omit<Material, 'id'>) => Promise<void>;
  updateMaterial: (id: string, data: Partial<Material>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
  materials: [],
  isLoading: false,
  error: null,

  fetchMaterials: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/materials');
      set({ materials: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal mengambil data material', isLoading: false });
    }
  },

  createMaterial: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/materials', data);
      await get().fetchMaterials();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal menambah material', isLoading: false });
      throw error;
    }
  },

  updateMaterial: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/materials/${id}`, data);
      await get().fetchMaterials();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal update material', isLoading: false });
      throw error;
    }
  },

  deleteMaterial: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/materials/${id}`);
      await get().fetchMaterials();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal menghapus material', isLoading: false });
      throw error;
    }
  },
}));