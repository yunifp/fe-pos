import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    Image, Modal, useWindowDimensions, KeyboardAvoidingView, Platform,
    Alert, ActivityIndicator
} from 'react-native';
import {
    Search, ShoppingCart, Trash2, Plus, Minus, X,
    LayoutGrid, LayoutList, Ticket, Clock,
    ChevronRight, Package, StickyNote,
    Calculator, Delete, User, Tag
} from 'lucide-react-native';
import MainLayout from '../components/MainLayout';
import MyInput from '../components/MyInput';
import PaymentModal from '../components/PaymentModal';
import { usePOSStore } from '../stores/posStore';
import { useProductStore } from '../stores/productStore';
import { useCategoryStore } from '../stores/categoryStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';
import { useSettingStore } from '../stores/settingStore';

export default function POSScreen() {
    const { settings, fetchSettings } = useSettingStore();
    const { width, height } = useWindowDimensions();

    const isLarge = width >= 1024;
    const isMedium = width >= 768;
    const isSmall = width < 768;

    const getColumnCount = () => {
        const availableWidth = !isLarge && pos.isCartVisible ? 0 : width;
        if (isLarge) return 3;
        if (isMedium) return 2;
        return 2;
    };

    const pos = usePOSStore();
    const { products, fetchProducts } = useProductStore();
    const { categories, fetchCategories } = useCategoryStore();

    const [user, setUser] = useState<any>(null); 
    const [search, setSearch] = useState('');
    const [selectedCat, setSelectedCat] = useState<number | null>(null);
    const [showPayment, setShowPayment] = useState(false);
    const [showOpenTicketList, setShowOpenTicketList] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKE_HOME' | 'ONLINE'>('DINE_IN');

    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [showVariantModal, setShowVariantModal] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [ticketSearch, setTicketSearch] = useState('');

    const [showNoteModal, setShowNoteModal] = useState(false);
    const [currentNote, setCurrentNote] = useState('');
    const [activeVariantIdForNote, setActiveVariantIdForNote] = useState<number | null>(null);

    const [showOpenPriceModal, setShowOpenPriceModal] = useState(false);
    const [manualPrice, setManualPrice] = useState('');
    const [pendingItem, setPendingItem] = useState<{ product: any, variant: any } | null>(null);

    const [memberPhone, setMemberPhone] = useState('');
    const [isVerifyingMember, setIsVerifyingMember] = useState(false);
    const [promoCodeInput, setPromoCodeInput] = useState('');

    useEffect(() => {
        if (isMedium) pos.setCartVisible(true);
        else pos.setCartVisible(false);
    }, [isMedium]);

    useEffect(() => {
        const init = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                const branchId = parsedUser.branch?.id || parsedUser.branchId;
                fetchProducts(branchId);
                fetchCategories(branchId);
                pos.fetchAvailablePromos(branchId);
            }
        };
        fetchSettings();
        init();
    }, []);

    useEffect(() => {
        if (pos.currentOrder?.customerName) setCustomerName(pos.currentOrder.customerName);
    }, [pos.currentOrder]);

    const calculations = useMemo(() => {
        const subtotal = pos.cart.reduce((acc: number, i: any) => acc + i.subtotal, 0);
        let promoDiscount = 0;
        
        if (pos.selectedPromo) {
            promoDiscount = pos.selectedPromo.discountPct 
                ? (subtotal * pos.selectedPromo.discountPct) / 100 
                : Number(pos.selectedPromo.discountAmt || 0);
            if (pos.selectedPromo.maxDiscount && promoDiscount > pos.selectedPromo.maxDiscount) {
                promoDiscount = Number(pos.selectedPromo.maxDiscount);
            }
        }
        
        return { 
            subtotal, 
            promoDiscount, 
            totalAfterPromo: Math.max(0, subtotal - promoDiscount) 
        };
    }, [pos.cart, pos.selectedPromo]);

    // --- PERBAIKAN BUG FATAL: LOGIKA PENGAMBILAN HARGA ---
    const getProductPriceLabel = (p: any) => {
        if (p.openPrice) return "Open Price";
        
        // Jika product memiliki array variants dan isinya tidak kosong
        if (p.variants && p.variants.length > 0) {
            if (p.variants.length > 1) {
                const minPrice = Math.min(...p.variants.map((v: any) => Number(v.price || 0)));
                return `Rp ${minPrice.toLocaleString('id-ID')}`;
            }
            return `Rp ${Number(p.variants[0].price || 0).toLocaleString('id-ID')}`;
        }
        
        // Fallback darurat jika variants kosong
        return `Rp ${Number(p.price || 0).toLocaleString('id-ID')}`;
    };

    const handleProductPress = (product: any) => {
        // Pengecekan aman jika variants lebih dari 1
        if (product.variants && product.variants.length > 1) {
            setSelectedProduct(product);
            setShowVariantModal(true);
        } else {
            // Ambil varian pertama. Jika kosong, buat varian 'Virtual' agar tidak crash di keranjang
            const variant = (product.variants && product.variants.length > 0) 
                ? product.variants[0] 
                : { id: product.id, name: 'Reguler', price: product.price || 0 };
            
            if (product.openPrice) {
                setPendingItem({ product, variant });
                setManualPrice('');
                setShowOpenPriceModal(true);
            } else {
                pos.addToCart(product, variant);
            }
        }
    };

    const handleOpenNote = (item: any) => {
        setActiveVariantIdForNote(item.variantId);
        setCurrentNote(item.notes || '');
        setShowNoteModal(true);
    };

    const handleSaveNote = () => {
        if (activeVariantIdForNote) pos.updateItemNotes(activeVariantIdForNote, currentNote);
        setShowNoteModal(false);
        setCurrentNote('');
        setActiveVariantIdForNote(null);
    };

    const handlePressCalc = (num: string) => setManualPrice(prev => prev + num);
    const handleClearCalc = () => setManualPrice('');
    const handleBackspaceCalc = () => setManualPrice(prev => prev.slice(0, -1));

    const handleConfirmOpenPrice = () => {
        const price = Number(manualPrice);
        if (!manualPrice || price <= 0) return Alert.alert("Harga Wajib Diisi", "Mohon masukkan nominal harga yang valid.");
        if (pendingItem) pos.addToCart(pendingItem.product, { ...pendingItem.variant, price: price });
        setShowOpenPriceModal(false);
        setManualPrice('');
        setPendingItem(null);
    };

    const handleVerifyMember = async () => {
        if (!memberPhone) return;
        setIsVerifyingMember(true);
        try {
            const res = await api.get('/crm/members');
            const memberList = res.data.data || [];
            const member = memberList.find((m: any) => m.phone === memberPhone);
            if (member) {
                pos.setSelectedMember(member);
                setMemberPhone('');
            } else {
                alert('Member tidak ditemukan atau belum terdaftar.');
            }
        } catch (e) {
            alert('Gagal mencari member');
        } finally {
            setIsVerifyingMember(false);
        }
    };

    const handleApplyPromo = () => {
        if (!promoCodeInput) return;
        const success = pos.applyPromoCode(promoCodeInput);
        if (!success) alert('Kode Promo tidak valid, kadaluarsa, atau syarat belum terpenuhi.');
        setPromoCodeInput('');
    };

    const handleSaveTicket = async () => {
        if (!customerName && !pos.currentOrder?.customerName && !pos.selectedMember) return alert("Mohon isi Nama Pelanggan atau pilih Member");
        try {
            const branchIdToUse = user?.branch?.id || user?.branchId;
            const payload = {
                branchId: branchIdToUse,
                orderType: orderType,
                customerName: pos.selectedMember ? pos.selectedMember.name : (customerName || pos.currentOrder?.customerName || "Walk-in"),
                memberId: pos.selectedMember ? pos.selectedMember.id : undefined,
                paymentStatus: 'UNPAID',
                items: pos.cart.map((item: any) => ({
                    variantId: item.variantId,
                    quantity: item.quantity,
                })),
            };

            await api.post('/pos/orders', payload);
            alert("Tiket Berhasil Disimpan & Dikirim ke Dapur!");
            pos.resetPOS();
            setShowSaveModal(false);
            setCustomerName('');
        } catch (e: any) {
            alert("Gagal Simpan: " + (e.response?.data?.message || "Error Server"));
        }
    };

    const filteredProducts = products.filter((p: any) =>
        p.name.toLowerCase().includes(search.toLowerCase()) && (!selectedCat || p.categoryId === selectedCat)
    );

    return (
        <MainLayout>
            <View className="relative flex-row flex-1 bg-slate-50">

                <View className="flex-1 p-3 md:p-5">
                    <View className={`${isMedium ? 'flex-row' : 'flex-col'} gap-3 mb-3`}>
                        <View className="flex-row items-center flex-1 h-12 px-4 bg-white border shadow-sm rounded-2xl border-slate-100">
                            <Search size={18} color="#94A3B8" />
                            <TextInput
                                placeholder="Cari menu..."
                                placeholderTextColor="#CBD5E1"
                                className="flex-1 h-full py-0 ml-2 font-bold text-slate-900"
                                value={search}
                                onChangeText={setSearch}
                                style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined}
                            />
                            {search !== '' && (
                                <TouchableOpacity onPress={() => setSearch('')}>
                                    <X size={16} color="#CBD5E1" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={async () => { 
                                    const branchIdToUse = user?.branch?.id || user?.branchId;
                                    await pos.fetchOpenTickets(branchIdToUse); 
                                    setShowOpenTicketList(true); 
                                }}
                                className="flex-row items-center justify-center px-4 py-3 bg-white border shadow-sm rounded-2xl border-slate-100"
                            >
                                <Clock size={18} color={settings.themeSecondaryColor} />
                                {!isSmall && <Text className="ml-2 text-xs font-bold" style={{ color: settings.themeSecondaryColor }}>Buka Tiket</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={pos.toggleViewMode} className="p-3 bg-white border shadow-sm rounded-2xl border-slate-100">
                                {pos.viewMode === 'grid' ? <LayoutList size={18} color={settings.themeSecondaryColor} /> : <LayoutGrid size={18} color={settings.themeSecondaryColor} />}
                            </TouchableOpacity>

                            {!pos.isCartVisible && (
                                <TouchableOpacity onPress={() => pos.setCartVisible(true)} className="relative p-3 shadow-lg rounded-2xl" style={{ backgroundColor: settings.themePrimaryColor }}>
                                    <ShoppingCart size={18} color="white" />
                                    {pos.cart.length > 0 && (
                                        <View className="absolute items-center justify-center w-5 h-5 border-2 border-white rounded-full -top-1 -right-1 bg-rose-500">
                                            <Text className="text-[9px] text-white font-black">{pos.cart.length}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View className="h-10 mb-4">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2 }}>
                            <TouchableOpacity onPress={() => setSelectedCat(null)} style={!selectedCat ? { backgroundColor: settings.themePrimaryColor } : { borderColor: '#e2e8f0' }} className={`px-5 py-2 rounded-full mr-2 border ${!selectedCat ? 'border-transparent' : 'bg-white'}`}>
                                <Text className={`font-bold text-xs ${!selectedCat ? 'text-white' : 'text-slate-500'}`}>Semua</Text>
                            </TouchableOpacity>
                            {categories.map((c: any) => (
                                <TouchableOpacity key={c.id} onPress={() => setSelectedCat(c.id)} style={selectedCat === c.id ? { backgroundColor: settings.themePrimaryColor } : { borderColor: '#e2e8f0' }} className={`px-5 py-2 rounded-full mr-2 border ${selectedCat === c.id ? 'border-transparent' : 'bg-white'}`}>
                                    <Text className={`font-bold text-xs ${selectedCat === c.id ? 'text-white' : 'text-slate-500'}`}>{c.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="flex-row flex-wrap">
                            {filteredProducts.map((p: any) => (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => handleProductPress(p)}
                                    style={{ width: pos.viewMode === 'list' ? '50%' : `${100 / getColumnCount()}%` }}
                                    className="p-1.5"
                                    activeOpacity={0.7}
                                >
                                    <View className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden active:scale-95 transition-all ${pos.viewMode === 'list' ? 'flex-row p-2 items-center' : ''}`}>
                                        <View className={`${pos.viewMode === 'list' ? 'w-14 h-14 rounded-xl flex-shrink-0' : 'h-28'} bg-slate-50 overflow-hidden`}>
                                            {p.image ? (
                                                <Image source={{ uri: api.defaults.baseURL?.replace('/api', '') + p.image }} className="w-full h-full" resizeMode="cover" />
                                            ) : (
                                                <View className="items-center justify-center flex-1 bg-slate-100"><Package size={18} color="#CBD5E1" /></View>
                                            )}
                                        </View>
                                        <View className={`${pos.viewMode === 'list' ? 'flex-1 ml-3 min-w-0' : 'p-2.5'}`}>
                                            <Text className="text-[11px] font-bold text-slate-800" numberOfLines={1}>{p.name}</Text>
                                            
                                            {/* PERBAIKAN DIRENDER DISINI */}
                                            <Text className="mt-0.5 text-[11px] font-black" style={{ color: settings.themeSecondaryColor }}>
                                                {getProductPriceLabel(p)}
                                            </Text>

                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {pos.isCartVisible && (
                    <View
                        style={{
                            width: isLarge ? 380 : width,
                            position: isLarge ? 'relative' : 'absolute',
                            right: 0, top: 0, bottom: 0, zIndex: 100
                        }}
                        className="h-full bg-white border-l shadow-2xl border-slate-100 flex-col"
                    >
                        <View className="flex-1 p-5 flex-col">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center">
                                    <TouchableOpacity onPress={() => pos.setCartVisible(false)} className="p-2 mr-2 rounded-full bg-slate-100"><ChevronRight size={20} color="#64748B" /></TouchableOpacity>
                                    <Text className="text-xl font-black text-slate-800">KERANJANG</Text>
                                </View>
                                <TouchableOpacity onPress={() => pos.resetPOS()} className="p-2 bg-rose-50 rounded-xl"><Trash2 size={18} color="#F43F5E" /></TouchableOpacity>
                            </View>

                            {pos.selectedMember ? (
                                <View className="flex-row items-center justify-between p-3 mb-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <View className="flex-row items-center flex-1">
                                        <View className="p-1.5 bg-white rounded-lg"><User size={16} color="#4F46E5" /></View>
                                        <View className="ml-3">
                                            <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>{pos.selectedMember.name}</Text>
                                            <Text className="text-[10px] text-indigo-600 font-black">{pos.selectedMember.points} Poin Loyalitas</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => pos.setSelectedMember(null)} className="p-1"><X size={16} color="#F43F5E" /></TouchableOpacity>
                                </View>
                            ) : (
                                <View className="flex-row items-center h-12 px-3 mb-4 border bg-slate-50 rounded-xl border-slate-200">
                                    <Search size={16} color="#94A3B8" />
                                    <TextInput
                                        placeholder="Cari No. HP Member..."
                                        placeholderTextColor="#94A3B8"
                                        className="flex-1 h-full ml-2 text-xs font-bold text-slate-700"
                                        value={memberPhone}
                                        onChangeText={setMemberPhone}
                                        keyboardType="numeric"
                                        style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined}
                                        onSubmitEditing={handleVerifyMember}
                                    />
                                    <TouchableOpacity onPress={handleVerifyMember} className="bg-indigo-600 p-2 rounded-lg ml-1">
                                        {isVerifyingMember ? <ActivityIndicator size="small" color="white" /> : <Text className="text-[9px] font-black text-white uppercase">Cek</Text>}
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View className="flex-row p-1 mb-3 bg-slate-100 rounded-xl">
                                {['DINE_IN', 'TAKE_HOME', 'ONLINE'].map((type) => (
                                    <TouchableOpacity key={type} onPress={() => setOrderType(type as any)} className={`flex-1 py-2 rounded-lg items-center ${orderType === type ? 'bg-white shadow-sm' : ''}`}>
                                        <Text className={`font-black text-[9px] ${orderType === type ? 'text-indigo-600' : 'text-slate-400'}`}>{type.replace('_', ' ')}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                                {pos.cart.map((item: any, idx: number) => (
                                    <View className="flex-row p-3 mb-2 bg-white border border-slate-100 rounded-xl" key={idx}>
                                        <View className="flex-1 mr-2">
                                            <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>{item.name.split(' (')[0]}</Text>
                                            {item.variantName && (
                                                <View className="self-start px-1.5 py-0.5 mt-1 bg-indigo-50 rounded-md border border-indigo-100">
                                                    <Text className="text-[8px] font-black text-indigo-600 uppercase tracking-tighter">
                                                        {item.variantName}
                                                    </Text>
                                                </View>
                                            )}
                                            <View className="flex-row items-center mt-1">
                                                {item.isProductDiscounted && (
                                                    <>
                                                        <Tag size={10} color="#EF4444" style={{ marginRight: 4 }} />
                                                        <Text className="text-[10px] font-black text-red-600">Rp {item.price.toLocaleString('id-ID')}</Text>
                                                        <Text className="ml-2 text-[8px] text-slate-300 line-through">Rp {item.originalPrice.toLocaleString('id-ID')}</Text>
                                                    </>
                                                )}
                                                {item.isBundleApplied && (
                                                    <>
                                                        <Tag size={10} color="#10B981" style={{ marginRight: 4 }} />
                                                        <Text className="text-[10px] font-black text-emerald-600">Bundle Applied</Text>
                                                    </>
                                                )}
                                                {!item.isProductDiscounted && !item.isBundleApplied && (
                                                    <Text className="text-[10px] font-black text-slate-400">Rp {item.price.toLocaleString('id-ID')}</Text>
                                                )}
                                            </View>
                                            <TouchableOpacity onPress={() => handleOpenNote(item)} className="flex-row items-center mt-1">
                                                <StickyNote size={10} color={item.notes ? "#4F46E5" : "#94A3B8"} />
                                                <Text className={`text-[9px] ml-1 font-bold ${item.notes ? "text-indigo-600 italic" : "text-slate-400"}`} numberOfLines={1}>
                                                    {item.notes || "Catatan..."}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View className="flex-row items-center px-2 py-1 border bg-slate-50 rounded-xl border-slate-100">
                                            <TouchableOpacity onPress={() => pos.updateQty(item.variantId, -1)}><Minus size={14} color="#6366F1" /></TouchableOpacity>
                                            <Text className="w-7 text-[11px] font-black text-center text-slate-800">{item.quantity}</Text>
                                            <TouchableOpacity onPress={() => pos.updateQty(item.variantId, 1)}><Plus size={14} color="#6366F1" /></TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>

                            <View className="pt-4 mt-2 border-t border-slate-100">
                                <View className="flex-row items-center h-10 mb-3 border bg-slate-50 rounded-xl border-slate-200">
                                    <View className="px-3"><Tag size={14} color="#94A3B8" /></View>
                                    <TextInput
                                        placeholder="Kode Promo..."
                                        placeholderTextColor="#94A3B8"
                                        className="flex-1 h-full py-0 text-xs font-bold text-slate-700 uppercase"
                                        value={promoCodeInput}
                                        onChangeText={setPromoCodeInput}
                                        style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined}
                                        autoCapitalize="characters"
                                    />
                                    {pos.selectedPromo ? (
                                        <TouchableOpacity onPress={() => pos.removePromo()} className="bg-rose-500 p-2 rounded-r-xl h-full justify-center">
                                            <Text className="text-[9px] font-black text-white uppercase">Hapus</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity onPress={handleApplyPromo} className="bg-slate-800 p-2 rounded-r-xl h-full justify-center px-4">
                                            <Text className="text-[9px] font-black text-white uppercase">Gunakan</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View className="flex-row items-center justify-between mb-1">
                                    <Text className="text-[11px] font-bold text-slate-400">Subtotal</Text>
                                    <Text className="text-[11px] font-bold text-slate-600">Rp {calculations.subtotal.toLocaleString('id-ID')}</Text>
                                </View>
                                {calculations.promoDiscount > 0 && (
                                    <View className="flex-row items-center justify-between mb-1">
                                        <Text className="text-[11px] font-bold text-emerald-500">Diskon ({pos.selectedPromo?.code})</Text>
                                        <Text className="text-[11px] font-bold text-emerald-500">- Rp {calculations.promoDiscount.toLocaleString('id-ID')}</Text>
                                    </View>
                                )}
                                <View className="flex-row items-end justify-between mt-2 mb-4">
                                    <Text className="text-sm font-bold uppercase text-slate-800">Total Akhir</Text>
                                    <Text className="text-2xl font-black tracking-tighter text-indigo-600">Rp {calculations.totalAfterPromo.toLocaleString('id-ID')}</Text>
                                </View>

                                <View className="flex-row gap-2">
                                    <TouchableOpacity 
                                        onPress={() => setShowSaveModal(true)} 
                                        disabled={pos.cart.length === 0} 
                                        className={`items-center justify-center px-4 border rounded-2xl ${pos.cart.length === 0 ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-200 shadow-sm active:bg-slate-50'}`}
                                    >
                                        <Ticket size={20} color={pos.cart.length === 0 ? '#CBD5E1' : '#64748B'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => setShowPayment(true)} 
                                        disabled={pos.cart.length === 0} 
                                        className={`flex-1 py-4 rounded-2xl items-center justify-center flex-row ${pos.cart.length === 0 ? 'bg-slate-200' : 'bg-indigo-600 shadow-lg active:scale-95'}`}
                                    >
                                        <Text className="text-lg font-black tracking-widest text-white uppercase">BAYAR</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            <Modal visible={showVariantModal} transparent animationType="fade">
                <View className="items-center justify-center flex-1 p-6 bg-black/60">
                    <View className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl">
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-xl italic font-black uppercase text-slate-900">Pilih Varian</Text>
                            <TouchableOpacity onPress={() => setShowVariantModal(false)} className="p-2 rounded-full bg-slate-100"><X size={20} color="gray" /></TouchableOpacity>
                        </View>
                        <Text className="mb-4 text-base font-bold text-slate-500">{selectedProduct?.name}</Text>
                        <ScrollView className="max-h-80">
                            {selectedProduct?.variants && selectedProduct.variants.map((v: any) => (
                                <TouchableOpacity
                                    key={v.id}
                                    onPress={() => {
                                        if (selectedProduct?.openPrice) {
                                            setPendingItem({ product: selectedProduct, variant: v });
                                            setManualPrice('');
                                            setShowVariantModal(false);
                                            setShowOpenPriceModal(true);
                                        } else {
                                            pos.addToCart(selectedProduct, v);
                                            setShowVariantModal(false);
                                        }
                                    }}
                                    className="flex-row items-center justify-between p-5 mb-3 border border-slate-100 bg-slate-50 rounded-2xl active:bg-indigo-50"
                                >
                                    <Text className="text-base font-bold text-slate-800">{v.name}</Text>
                                    <Text className="font-black text-indigo-600">
                                        {selectedProduct?.openPrice ? "Open Price" : `Rp ${Number(v.price).toLocaleString('id-ID')}`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={showOpenPriceModal} transparent animationType="fade">
                <View className="items-center justify-center flex-1 p-4 bg-black/60">
                    <View style={{ maxHeight: height * 0.85 }} className="bg-white w-full max-w-[340px] rounded-[40px] p-5 shadow-2xl overflow-hidden">
                        <View className="items-center mb-3">
                            <View className="p-2.5 mb-2 bg-indigo-50 rounded-2xl">
                                <Calculator size={24} color="#4F46E5" />
                            </View>
                            <Text className="text-lg font-black uppercase text-slate-800">Input Harga</Text>
                            <Text className="text-[10px] font-bold text-slate-400 text-center px-2" numberOfLines={1}>
                                {pendingItem?.product?.name}
                            </Text>
                        </View>

                        <View className="flex-row items-center w-full h-16 px-4 mb-4 border bg-slate-50 rounded-3xl border-slate-100">
                            <Text className="flex-1 text-2xl font-black text-indigo-600">
                                Rp {Number(manualPrice || 0).toLocaleString('id-ID')}
                            </Text>
                            <TouchableOpacity onPress={handleClearCalc} className="p-2 bg-rose-100 rounded-xl active:bg-rose-200">
                                <Text className="text-xs font-black text-rose-600">C</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="w-full">
                            <View className="flex-row flex-wrap justify-between">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                    <TouchableOpacity
                                        key={num}
                                        onPress={() => handlePressCalc(num.toString())}
                                        className="w-[23%] h-12 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm mb-2 active:bg-slate-50"
                                    >
                                        <Text className="text-lg font-black text-slate-800">{num}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View className="flex-row justify-between">
                                <TouchableOpacity onPress={() => handlePressCalc('9')} className="w-[31%] h-12 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm active:bg-slate-50">
                                    <Text className="text-lg font-black text-slate-800">9</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handlePressCalc('0')} className="w-[31%] h-12 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm active:bg-slate-50">
                                    <Text className="text-lg font-black text-slate-800">0</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleBackspaceCalc} className="w-[31%] h-12 items-center justify-center rounded-2xl bg-slate-100 active:bg-slate-200">
                                    <Delete size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="mt-6">
                            <TouchableOpacity onPress={handleConfirmOpenPrice} className="items-center w-full py-4 bg-indigo-600 shadow-lg rounded-2xl shadow-indigo-200 active:scale-95">
                                <Text className="text-sm font-black tracking-widest text-white uppercase">TAMBAHKAN</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setShowOpenPriceModal(false); setPendingItem(null); }} className="items-center py-3 mt-1">
                                <Text className="text-[10px] font-bold uppercase text-slate-400">Batalkan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showNoteModal} transparent animationType="fade" onRequestClose={() => setShowNoteModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="items-center justify-center flex-1 p-6 bg-black/60">
                    <View className="bg-white w-full max-w-sm rounded-[35px] p-6 shadow-2xl">
                        <View className="items-center mb-4">
                            <View className="p-3 mb-3 bg-indigo-50 rounded-2xl"><StickyNote size={28} color="#4F46E5" /></View>
                            <Text className="text-lg font-black uppercase text-slate-800">Catatan Pesanan</Text>
                            <Text className="text-xs text-center text-slate-400">Tambahkan detail khusus untuk menu ini</Text>
                        </View>

                        <TextInput
                            className="w-full p-4 mb-6 font-medium leading-5 border bg-slate-50 border-slate-200 rounded-2xl text-slate-700 min-h-[100px] text-justify"
                            multiline
                            placeholder="Tulis catatan di sini..."
                            textAlignVertical="top"
                            value={currentNote}
                            onChangeText={setCurrentNote}
                            autoFocus
                        />

                        <TouchableOpacity onPress={handleSaveNote} className="items-center w-full py-4 bg-indigo-600 shadow-lg rounded-2xl active:scale-95 shadow-indigo-200">
                            <Text className="text-xs font-bold tracking-widest text-white uppercase">Simpan Catatan</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowNoteModal(false)} className="items-center py-3 mt-3">
                            <Text className="text-xs font-bold text-slate-400">Batal</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={showOpenTicketList} transparent animationType="slide">
                <View className="items-center justify-center flex-1 p-6 bg-black/60">
                    <View className="bg-white w-full max-w-2xl rounded-[50px] overflow-hidden shadow-2xl">
                        <View className="p-8 border-b border-slate-100 bg-slate-50/50">
                            <View className="flex-row items-center justify-between mb-6">
                                <View>
                                    <Text className="text-2xl font-black uppercase text-slate-900">DAFTAR TIKET AKTIF</Text>
                                    <Text className="mt-1 text-xs font-bold tracking-widest uppercase text-slate-400">Pilih tiket untuk melanjutkan</Text>
                                </View>
                                <TouchableOpacity onPress={() => { setShowOpenTicketList(false); setTicketSearch(''); }} className="p-3 bg-white rounded-full shadow-md">
                                    <X size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <View className="flex-row items-center px-5 bg-white border shadow-sm h-14 rounded-2xl border-slate-200">
                                <Search size={20} color="#94A3B8" />
                                <TextInput
                                    placeholder="Cari nama pelanggan atau nomor invoice..."
                                    className="flex-1 ml-3 font-bold outline-none text-slate-700"
                                    value={ticketSearch}
                                    onChangeText={setTicketSearch}
                                />
                                {ticketSearch !== '' && (
                                    <TouchableOpacity onPress={() => setTicketSearch('')}><X size={18} color="#CBD5E1" /></TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <ScrollView className="p-6 max-h-[550px]">
                            {pos.openTickets.filter((t: any) =>
                                (t.customerName?.toLowerCase() || '').includes(ticketSearch.toLowerCase()) ||
                                (t.invoiceNumber?.toLowerCase() || '').includes(ticketSearch.toLowerCase())
                            ).map((t: any) => (
                                <View key={t.id} className="flex-row items-center p-5 mb-4 border border-slate-100 rounded-[35px] shadow-sm bg-white">
                                    <TouchableOpacity
                                        onPress={() => { pos.loadTicket(t); setShowOpenTicketList(false); setTicketSearch(''); }}
                                        className="flex-row items-center flex-1"
                                    >
                                        <View className="items-center justify-center mr-4 w-14 h-14 bg-indigo-50 rounded-2xl">
                                            <Text className="text-lg font-black text-indigo-600">{t.customerName?.charAt(0) || 'C'}</Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-xl font-black text-slate-800" numberOfLines={1}>{t.customerName || 'Walk-in'}</Text>
                                            <Text className="mt-1 text-xs font-bold tracking-tighter uppercase text-slate-400">{t.invoiceNumber} • {new Date(t.createdAt).toLocaleTimeString()}</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <View className="items-end px-4">
                                        <Text className="text-lg font-black text-indigo-600">Rp {Number(t.totalAmount).toLocaleString('id-ID')}</Text>
                                        <Text className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md mt-1">{t.items.length} Items</Text>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => {
                                            const branchIdToUse = user?.branch?.id || user?.branchId;
                                            if (Platform.OS === 'web') {
                                                if (window.confirm("Apakah Anda yakin ingin membatalkan tiket ini secara permanen?")) {
                                                    api.patch(`/pos/orders/${t.id}/status`, { status: 'CANCELED' }).then(() => pos.fetchOpenTickets(branchIdToUse));
                                                }
                                            } else {
                                                Alert.alert("Batalkan Tiket", "Yakin batalkan tiket ini?", [
                                                    { text: "Batal", style: "cancel" },
                                                    { text: "Batalkan", style: "destructive", onPress: () => api.patch(`/pos/orders/${t.id}/status`, { status: 'CANCELED' }).then(() => pos.fetchOpenTickets(branchIdToUse)) }
                                                ]);
                                            }
                                        }}
                                        className="p-3 bg-rose-50 rounded-2xl"
                                    >
                                        <Trash2 size={18} color="#F43F5E" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {pos.openTickets.length === 0 && (
                                <View className="items-center py-10">
                                    <Text className="font-bold text-slate-400">Tidak ada tiket terbuka.</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={showSaveModal} transparent animationType="fade">
                <View className="items-center justify-center flex-1 p-6 bg-black/60">
                    <View className="bg-white w-full max-w-sm rounded-[45px] p-10 shadow-2xl">
                        <View className="items-center mb-8">
                            <View className="p-4 mb-4 bg-indigo-100 rounded-full"><Ticket size={40} color="#4F46E5" /></View>
                            <Text className="text-2xl italic font-black uppercase text-slate-900">SIMPAN DULU</Text>
                        </View>
                        {!pos.selectedMember && (
                            <MyInput label="Nama Pelanggan / Nomor Meja" placeholder="Ex: Meja 09" value={customerName} onChangeText={setCustomerName} primaryColor="#4F46E5" />
                        )}
                        <TouchableOpacity onPress={handleSaveTicket} className="w-full py-6 bg-indigo-600 rounded-[30px] items-center mt-8 shadow-xl shadow-indigo-300 active:scale-95">
                            <Text className="text-lg font-black tracking-widest text-white uppercase">SIMPAN TRANSAKSI</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowSaveModal(false)} className="items-center py-2 mt-6 bg-red-500 rounded-[30px] active:scale-95">
                            <Text className="text-sm font-bold tracking-widest text-white uppercase">BATALKAN</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <PaymentModal 
                visible={showPayment} 
                total={calculations.totalAfterPromo} 
                orderType={orderType} 
                onClose={() => setShowPayment(false)} 
            />
        </MainLayout>
    );
}