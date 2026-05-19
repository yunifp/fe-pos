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
    fetchOpenTickets: (branchId?: string) => Promise<void>;
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

    applyBundleLogic: (currentCart: any[]) => {
        const promotions = get().availablePromotions || [];
        const bundlePromos = promotions.filter(p => p.type === 'BUNDLE' && p.isActive);

        let updatedCart = currentCart.map(item => ({
            ...item,
            price: item.priceAfterProductDiscount, 
            isBundleApplied: false,
            appliedBundleId: null
        }));

        if (bundlePromos.length === 0) {
            return updatedCart.map(i => ({ ...i, subtotal: i.quantity * i.price }));
        }

        bundlePromos.forEach((promo: any) => {
            const targetVariantIds = promo.targets?.map((t: any) => t.variantId) || [];
            if (targetVariantIds.length === 0) return;

            let canApplyMore = true;
            while (canApplyMore) {
                const itemsMatch = updatedCart.filter(item => 
                    targetVariantIds.includes(item.variantId) && !item.isBundleApplied
                );

                const uniqueMatchedIds = new Set(itemsMatch.map(i => i.variantId));

                if (uniqueMatchedIds.size === targetVariantIds.length) {
                    const bundleOriginalTotal = itemsMatch.reduce((sum, i) => sum + i.originalPrice, 0);
                    
                    let bundleDiscountAmt = promo.discountPct
                        ? (bundleOriginalTotal * promo.discountPct) / 100
                        : Number(promo.discountAmt || 0);

                    targetVariantIds.forEach((vId: number) => {
                        const cartIdx = updatedCart.findIndex(i => i.variantId === vId && !i.isBundleApplied);
                        if (cartIdx !== -1) {
                            const item = updatedCart[cartIdx];
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

        return updatedCart.map(i => ({ ...i, subtotal: i.quantity * i.price }));
    },

    addToCart: (product: any, variant: any) => {
        const state = get();
        const promotions = state.availablePromotions || [];
        const originalPrice = Number(variant.price);
        
        let priceAfterProductDiscount = originalPrice;
        let isProductDiscounted = false;
        let appliedProductId = null;

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

        set({ cart: state.applyBundleLogic(newCart) });
    },

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

    updateItemNotes: (variantId: number, notes: string) => {
        set((state) => ({
            cart: state.cart.map((item) =>
                item.variantId === variantId ? { ...item, notes } : item
            ),
        }));
    },

    fetchAvailablePromos: async (branchId: string) => {
        try {
            const res = await api.get('/promotions', { params: { branchId } });
            set({ availablePromotions: res.data || [] });
        } catch (e) {
            set({ availablePromotions: [] });
        }
    },

    // --- FASE 1: PERBAIKAN ENDPOINT FETCH TICKET ---
    fetchOpenTickets: async (branchId?: string) => {
        try {
            const params: any = { status: 'PENDING' };
            if (branchId) params.branchId = branchId;
            
            const res = await api.get('/pos/orders', { params });
            // Backend mengirim data dalam bentuk { success: true, data: [...] }
            set({ openTickets: res.data.data || [] });
        } catch (e) { console.error(e); }
    },

    loadTicket: (order: any) => {
        const loadedCart = (order.items || []).map((i: any) => {
            const originalPrice = Number(i.variant?.price || i.price);
            return {
                variantId: i.variantId,
                name: i.variant?.product?.name || i.name,
                variantName: i.variant?.name || '',
                price: Number(i.price), 
                originalPrice: originalPrice,
                priceAfterProductDiscount: Number(i.price),
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
            cart: get().applyBundleLogic(loadedCart),
            isCartVisible: true
        });
    },

    resetPOS: () => set({ cart: [], currentOrder: null, selectedMember: null, isCartVisible: false }),
    setCartVisible: (val: boolean) => set({ isCartVisible: val }),
    toggleViewMode: () => set({ viewMode: get().viewMode === 'grid' ? 'list' : 'grid' }),
    setSelectedMember: (member: any) => set({ selectedMember: member }),
}));