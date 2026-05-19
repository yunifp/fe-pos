import { create } from 'zustand';
import api from '../api/api';

interface WarehouseState {
  warehouses: any[];
  currentWarehouse: any | null;
  isLoading: boolean;
  error: string | null;
  fetchWarehouses: () => Promise<void>;
  fetchWarehouseById: (id: string) => Promise<void>;
  createWarehouse: (data: { name: string; address?: string }) => Promise<void>;
  updateWarehouse: (id: string, data: { name?: string; address?: string }) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  addStock: (warehouseId: string, data: { materialId: string; quantity: number }) => Promise<void>;
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  warehouses: [],
  currentWarehouse: null,
  isLoading: false,
  error: null,

  fetchWarehouses: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/warehouses');
      set({ warehouses: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal mengambil data gudang', isLoading: false });
    }
  },

  fetchWarehouseById: async (id: string) => {
    set({ isLoading: true, error: null, currentWarehouse: null });
    try {
      const response = await api.get(`/warehouses/${id}`);
      set({ currentWarehouse: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal mengambil detail gudang', isLoading: false });
    }
  },

  createWarehouse: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/warehouses', data);
      await get().fetchWarehouses();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal membuat gudang', isLoading: false });
      throw error;
    }
  },

  updateWarehouse: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/warehouses/${id}`, data);
      await get().fetchWarehouses();
      if (get().currentWarehouse?.id === id) {
        await get().fetchWarehouseById(id);
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal update gudang', isLoading: false });
      throw error;
    }
  },

  deleteWarehouse: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/warehouses/${id}`);
      await get().fetchWarehouses();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal menghapus gudang', isLoading: false });
      throw error;
    }
  },

  addStock: async (warehouseId, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/warehouses/${warehouseId}/stocks`, data);
      await get().fetchWarehouseById(warehouseId); // Refresh detail stok gudang
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal menambah stok', isLoading: false });
      throw error;
    }
  },
}));