import { create } from 'zustand';
import api from '../api/api';

export interface Recipe {
  materialId: string;
  quantityRequired: number;
}

export interface ProductVariant {
  id?: number;
  name: string;
  price: number | string;
  trackStock?: boolean;
  stock?: number;
  recipes: Recipe[];
}

export interface ProductPayload {
  id?: number;
  categoryId: number;
  branchId?: string;
  name: string;
  hasVariant: boolean;
  price?: number;
  trackStock?: boolean;
  stock?: number;
  recipes?: Recipe[];
  variants?: Omit<ProductVariant, 'id'>[];
}

interface ProductState {
  products: any[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: (branchId?: string) => Promise<void>;
  fetchInitialData: () => Promise<void>;
  createProduct: (data: ProductPayload) => Promise<void>;
  updateProduct: (id: number, data: any) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  branches: any[];
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  branches: [],
  isLoading: false,
  error: null,

  fetchInitialData: async () => {
    try {
      const branchRes = await api.get('/branches');
      set({ branches: branchRes.data.data });
    } catch (e) { console.error("Error fetch initial product data", e); }
  },

  fetchProducts: async (branchId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = branchId ? `/products?branchId=${branchId}` : '/products';
      const response = await api.get(url);
      set({ products: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal mengambil data produk', isLoading: false });
    }
  },

  createProduct: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/products', data);
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal menambah produk', isLoading: false });
      throw error;
    }
  },

  updateProduct: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/products/${id}`, data);
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal update produk', isLoading: false });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/products/${id}`);
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Gagal menghapus produk', isLoading: false });
      throw error;
    }
  },
}));