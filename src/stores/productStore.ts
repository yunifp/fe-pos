import { create } from 'zustand';
import api from '../api/api';
import { Platform } from 'react-native';

interface ProductState {
    products: any[];
    categories: any[];
    branches: any[];
    isLoading: boolean;

    fetchInitialData: () => Promise<void>;
    fetchProducts: (branchId?: string) => Promise<void>;
    createProduct: (data: any) => Promise<void>;
    updateProduct: (id: number, data: any) => Promise<void>;
    deleteProduct: (id: number) => Promise<void>;
}

export const useProductStore = create<ProductState>((set) => ({
    products: [],
    categories: [],
    branches: [],
    isLoading: false,

    fetchInitialData: async () => {
        try {
            const [catRes, branchRes] = await Promise.all([
                api.get('/categories'),
                api.get('/branches')
            ]);
            set({ categories: catRes.data, branches: branchRes.data });
        } catch (e) { console.error("Gagal load initial data", e); }
    },

    fetchProducts: async (branchId) => {
        set({ isLoading: true });
        try {
            const params = branchId ? { branchId } : {};
            const res = await api.get('/products', { params });
            set({ products: res.data, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    // --- CREATE PRODUCT ---
    createProduct: async (data) => {
        const formData = new FormData();

        // Append Data Text
        formData.append('name', data.name);
        formData.append('description', data.description || '');
        formData.append('categoryId', String(data.categoryId));
        formData.append('hasVariants', String(data.hasVariants));
        formData.append('openPrice', String(data.openPrice ?? false)); // <--- TAMBAHAN

        // [PERBAIKAN] Fallback value: Jika data.singlePrice kosong, ambil dari variants[0]
        const v0 = data.variants && data.variants.length > 0 ? data.variants[0] : {};

        formData.append('singlePrice', (data.singlePrice ?? v0.price ?? '0').toString());
        formData.append('singleHpp', (data.singleHpp ?? v0.hpp ?? '0').toString());
        formData.append('singleStock', (data.singleStock ?? v0.stock ?? '0').toString());
        formData.append('singleSku', (data.singleSku || v0.sku || '').toString());
        formData.append('singleManageStock', String(data.singleManageStock ?? v0.manageStock ?? true));

        formData.append('variants', JSON.stringify(data.variants));

        if (data.targetBranchIds) {
            formData.append('targetBranchIds', JSON.stringify(data.targetBranchIds));
        }

        // [FIX GAMBAR]
        if (data.image) {
            if (Platform.OS === 'web') {
                const res = await fetch(data.image);
                const blob = await res.blob();
                formData.append('image', blob, 'upload.jpg');
            } else {
                const localUri = data.image;
                const filename = localUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;

                formData.append('image', {
                    uri: localUri,
                    name: filename || 'upload.jpg',
                    type: type,
                } as any);
            }
        }

        await api.post('/products', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            transformRequest: (data) => data,
        });
    },

    // --- UPDATE PRODUCT ---
    updateProduct: async (id, data) => {
        const formData = new FormData();

        formData.append('name', data.name);
        formData.append('description', data.description || '');
        formData.append('categoryId', String(data.categoryId));
        formData.append('hasVariants', String(data.hasVariants));
        formData.append('openPrice', String(data.openPrice ?? false)); // <--- TAMBAHAN
        formData.append('variants', JSON.stringify(data.variants));

        // [FIX] HANYA kirim field 'image' jika ini adalah URI lokal (baru dipilih)
        const isNewImage = data.image && (
            data.image.startsWith('blob:') ||
            data.image.startsWith('file:') ||
            data.image.startsWith('content:')
        );

        if (isNewImage) {
            if (Platform.OS === 'web') {
                const res = await fetch(data.image);
                const blob = await res.blob();
                formData.append('image', blob, 'update_image.jpg');
            } else {
                const localUri = data.image;
                const filename = localUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image/jpeg`;

                formData.append('image', {
                    uri: localUri,
                    name: filename || 'update_image.jpg',
                    type: type,
                } as any);
            }
        }

        await api.put(`/products/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    deleteProduct: async (id) => {
        await api.delete(`/products/${id}`);
        set(state => ({ products: state.products.filter(p => p.id !== id) }));
    }
}));