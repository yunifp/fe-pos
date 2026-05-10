import { create } from 'zustand';
import api from '../api/api';

interface POSState {
    cart: any[];
    isCartVisible: boolean;
    viewMode: 'grid' | 'list';
    currentOrder: any | null;
    selectedMember: any | null;
    openTickets: any[];
    availablePromotions: any[];

    // Actions
    fetchAvailablePromos: (branchId: string) => Promise<void>;
    fetchOpenTickets: () => Promise<void>;
    applyBundleLogic: (currentCart: any[]) => any[];
    addToCart: (product: any, variant: any) => void;
    updateQty: (variantId: number, delta: number) => void;
    updateItemNotes: (variantId: number, notes: string) => void;
    loadTicket: (order: any) => void;
    resetPOS: () => void;
    setCartVisible: (val: boolean) => void;
    toggleViewMode: () => void;
    setSelectedMember: (member: any) => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
    cart: [],
    isCartVisible: true,
    viewMode: 'grid',
    currentOrder: null,
    selectedMember: null,
    openTickets: [],
    availablePromotions: [],

    // --- 1. LOGIKA RE-KALKULASI BUNDLE (REAKTIF) ---
    applyBundleLogic: (currentCart: any[]) => {
        const promotions = get().availablePromotions || [];
        const bundlePromos = promotions.filter(p => p.type === 'BUNDLE' && p.isActive);

        // Langkah A: Kembalikan semua item ke harga dasar (Harga setelah diskon produk, sebelum bundle)
        let updatedCart = currentCart.map(item => ({
            ...item,
            price: item.priceAfterProductDiscount, 
            isBundleApplied: false,
            appliedBundleId: null
        }));

        if (bundlePromos.length === 0) {
            return updatedCart.map(i => ({ ...i, subtotal: i.quantity * i.price }));
        }

        // Langkah B: Proses pencarian paket bundle
        bundlePromos.forEach((promo: any) => {
            const targetVariantIds = promo.targets?.map((t: any) => t.variantId) || [];
            if (targetVariantIds.length === 0) return;

            let canApplyMore = true;
            while (canApplyMore) {
                // Cari item di cart yang tersedia untuk masuk bundle ini
                const itemsMatch = updatedCart.filter(item => 
                    targetVariantIds.includes(item.variantId) && !item.isBundleApplied
                );

                const uniqueMatchedIds = new Set(itemsMatch.map(i => i.variantId));

                // Jika semua syarat item unik dalam bundle terpenuhi
                if (uniqueMatchedIds.size === targetVariantIds.length) {
                    const bundleOriginalTotal = itemsMatch.reduce((sum, i) => sum + i.originalPrice, 0);
                    
                    let bundleDiscountAmt = promo.discountPct
                        ? (bundleOriginalTotal * promo.discountPct) / 100
                        : Number(promo.discountAmt || 0);

                    // Terapkan diskon ke item-item terkait di dalam cart
                    targetVariantIds.forEach((vId: number) => {
                        const cartIdx = updatedCart.findIndex(i => i.variantId === vId && !i.isBundleApplied);
                        if (cartIdx !== -1) {
                            const item = updatedCart[cartIdx];
                            // Hitung pembagian diskon proporsional (agar HPP & Laba tetap akurat di backend)
                            const itemShare = item.originalPrice / bundleOriginalTotal;
                            const discountForThisItem = bundleDiscountAmt * itemShare;

                            updatedCart[cartIdx].price = item.originalPrice - discountForThisItem;
                            updatedCart[cartIdx].isBundleApplied = true;
                            updatedCart[cartIdx].appliedBundleId = promo.id;
                        }
                    });
                } else {
                    canApplyMore = false;
                }
            }
        });

        // Langkah C: Hitung subtotal akhir berdasarkan harga yang sudah dimodifikasi bundle
        return updatedCart.map(i => ({ ...i, subtotal: i.quantity * i.price }));
    },

    // --- 2. ADD TO CART DENGAN DETEKSI PRODUCT_DISCOUNT ---
    addToCart: (product: any, variant: any) => {
        const state = get();
        const promotions = state.availablePromotions || [];
        const originalPrice = Number(variant.price);
        
        let priceAfterProductDiscount = originalPrice;
        let isProductDiscounted = false;
        let appliedProductId = null;

        // Cari apakah ada promo PRODUCT_DISCOUNT untuk variant ini
        const productPromo = promotions.find(p => 
            p.type === 'PRODUCT_DISCOUNT' && 
            p.isActive && 
            p.targets?.some((t: any) => t.variantId === variant.id)
        );

        if (productPromo) {
            const disc = productPromo.discountPct 
                ? (originalPrice * productPromo.discountPct) / 100 
                : Number(productPromo.discountAmt || 0);
            
            priceAfterProductDiscount = originalPrice - disc;
            isProductDiscounted = true;
            appliedProductId = productPromo.id;
        }

        const cart = [...state.cart];
        const existingIdx = cart.findIndex((i: any) => i.variantId === variant.id);

        let newCart;
        if (existingIdx !== -1) {
            newCart = cart.map((item, idx) =>
                idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
            );
        } else {
            newCart = [...cart, {
                variantId: variant.id,
                productId: product.id,
                name: product.name,
                variantName: variant.name,
                originalPrice: originalPrice,
                priceAfterProductDiscount: priceAfterProductDiscount,
                isProductDiscounted: isProductDiscounted,
                appliedProductId: appliedProductId,
                price: priceAfterProductDiscount,
                quantity: 1,
                hpp: Number(variant.hpp) || 0,
                subtotal: priceAfterProductDiscount,
                isBundleApplied: false,
                notes: ''
            }];
        }

        // Jalankan logika bundle untuk mengecek apakah tambahan item ini melengkapi paket
        set({ cart: state.applyBundleLogic(newCart) });
    },

    // --- 3. UPDATE QUANTITY ---
    updateQty: (variantId: number, delta: number) => {
        const newCart = get().cart.map((i: any) => {
            if (i.variantId === variantId) {
                const nQty = Math.max(0, i.quantity + delta);
                return { ...i, quantity: nQty };
            }
            return i;
        }).filter((i: any) => i.quantity > 0);

        set({ cart: get().applyBundleLogic(newCart) });
    },

    // --- 4. UPDATE NOTES ---
    updateItemNotes: (variantId: number, notes: string) => {
        set((state) => ({
            cart: state.cart.map((item) =>
                item.variantId === variantId ? { ...item, notes } : item
            ),
        }));
    },

    // --- 5. FETCH DATA PROMO ---
    fetchAvailablePromos: async (branchId: string) => {
        try {
            const res = await api.get('/promotions', { params: { branchId } });
            set({ availablePromotions: res.data || [] });
        } catch (e) {
            set({ availablePromotions: [] });
        }
    },

    // --- 6. TICKET / ORDER MANAGEMENT ---
    fetchOpenTickets: async () => {
        try {
            const res = await api.get('/orders/open-tickets');
            set({ openTickets: res.data || [] });
        } catch (e) { console.error(e); }
    },

    loadTicket: (order: any) => {
        const loadedCart = (order.items || []).map((i: any) => {
            // Rekonstruksi data item dari database
            const originalPrice = Number(i.variant?.price || i.price);
            return {
                variantId: i.variantId,
                name: i.variant?.product?.name || i.name,
                variantName: i.variant?.name || '',
                price: Number(i.price), 
                originalPrice: originalPrice,
                priceAfterProductDiscount: Number(i.price), // Saat load, kita asumsikan harga simpanan adalah harga dasar diskon produk
                quantity: i.quantity,
                subtotal: Number(i.subtotal),
                notes: i.notes || '',
                appliedProductId: i.appliedProductId,
                appliedBundleId: i.appliedBundleId,
                isProductDiscounted: !!i.appliedProductId
            };
        });

        set({
            currentOrder: order,
            selectedMember: order.member || null,
            // Hitung ulang bundle saat load tiket (antisipasi jika promo sudah berakhir)
            cart: get().applyBundleLogic(loadedCart),
            isCartVisible: true
        });
    },

    resetPOS: () => set({ cart: [], currentOrder: null, selectedMember: null, isCartVisible: false }),
    setCartVisible: (val: boolean) => set({ isCartVisible: val }),
    toggleViewMode: () => set({ viewMode: get().viewMode === 'grid' ? 'list' : 'grid' }),
    setSelectedMember: (member: any) => set({ selectedMember: member }),
}));