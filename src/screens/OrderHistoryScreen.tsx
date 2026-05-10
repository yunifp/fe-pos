import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, useWindowDimensions, RefreshControl, Platform, FlatList, KeyboardAvoidingView } from 'react-native';
import { Search, Receipt, Calendar, MapPin, TrendingUp, CreditCard, AlertCircle, CheckCircle2, Package, XCircle, ArrowRight, Printer, ChevronDown, Check, Filter, X, User, Star, Tag, StickyNote } from 'lucide-react-native';
import MainLayout from '../components/MainLayout';
import { useOrderHistoryStore } from '../stores/orderHistoryStore';
import { useBranchStore } from '../stores/branchStore';
import { useSettingStore } from '../stores/settingStore';
import { useReceiptStore } from '../stores/receiptStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { executePrint, generateReceiptHTML } from '../utils/printerDriver';
import DateTimePicker from '@react-native-community/datetimepicker';

const DATE_RANGES = [
    { label: 'Hari Ini', value: 'TODAY' },
    { label: '7 Hari', value: '7D' },
    { label: '14 Hari', value: '14D' },
    { label: 'Bulan Ini', value: 'MONTH' },
    { label: 'Kustom', value: 'CUSTOM' },
];

export default function OrderHistoryScreen() {
    const { width, height } = useWindowDimensions();

    // Breakpoints Dinamis
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const isMobile = width < 768;
    const isShortScreen = height < 600; // Untuk mode split screen horizontal

    const { settings, fetchSettings } = useSettingStore();
    const { orders, stats, isLoading, fetchHistory, handleRefund, requestRefund } = useOrderHistoryStore();
    const { branches, fetchBranches } = useBranchStore();
    const { fetchSetting: fetchReceiptSetting, setting: receiptSetting } = useReceiptStore();

    const [user, setUser] = useState<any>(null);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedRange, setSelectedRange] = useState('TODAY');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    const [refundReason, setRefundReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showRangeModal, setShowRangeModal] = useState(false);

    const [customStartDate, setCustomStartDate] = useState(new Date());
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    useEffect(() => {
        const init = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsed = JSON.parse(userData);
                setUser(parsed);
                const initialBranch = parsed.role === 'OWNER' ? 'all' : parsed.branch.id;
                setSelectedBranch(initialBranch);

                if (parsed.role === 'OWNER') fetchBranches();
                fetchHistory(initialBranch, 'TODAY');

                if (parsed.branch?.id) fetchReceiptSetting(parsed.branch.id);
            }
        };
        fetchSettings();
        init();
    }, []);

    useEffect(() => {
        if (selectedBranch !== 'all') {
            fetchReceiptSetting(selectedBranch);
        }
    }, [selectedBranch]);

    const onFilterChange = (branch: string, range: string) => {
        setSelectedBranch(branch);
        setSelectedRange(range);
        if (range !== 'CUSTOM') fetchHistory(branch, range);
    };

    const applyCustomDateFilter = () => {
        const startStr = customStartDate.toISOString().split('T')[0];
        const endStr = customEndDate.toISOString().split('T')[0];
        const rangeString = `CUSTOM&start=${startStr}&end=${endStr}`;
        fetchHistory(selectedBranch, rangeString);
    };

    const filteredOrders = useMemo(() => {
        return (orders || []).filter(o =>
            o.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [orders, searchQuery]);

    const handlePrintReceipt = async () => {
        if (!selectedOrder) return;
        if (!receiptSetting) {
            Alert.alert("Error", "Pengaturan struk belum dimuat. Mohon tunggu sebentar.");
            if (selectedOrder.branchId) await fetchReceiptSetting(selectedOrder.branchId);
            return;
        }

        setIsPrinting(true);
        try {
            const printData = { order: selectedOrder, receiptSetting: receiptSetting };
            const htmlContent = generateReceiptHTML(printData);
            await executePrint(printData, htmlContent);
        } catch (error: any) {
            console.error("Print Error:", error);
            Alert.alert("Gagal", `Terjadi kesalahan: ${error.message || error}`);
        } finally {
            setIsPrinting(false);
        }
    };

    const onProcessRefund = async (action: 'APPROVE' | 'REJECT') => {
        setIsSubmitting(true);
        try {
            await handleRefund(selectedOrder.id, action, user.id);
            Alert.alert("Sukses", `Refund berhasil ${action === 'APPROVE' ? 'disetujui' : 'ditolak'}`);
            setSelectedOrder(null);
            fetchHistory(selectedBranch, selectedRange);
        } catch (e) {
            Alert.alert("Gagal", "Terjadi kesalahan saat memproses refund");
        } finally { setIsSubmitting(false); }
    };

    const onRequestRefund = async () => {
        if (!refundReason) return Alert.alert("Peringatan", "Alasan refund wajib diisi");
        setIsSubmitting(true);
        try {
            await requestRefund(selectedOrder.id, refundReason, user.id);
            Alert.alert("Berhasil", "Permintaan refund telah dikirim ke Manager");
            setRefundReason('');
            setSelectedOrder(null);
            fetchHistory(selectedBranch, selectedRange);
        } catch (e) {
            Alert.alert("Gagal", "Gagal mengirim permintaan refund");
        } finally { setIsSubmitting(false); }
    };

    const selectedBranchName = useMemo(() => {
        if (selectedBranch === 'all') return 'SEMUA CABANG';
        const b = branches.find((br: any) => br.id === selectedBranch);
        return b ? b.name.toUpperCase() : 'SEMUA CABANG';
    }, [selectedBranch, branches]);

    const selectedRangeLabel = useMemo(() => {
        const r = DATE_RANGES.find(dr => dr.value === selectedRange);
        return r ? r.label.toUpperCase() : 'HARI INI';
    }, [selectedRange]);

    const renderDatePicker = (value: Date, show: boolean, setShow: (v: boolean) => void, onChange: (d: Date) => void) => {
        if (Platform.OS === 'web') {
            return (
                <input
                    type="date"
                    value={value.toISOString().split('T')[0]}
                    onChange={(e) => onChange(new Date(e.target.value))}
                    style={{ background: 'transparent', border: 'none', fontSize: '11px', fontWeight: '700', outline: 'none', color: '#1e293b', width: '100px' }}
                />
            );
        }
        return (
            <>
                <TouchableOpacity onPress={() => setShow(true)}>
                    <Text className="text-[11px] font-bold text-slate-800">{value.toLocaleDateString('id-ID')}</Text>
                </TouchableOpacity>
                {show && (
                    <DateTimePicker
                        value={value}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShow(false);
                            if (selectedDate) onChange(selectedDate);
                        }}
                    />
                )}
            </>
        );
    };

    return (
        <MainLayout>
            <ScrollView
                className="flex-1 bg-slate-50"
                contentContainerStyle={{ padding: isDesktop ? 24 : 12 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchHistory(selectedBranch, selectedRange)} />}
            >
                {/* --- HEADER COMPACT --- */}
                <View className={`${isMobile ? 'flex-col' : 'flex-row items-center justify-between'} mb-6`}>
                    <View className={isMobile ? 'mb-4' : ''}>
                        <Text className="text-[9px] font-black uppercase tracking-[2px] mb-0.5" style={{ color: settings.themeSecondaryColor }}>Riwayat</Text>
                        <Text className="text-lg font-black tracking-tighter uppercase text-slate-900">Transaksi Penjualan</Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                        {user?.role === 'OWNER' && (
                            <TouchableOpacity onPress={() => setShowBranchModal(true)} className="flex-row items-center h-10 px-3 bg-white border shadow-sm border-slate-200 rounded-xl">
                                <MapPin size={12} color={settings.themePrimaryColor} />
                                <Text className="ml-2 text-[10px] font-black text-slate-700" numberOfLines={1}>{selectedBranchName}</Text>
                                <ChevronDown size={12} color="#94A3B8" className="ml-1" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setShowRangeModal(true)} className="flex-row items-center h-10 px-3 bg-white border shadow-sm border-slate-200 rounded-xl">
                            <Calendar size={12} color={settings.themePrimaryColor} />
                            <Text className="ml-2 text-[10px] font-black text-slate-700">{selectedRangeLabel}</Text>
                            <ChevronDown size={12} color="#94A3B8" className="ml-1" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* CUSTOM DATE FILTER COMPACT */}
                {selectedRange === 'CUSTOM' && (
                    <View className="flex-row flex-wrap items-center gap-3 p-3 mb-6 bg-white border border-indigo-100 shadow-sm rounded-2xl">
                        <View className="flex-row items-center flex-1 gap-2">
                            <View className="flex-row items-center flex-1 px-3 py-2 border bg-slate-50 rounded-xl border-slate-100">
                                <Text className="text-[8px] font-black text-slate-400 uppercase mr-2">Start:</Text>
                                {renderDatePicker(customStartDate, showStartDatePicker, setShowStartDatePicker, setCustomStartDate)}
                            </View>
                            <ArrowRight size={14} color="#CBD5E1" />
                            <View className="flex-row items-center flex-1 px-3 py-2 border bg-slate-50 rounded-xl border-slate-100">
                                <Text className="text-[8px] font-black text-slate-400 uppercase mr-2">End:</Text>
                                {renderDatePicker(customEndDate, showEndDatePicker, setShowEndDatePicker, setCustomEndDate)}
                            </View>
                        </View>
                        <TouchableOpacity onPress={applyCustomDateFilter} className="items-center justify-center h-10 px-5 rounded-xl" style={{ backgroundColor: settings.themePrimaryColor }}>
                            <Text className="text-[9px] font-black text-white uppercase">Filter</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* STATS TILES COMPACT */}
                <View className="flex-row flex-wrap gap-2 mb-6">
                    <StatCard title="Omzet" value={`Rp ${Number(stats?.totalOmzet || 0).toLocaleString()}`} icon={<TrendingUp color="white" size={14} />} settings={settings} isPrimary />
                    <StatCard title="Total" value={stats?.totalCount || 0} icon={<Package color="#64748B" size={14} />} settings={settings} />
                    <StatCard title="Paid" value={stats?.paidCount || 0} icon={<CheckCircle2 color="#10B981" size={14} />} settings={settings} dotColor="bg-emerald-500" />
                    <StatCard title="Pending" value={stats?.refundPendingCount || 0} icon={<AlertCircle color="#F59E0B" size={14} />} settings={settings} dotColor="bg-amber-500" />
                    <StatCard title="Refunded" value={stats?.refundedCount || 0} icon={<XCircle color="#F43F5E" size={14} />} settings={settings} dotColor="bg-rose-500" />
                </View>

                {/* SEARCH BAR SLEEK */}
                <View className="flex-row items-center h-12 px-4 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
                    <Search size={16} color="#94A3B8" />
                    <TextInput
                        placeholder="Cari invoice atau nama pelanggan..."
                        placeholderTextColor="#CBD5E1"
                        className="flex-1 py-0 ml-3 text-xs font-bold text-slate-700"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* ORDER GRID */}
                {isLoading ? (
                    <View className="py-20"><ActivityIndicator size="large" color="#6366F1" /></View>
                ) : (
                    <View className="flex-row flex-wrap gap-3">
                        {filteredOrders.length > 0 ? filteredOrders.map(order => (
                            <OrderListItem key={order.id} order={order} width={width} isDesktop={isDesktop} isTablet={isTablet} onPress={() => setSelectedOrder(order)} />
                        )) : (
                            <View className="items-center w-full py-20">
                                <Receipt size={40} color="#E2E8F0" />
                                <Text className="mt-4 text-xs font-bold text-slate-400">Tidak ada transaksi ditemukan</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* --- MODAL DETAIL ORDER RESPONSIVE --- */}
                <Modal
                    visible={!!selectedOrder}
                    transparent
                    animationType="fade"
                    onRequestClose={() => { setSelectedOrder(null); setRefundReason(''); }}
                >
                    <View className="items-center justify-center flex-1 p-4 bg-slate-900/80">
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            className="w-full max-w-lg"
                            // Penting untuk Web agar tidak dipaksa full height
                            style={{ flexShrink: 1 }}
                        >
                            {/* BOX MODAL UTAMA */}
                            <View
                                style={{
                                    maxHeight: height * 0.9, // Batasi 80% dari tinggi layar (Pixel Based)
                                    width: '100%',
                                }}
                                className="bg-white rounded-[32px] overflow-hidden shadow-2xl"
                            >

                                {/* HEADER: Invoice & Status */}
                                <View className="flex-row items-center justify-between px-6 py-5 border-b border-slate-50 bg-slate-50/50">
                                    <View>
                                        <View className="flex-row items-center mb-1">
                                            <View className={`px-2 py-0.5 rounded-md mr-2 ${selectedOrder?.paymentStatus === 'PAID' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                                                <Text className={`text-[8px] font-black uppercase ${selectedOrder?.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    {selectedOrder?.paymentStatus}
                                                </Text>
                                            </View>
                                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                {new Date(selectedOrder?.createdAt).toLocaleString('id-ID')}
                                            </Text>
                                        </View>
                                        <Text className="text-base italic font-black uppercase text-slate-800">{selectedOrder?.invoiceNumber}</Text>
                                        <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kasir: {selectedOrder?.cashier?.fullName}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => { setSelectedOrder(null); setRefundReason(''); }}
                                        className="p-2 bg-white border rounded-full shadow-sm border-slate-100"
                                    >
                                        <X size={20} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView className="max-h-[500px]" showsVerticalScrollIndicator={false}>
                                    <View className="p-6">

                                        {/* MEMBER SECTION (Jika Ada) */}
                                        {selectedOrder?.member && (
                                            <View className="flex-row items-center p-4 mb-6 border border-indigo-100 bg-indigo-50/50 rounded-2xl">
                                                <View className="p-2 bg-white shadow-sm rounded-xl"><User size={20} color="#4F46E5" /></View>
                                                <View className="flex-1 ml-3">
                                                    <Text className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Pelanggan Member</Text>
                                                    <Text className="text-sm font-black uppercase text-slate-800">{selectedOrder.member.name}</Text>
                                                    <View className="flex-row items-center mt-1">
                                                        <View className="flex-row items-center mr-3">
                                                            <Star size={10} color="#059669" />
                                                            <Text className="text-[9px] font-bold text-emerald-600 ml-1">+{selectedOrder.earnedPoints} Poin Baru</Text>
                                                        </View>
                                                        {selectedOrder.redeemedPoints > 0 && (
                                                            <Text className="text-[9px] font-bold text-rose-500">Pakai {selectedOrder.redeemedPoints} Poin</Text>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        )}

                                        {/* ITEMS LIST */}
                                        <Text className="mb-3 ml-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Pesanan</Text>
                                        {selectedOrder?.items.map((item: any) => (
                                            <View key={item.id} className="pb-4 mb-4 border-b border-slate-50">
                                                <View className="flex-row items-start justify-between">
                                                    <View className="flex-1 mr-4">
                                                        <Text className="text-xs font-black tracking-tight uppercase text-slate-800">
                                                            {item.variant.product.name}
                                                        </Text>
                                                        <View className="flex-row items-center mt-0.5">
                                                            <Text className="text-[10px] font-bold text-slate-400">{item.quantity}x @ Rp {Number(item.price).toLocaleString()}</Text>
                                                            <View className="w-1 h-1 mx-2 rounded-full bg-slate-200" />
                                                            <Text className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">{item.variant.name}</Text>
                                                        </View>

                                                        {/* Item Discount & Notes */}
                                                        <View className="flex-row flex-wrap gap-1 mt-2">
                                                            {Number(item.discount) > 0 && (
                                                                <View className="bg-rose-50 px-2 py-0.5 rounded-md flex-row items-center border border-rose-100">
                                                                    <Tag size={8} color="#F43F5E" />
                                                                    <Text className="text-[8px] font-bold text-rose-600 ml-1">Pot. Rp {Number(item.discount).toLocaleString()}</Text>
                                                                </View>
                                                            )}
                                                            {item.notes ? (
                                                                <View className="bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 flex-row items-center">
                                                                    <StickyNote size={8} color="#D97706" />
                                                                    <Text className="text-[8px] font-bold text-amber-600 italic ml-1">"{item.notes}"</Text>
                                                                </View>
                                                            ) : null}
                                                        </View>
                                                    </View>
                                                    <Text className="text-xs font-black text-slate-900">Rp {Number(item.subtotal).toLocaleString()}</Text>
                                                </View>
                                            </View>
                                        ))}

                                        {/* PROMOTIONS APPLIED (Bundle/Transaction) */}
                                        {selectedOrder?.appliedPromotions && selectedOrder.appliedPromotions.length > 0 && (
                                            <View className="mb-6">
                                                <Text className="mb-3 ml-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Promo Digunakan</Text>
                                                {selectedOrder.appliedPromotions.map((ap: any) => (
                                                    <View key={ap.id} className="flex-row items-center justify-between p-3 mb-2 border bg-emerald-50 border-emerald-100 rounded-xl">
                                                        <View className="flex-row items-center">
                                                            <View className="p-1.5 bg-emerald-500 rounded-lg"><Tag size={12} color="white" /></View>
                                                            <View className="ml-3">
                                                                <Text className="text-[10px] font-black text-emerald-800 uppercase leading-none">{ap.promotion.name}</Text>
                                                                <Text className="text-[8px] font-bold text-emerald-600 uppercase mt-0.5 tracking-tighter">{ap.promotion.type}</Text>
                                                            </View>
                                                        </View>
                                                        <Text className="text-[11px] font-black text-emerald-700">- Rp {Number(ap.discountAmount).toLocaleString()}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {/* BILLING SUMMARY */}
                                        <View className="p-5 shadow-xl bg-slate-900 rounded-3xl">
                                            <View className="flex-row justify-between mb-2">
                                                <Text className="text-slate-500 text-[10px] font-bold uppercase">Subtotal</Text>
                                                <Text className="text-xs font-bold text-slate-300">Rp {Number(selectedOrder?.subtotal).toLocaleString()}</Text>
                                            </View>
                                            <View className="flex-row justify-between mb-2">
                                                <Text className="text-rose-400 text-[10px] font-bold uppercase">Total Diskon</Text>
                                                <Text className="text-xs font-black text-rose-400">- Rp {Number(selectedOrder?.discount).toLocaleString()}</Text>
                                            </View>
                                            <View className="flex-row justify-between pt-2 mb-3 border-t border-white/5">
                                                <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-[2px]">Total Akhir</Text>
                                                <Text className="text-xl italic font-black text-indigo-400">Rp {Number(selectedOrder?.totalAmount).toLocaleString()}</Text>
                                            </View>

                                            {/* Payment Method Badge */}
                                            <View className="flex-row items-center self-start px-3 py-1 mt-2 border rounded-full bg-white/10 border-white/5">
                                                <CreditCard size={10} color="#94A3B8" />
                                                <Text className="text-[8px] font-black text-slate-300 uppercase ml-1.5 tracking-widest">
                                                    Metode: {selectedOrder?.paymentMethod || 'BELUM BAYAR'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* REFUND AREA (Kondisi Cashier / Manager) */}
                                        <View className="mt-6">
                                            {user?.role === 'CASHIER' && selectedOrder?.paymentStatus === 'PAID' && (
                                                <View className="p-4 border bg-rose-50 rounded-2xl border-rose-100">
                                                    <Text className="text-[9px] font-black text-rose-600 uppercase mb-2">Pengajuan Refund</Text>
                                                    <TextInput
                                                        placeholder="Alasan pembatalan/refund..."
                                                        placeholderTextColor="#FDA4AF"
                                                        multiline numberOfLines={2}
                                                        className="p-3 mb-3 text-[10px] font-bold bg-white rounded-xl border border-rose-100 text-slate-700"
                                                        value={refundReason}
                                                        onChangeText={setRefundReason}
                                                        textAlignVertical="top"
                                                    />
                                                    <TouchableOpacity
                                                        onPress={onRequestRefund}
                                                        disabled={isSubmitting}
                                                        className="items-center py-3.5 bg-rose-500 rounded-xl shadow-sm active:bg-rose-600"
                                                    >
                                                        {isSubmitting ? <ActivityIndicator color="white" size="small" /> : <Text className="text-white font-black uppercase text-[10px] tracking-widest">Kirim Pengajuan</Text>}
                                                    </TouchableOpacity>
                                                </View>
                                            )}

                                            {(user?.role === 'MANAGER' || user?.role === 'OWNER') && selectedOrder?.paymentStatus === 'REFUND_PENDING' && (
                                                <View className="p-4 border shadow-sm bg-amber-50 rounded-2xl border-amber-200">
                                                    <View className="flex-row items-center mb-2">
                                                        <AlertCircle size={16} color="#D97706" />
                                                        <Text className="ml-2 text-[11px] font-black uppercase text-amber-800">Butuh Persetujuan Refund</Text>
                                                    </View>
                                                    <Text className="mb-4 text-[10px] italic font-medium text-slate-600 bg-white/50 p-3 rounded-xl border border-amber-100">
                                                        "{selectedOrder?.refundRequest?.reason || 'Tidak ada alasan'}"
                                                    </Text>
                                                    <View className="flex-row gap-2">
                                                        <TouchableOpacity onPress={() => onProcessRefund('APPROVE')} className="flex-1 py-3.5 bg-emerald-500 rounded-xl items-center shadow-md active:bg-emerald-600">
                                                            <Text className="text-white font-black uppercase text-[10px]">Setujui</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => onProcessRefund('REJECT')} className="flex-1 py-3.5 bg-white border border-slate-200 rounded-xl items-center active:bg-slate-50">
                                                            <Text className="text-slate-600 font-black uppercase text-[10px]">Tolak</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            )}
                                        </View>

                                    </View>
                                </ScrollView>

                                {/* FOOTER ACTIONS: Print Receipt */}
                                <View className="flex-row gap-2 p-6 border-t border-slate-50 bg-slate-50/30">
                                    <TouchableOpacity
                                        onPress={handlePrintReceipt}
                                        disabled={isPrinting}
                                        className="flex-1 flex-row items-center justify-center h-14 rounded-[20px] shadow-lg shadow-indigo-100"
                                        style={{ backgroundColor: settings.themeSecondaryColor }}
                                    >
                                        {isPrinting ? <ActivityIndicator color="white" size="small" /> : (
                                            <>
                                                <Printer size={18} color="white" strokeWidth={2.5} />
                                                <Text className="text-white font-black uppercase text-[11px] tracking-[2px] ml-2 italic">Cetak Struk</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>

                {/* MODALS PERSISTED (MODAL CABANG & PERIODE) */}
                <SelectionModal visible={showBranchModal} title="Pilih Cabang" data={[{ id: 'all', name: 'Semua Cabang' }, ...branches]} selectedId={selectedBranch} onSelect={(id: string) => { onFilterChange(id, selectedRange); setShowBranchModal(false); }} onClose={() => setShowBranchModal(false)} />
                <SelectionModal visible={showRangeModal} title="Pilih Periode" data={DATE_RANGES.map(d => ({ id: d.value, name: d.label }))} selectedId={selectedRange} onSelect={(id: string) => { onFilterChange(selectedBranch, id); setShowRangeModal(false); }} onClose={() => setShowRangeModal(false)} />

            </ScrollView>
        </MainLayout>
    );
}

// --- REUSABLE SUB COMPONENTS ---

const SelectionModal = ({ visible, title, data, selectedId, onSelect, onClose }: any) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View className="items-center justify-center flex-1 p-6 bg-black/60">
            <View className="w-full max-w-sm p-6 bg-white rounded-[32px] shadow-2xl">
                <View className="flex-row items-center justify-between mb-5">
                    <Text className="text-lg italic font-black uppercase text-slate-800">{title}</Text>
                    <TouchableOpacity onPress={onClose}><XCircle size={20} color="#94A3B8" /></TouchableOpacity>
                </View>
                <FlatList
                    data={data}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            className={`flex-row items-center justify-between p-4 mb-2 rounded-2xl ${selectedId === item.id ? 'bg-indigo-600 shadow-md shadow-indigo-200' : 'bg-slate-50'}`}
                            onPress={() => onSelect(item.id)}
                        >
                            <Text className={`text-xs font-black uppercase ${selectedId === item.id ? 'text-white' : 'text-slate-600'}`}>{item.name}</Text>
                            {selectedId === item.id && <Check size={16} color="white" />}
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
    </Modal>
);

const StatCard = ({ title, value, icon, isPrimary, dotColor, settings }: any) => {
    const { width } = useWindowDimensions();
    const cardWidth = width < 480 ? '48%' : width < 1024 ? '31.5%' : '19%';

    return (
        <View
            style={{ width: cardWidth, backgroundColor: isPrimary ? settings.themePrimaryColor : 'white' }}
            className={`p-3 rounded-2xl border border-slate-100 shadow-sm h-24 justify-center`}
        >
            <View className="flex-row items-center justify-between mb-1.5">
                <View className={`p-1.5 ${isPrimary ? 'bg-white/20' : 'bg-slate-50'} rounded-lg`}>{icon}</View>
                {dotColor && <View className={`w-2 h-2 rounded-full ${dotColor}`} />}
            </View>
            <Text className={`${isPrimary ? 'text-white/60' : 'text-slate-400'} text-[7px] font-black uppercase tracking-widest`}>{title}</Text>
            <Text numberOfLines={1} className={`${isPrimary ? 'text-white' : 'text-slate-800'} text-xs font-black`}>{value}</Text>
        </View>
    );
};

const OrderListItem = ({ order, width, isDesktop, isTablet, onPress }: any) => {
    // Grid Logic
    const itemWidth = isDesktop ? '24%' : isTablet ? '48.5%' : '100%';

    return (
        <TouchableOpacity
            onPress={onPress}
            style={{ width: itemWidth }}
            className="p-4 bg-white border shadow-sm rounded-2xl border-slate-100 active:bg-slate-50"
        >
            <View className="flex-row items-center justify-between mb-3">
                <View className="px-2 py-0.5 rounded-md bg-slate-100">
                    <Text className="text-[8px] font-black text-slate-500">{order.invoiceNumber}</Text>
                </View>
                <View className="flex-row gap-1">
                    <StatusBadge status={order.paymentStatus} />
                </View>
            </View>

            <View className="mb-3">
                <Text className="text-[10px] font-black text-slate-800 uppercase" numberOfLines={1}>
                    {order.customerName || 'Walk-in Guest'}
                </Text>
                <View className="flex-row items-center mt-1">
                    <Calendar size={8} color="#94A3B8" />
                    <Text className="text-[8px] font-bold text-slate-400 ml-1">
                        {new Date(order.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>

            <View className="flex-row items-center justify-between pt-3 border-t border-slate-50">
                <OrderStatusBadge status={order.status} />
                <Text className="text-[11px] font-black text-indigo-600">Rp {Number(order.totalAmount).toLocaleString()}</Text>
            </View>
        </TouchableOpacity>
    );
};

const OrderStatusBadge = ({ status }: any) => {
    const config: any = {
        PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
        COOKING: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
        READY: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
        COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
        CANCELLED: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
    };
    const s = config[status] || { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400' };
    return (
        <View className={`${s.bg} px-1.5 py-0.5 rounded-md flex-row items-center`}>
            <View className={`w-1 h-1 rounded-full ${s.dot} mr-1`} />
            <Text className={`text-[7px] font-black uppercase ${s.text}`}>{status}</Text>
        </View>
    );
};

const StatusBadge = ({ status }: any) => {
    const config: any = {
        PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
        REFUND_PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
        REFUNDED: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
    };
    const s = config[status] || { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400' };
    return (
        <View className={`${s.bg} px-1.5 py-0.5 rounded-md flex-row items-center`}>
            <View className={`w-1 h-1 rounded-full ${s.dot} mr-1`} />
            <Text className={`text-[7px] font-black uppercase ${s.text}`}>{status.replace('_', ' ')}</Text>
        </View>
    );
};