import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    Image, Modal, useWindowDimensions, KeyboardAvoidingView, Platform,
    Alert
} from 'react-native';
import {
    Search, ShoppingCart, Trash2, Plus, Minus, X,
    LayoutGrid, LayoutList, Ticket, Clock,
    ChevronRight, LayoutPanelLeft,
    Package, StickyNote, Edit3,
    Tag, Calculator, Delete
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

    // Breakpoints yang lebih agresif untuk responsivitas tinggi
    const isLarge = width >= 1024;
    const isMedium = width >= 768;
    const isSmall = width < 768;

    // Perhitungan kolom produk dinamis
    const getColumnCount = () => {
        const availableWidth = !isLarge && pos.isCartVisible ? 0 : width;
        if (isLarge) return 3;
        if (isMedium) return 2;
        return 2;
    };

    const pos = usePOSStore();
    const { products, fetchProducts } = useProductStore();
    const { categories, fetchCategories } = useCategoryStore();

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

    // --- STATE BARU UNTUK NOTES ---
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [currentNote, setCurrentNote] = useState('');
    const [activeVariantIdForNote, setActiveVariantIdForNote] = useState<number | null>(null);

    // --- STATE BARU UNTUK OPEN PRICE ---
    const [showOpenPriceModal, setShowOpenPriceModal] = useState(false);
    const [manualPrice, setManualPrice] = useState('');
    const [pendingItem, setPendingItem] = useState<{ product: any, variant: any } | null>(null);

    useEffect(() => {
        if (isMedium) {
            pos.setCartVisible(true);
        } else {
            pos.setCartVisible(false);
        }
    }, [isMedium]);

    useEffect(() => {
        const init = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const branchId = user.branch.id;
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

    const totals = useMemo(() => {
        const subtotal = pos.cart.reduce((acc: number, i: any) => acc + i.subtotal, 0);
        return { subtotal, total: subtotal };
    }, [pos.cart]);

    const handleProductPress = (product: any) => {
        if (product.hasVariants && product.variants.length > 1) {
            setSelectedProduct(product);
            setShowVariantModal(true);
        } else {
            const variant = product.variants[0];
            if (product.openPrice) {
                setPendingItem({ product, variant });
                setManualPrice('');
                setShowOpenPriceModal(true);
            } else {
                pos.addToCart(product, variant);
            }
        }
    };

    // --- LOGIKA BUKA MODAL NOTE ---
    const handleOpenNote = (item: any) => {
        setActiveVariantIdForNote(item.variantId);
        setCurrentNote(item.notes || '');
        setShowNoteModal(true);
    };

    // --- LOGIKA SIMPAN NOTE KE STORE ---
    const handleSaveNote = () => {
        if (activeVariantIdForNote) {
            pos.updateItemNotes(activeVariantIdForNote, currentNote);
        }
        setShowNoteModal(false);
        setCurrentNote('');
        setActiveVariantIdForNote(null);
    };

    // --- LOGIKA KALKULATOR OPEN PRICE ---
    const handlePressCalc = (num: string) => {
        setManualPrice(prev => prev + num);
    };

    const handleClearCalc = () => setManualPrice('');
    const handleBackspaceCalc = () => setManualPrice(prev => prev.slice(0, -1));

    const handleConfirmOpenPrice = () => {
        const price = Number(manualPrice);
        if (!manualPrice || price <= 0) {
            return Alert.alert("Harga Wajib Diisi", "Mohon masukkan nominal harga yang valid.");
        }
        if (pendingItem) {
            // Kita buat clone variant dengan harga yang diinput manual
            const variantWithManualPrice = { ...pendingItem.variant, price: price };
            pos.addToCart(pendingItem.product, variantWithManualPrice);
        }
        setShowOpenPriceModal(false);
        setManualPrice('');
        setPendingItem(null);
    };

    const handleSaveTicket = async () => {
        if (!customerName && !pos.currentOrder?.customerName) return alert("Mohon isi Nama Pelanggan");
        try {
            const payload = {
                id: pos.currentOrder?.id || null,
                items: pos.cart.map((item: any) => ({
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price: item.price,
                    hpp: item.hpp,
                    originalPrice: item.originalPrice || item.price,
                    subtotal: item.subtotal,
                    discount: (Number(item.originalPrice || item.price) - Number(item.price)) * item.quantity,
                    notes: item.notes || ""
                })),
                customerName: customerName || pos.currentOrder?.customerName,
                subtotal: totals.subtotal,
                totalAmount: totals.total,
                status: 'PENDING',
                paymentStatus: 'UNPAID',
                orderType,
                memberId: pos.selectedMember?.id || null
            };
            await api.post('/orders/pos', payload);
            alert("Tiket Berhasil Disimpan!");
            pos.resetPOS();
            setShowSaveModal(false);
            setCustomerName('');
        } catch (e: any) {
            alert("Gagal Simpan: " + (e.response?.data?.message || "Error"));
        }
    };

    const filteredProducts = products.filter((p: any) =>
        p.name.toLowerCase().includes(search.toLowerCase()) && (!selectedCat || p.categoryId === selectedCat)
    );

    return (
        <MainLayout>
            <View className="relative flex-row flex-1 bg-slate-50">

                {/* --- CATALOG AREA --- */}
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
                                keyboardType="default"
                            />
                            {search !== '' && (
                                <TouchableOpacity onPress={() => setSearch('')}>
                                    <X size={16} color="#CBD5E1" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={async () => { await pos.fetchOpenTickets(); setShowOpenTicketList(true); }}
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
                                            <Text className="mt-0.5 text-[11px] font-black" style={{ color: settings.themeSecondaryColor }}>
                                                {p.openPrice ? "Open Price" : `Rp ${p.variants.length > 1 ? Math.min(...p.variants.map((v: any) => Number(v.price))).toLocaleString() : Number(p.variants[0].price).toLocaleString()}`}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* --- SIDEBAR CART --- */}
                {pos.isCartVisible && (
                    <View
                        style={{
                            width: isLarge ? 380 : width,
                            position: isLarge ? 'relative' : 'absolute',
                            right: 0, top: 0, bottom: 0, zIndex: 100
                        }}
                        className="h-full bg-white border-l shadow-2xl border-slate-100"
                    >
                        <View className="flex-1 p-5">
                            <View className="flex-row items-center justify-between mb-5">
                                <View className="flex-row items-center">
                                    <TouchableOpacity onPress={() => pos.setCartVisible(false)} className="p-2 mr-2 rounded-full bg-slate-100"><ChevronRight size={20} color="#64748B" /></TouchableOpacity>
                                    <Text className="text-xl font-black text-slate-800">KERANJANG</Text>
                                </View>
                                <TouchableOpacity onPress={() => pos.resetPOS()} className="p-2 bg-rose-50 rounded-xl"><Trash2 size={18} color="#F43F5E" /></TouchableOpacity>
                            </View>

                            <View className="flex-row p-1 mb-4 bg-slate-100 rounded-xl">
                                {['DINE_IN', 'TAKE_HOME', 'ONLINE'].map((type) => (
                                    <TouchableOpacity key={type} onPress={() => setOrderType(type as any)} className={`flex-1 py-2 rounded-lg items-center ${orderType === type ? 'bg-white shadow-sm' : ''}`}>
                                        <Text className={`font-black text-[9px] ${orderType === type ? 'text-indigo-600' : 'text-slate-400'}`}>{type.replace('_', ' ')}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                                {pos.cart.map((item: any) => (
                                    <View className="flex-row p-3 mb-2 bg-white border border-slate-100 rounded-xl" key={item.variantId}>
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
                                                        <Text className="text-[10px] font-black text-red-600">
                                                            Rp {item.price.toLocaleString()}
                                                        </Text>
                                                        <Text className="ml-2 text-[8px] text-slate-300 line-through">
                                                            Rp {item.originalPrice.toLocaleString()}
                                                        </Text>
                                                    </>
                                                )}
                                                {item.isBundleApplied && (
                                                    <>
                                                        <Tag size={10} color="#10B981" style={{ marginRight: 4 }} />
                                                        <Text className="text-[10px] font-black text-emerald-600">
                                                            Bundle Applied
                                                        </Text>
                                                    </>
                                                )}
                                                {!item.isProductDiscounted && !item.isBundleApplied && (
                                                    <Text className="text-[10px] font-black text-slate-400">
                                                        Rp {item.price.toLocaleString()}
                                                    </Text>
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

                            <View className="pt-4 border-t border-slate-100">
                                <View className="flex-row items-end justify-between mb-4">
                                    <Text className="text-sm font-bold uppercase text-slate-400">Total</Text>
                                    <Text className="text-xl font-black text-indigo-600">Rp {totals.total.toLocaleString()}</Text>
                                </View>
                                <View className="flex-row gap-2">
                                    <TouchableOpacity onPress={() => setShowSaveModal(true)} className="items-center justify-center p-3 border bg-slate-50 rounded-2xl border-slate-200">
                                        <Ticket size={20} color="#64748B" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setShowPayment(true)} disabled={pos.cart.length === 0} className={`flex-1 py-4 rounded-2xl items-center ${pos.cart.length === 0 ? 'bg-slate-200' : 'bg-indigo-600 shadow-lg'}`}>
                                        <Text className="text-lg font-black text-white uppercase">BAYAR</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* --- MODAL PILIHAN VARIAN --- */}
            <Modal visible={showVariantModal} transparent animationType="fade">
                <View className="items-center justify-center flex-1 p-6 bg-black/60">
                    <View className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl">
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-xl italic font-black uppercase text-slate-900">Pilih Varian</Text>
                            <TouchableOpacity onPress={() => setShowVariantModal(false)} className="p-2 rounded-full bg-slate-100"><X size={20} color="gray" /></TouchableOpacity>
                        </View>
                        <Text className="mb-4 text-base font-bold text-slate-500">{selectedProduct?.name}</Text>
                        <ScrollView className="max-h-80">
                            {selectedProduct?.variants.map((v: any) => (
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

            {/* --- MODAL OPEN PRICE (KALKULATOR COMPACT) --- */}
            <Modal visible={showOpenPriceModal} transparent animationType="fade">
                <View className="items-center justify-center flex-1 p-4 bg-black/60">
                    {/* Container Utama: Menggunakan max-height agar tidak penuh dan max-width agar proporsional */}
                    <View
                        style={{ maxHeight: height * 0.85 }}
                        className="bg-white w-full max-w-[340px] rounded-[40px] p-5 shadow-2xl overflow-hidden"
                    >
                        {/* Header Area */}
                        <View className="items-center mb-3">
                            <View className="p-2.5 mb-2 bg-indigo-50 rounded-2xl">
                                <Calculator size={24} color="#4F46E5" />
                            </View>
                            <Text className="text-lg font-black uppercase text-slate-800">Input Harga</Text>
                            <Text className="text-[10px] font-bold text-slate-400 text-center px-2" numberOfLines={1}>
                                {pendingItem?.product?.name}
                            </Text>
                        </View>

                        {/* Display Harga & Tombol Clear (C) */}
                        <View className="flex-row items-center w-full h-16 px-4 mb-4 border bg-slate-50 rounded-3xl border-slate-100">
                            <Text className="flex-1 text-2xl font-black text-indigo-600">
                                Rp {Number(manualPrice || 0).toLocaleString('id-ID')}
                            </Text>
                            {/* Tombol Clear diletakkan di samping harga agar grid bawah lebih rapi */}
                            <TouchableOpacity
                                onPress={handleClearCalc}
                                className="p-2 bg-rose-100 rounded-xl active:bg-rose-200"
                            >
                                <Text className="text-xs font-black text-rose-600">C</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Calculator Grid */}
                        <View className="w-full">
                            {/* Baris 1 & 2 (Isi 4 Angka per Baris) */}
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

                            {/* Baris Terakhir (Isi 3 Angka/Fungsi) */}
                            <View className="flex-row justify-between">
                                <TouchableOpacity
                                    onPress={() => handlePressCalc('9')}
                                    className="w-[31%] h-12 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm active:bg-slate-50"
                                >
                                    <Text className="text-lg font-black text-slate-800">9</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handlePressCalc('0')}
                                    className="w-[31%] h-12 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm active:bg-slate-50"
                                >
                                    <Text className="text-lg font-black text-slate-800">0</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleBackspaceCalc}
                                    className="w-[31%] h-12 items-center justify-center rounded-2xl bg-slate-100 active:bg-slate-200"
                                >
                                    <Delete size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View className="mt-6">
                            <TouchableOpacity
                                onPress={handleConfirmOpenPrice}
                                className="items-center w-full py-4 bg-indigo-600 shadow-lg rounded-2xl shadow-indigo-200 active:scale-95"
                            >
                                <Text className="text-sm font-black tracking-widest text-white uppercase">TAMBAHKAN</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => { setShowOpenPriceModal(false); setPendingItem(null); }}
                                className="items-center py-3 mt-1"
                            >
                                <Text className="text-[10px] font-bold uppercase text-slate-400">Batalkan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* --- MODAL INPUT CATATAN (NOTES) --- */}
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

            {/* --- MODAL DAFTAR TICKET --- */}
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
                                    {/* AREA KLIK UNTUK LOAD TICKET */}
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

                                    {/* INFO HARGA & JUMLAH ITEM */}
                                    <View className="items-end px-4">
                                        <Text className="text-lg font-black text-indigo-600">Rp {Number(t.totalAmount).toLocaleString('id-ID')}</Text>
                                        <Text className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md mt-1">{t.items.length} Items</Text>
                                    </View>

                                    {/* TOMBOL HAPUS TIKET */}
                                    <TouchableOpacity
                                        onPress={() => {
                                            const title = "Hapus Tiket";
                                            const message = "Apakah Anda yakin ingin menghapus tiket ini secara permanen?";

                                            // --- LOGIKA UNTUK WEB ---
                                            if (Platform.OS === 'web') {
                                                const confirmed = window.confirm(`${title}\n\n${message}`);
                                                if (confirmed) {
                                                    // Jalankan fungsi hapus langsung jika dikonfirmasi di web
                                                    (async () => {
                                                        try {
                                                            await api.delete(`/orders/${t.id}`);
                                                            await pos.fetchOpenTickets();
                                                        } catch (e) {
                                                            alert("Gagal menghapus tiket yang sudah dibayar atau terjadi kesalahan server.");
                                                        }
                                                    })();
                                                }
                                            }
                                            // --- LOGIKA UNTUK ANDROID/IOS ---
                                            else {
                                                Alert.alert(
                                                    title,
                                                    message,
                                                    [
                                                        { text: "Batal", style: "cancel" },
                                                        {
                                                            text: "Hapus",
                                                            style: "destructive",
                                                            onPress: async () => {
                                                                try {
                                                                    await api.delete(`/orders/${t.id}`);
                                                                    await pos.fetchOpenTickets();
                                                                } catch (e) {
                                                                    Alert.alert("Gagal", "Tidak dapat menghapus tiket yang sudah dibayar atau terjadi kesalahan server.");
                                                                }
                                                            }
                                                        }
                                                    ]
                                                );
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

            {/* --- MODAL SIMPAN TICKET --- */}
            <Modal visible={showSaveModal} transparent animationType="fade">
                <View className="items-center justify-center flex-1 p-6 bg-black/60">
                    <View className="bg-white w-full max-w-sm rounded-[45px] p-10 shadow-2xl">
                        <View className="items-center mb-8">
                            <View className="p-4 mb-4 bg-indigo-100 rounded-full"><Ticket size={40} color="#4F46E5" /></View>
                            <Text className="text-2xl italic font-black uppercase text-slate-900">SIMPAN DULU</Text>
                        </View>
                        <MyInput label="Nama Pelanggan / Nomor Meja" placeholder="Ex: Meja 09" value={customerName} onChangeText={setCustomerName} primaryColor="#4F46E5" />
                        <TouchableOpacity onPress={handleSaveTicket} className="w-full py-6 bg-indigo-600 rounded-[30px] items-center mt-8 shadow-xl shadow-indigo-300 active:scale-95">
                            <Text className="text-lg font-black tracking-widest text-white uppercase">SIMPAN TRANSAKSI</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowSaveModal(false)} className="items-center py-2 mt-6 bg-red-500 rounded-[30px] active:scale-95">
                            <Text className="text-sm font-bold tracking-widest text-white uppercase">BATALKAN</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <PaymentModal visible={showPayment} total={totals.total} orderType={orderType} onClose={() => setShowPayment(false)} />
        </MainLayout>
    );
}
