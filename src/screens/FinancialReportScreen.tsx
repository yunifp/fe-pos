import React, { useState, useEffect, useMemo, createElement } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator, Platform, Alert, StyleSheet } from 'react-native';
import { TrendingUp, Wallet, ArrowDownCircle, Download, Layers, ChevronLeft, ChevronRight, ReceiptText, Banknote, Landmark, Search, Filter, Calendar as CalendarIcon, ArrowRight } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx-js-style';

// Components
import MainLayout from '../components/MainLayout';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import FinancialStatCard from '../components/FinancialStatCard';

// Stores
import { useFinancialStore } from '../stores/financialStore';
import { useBranchStore } from '../stores/branchStore';

export default function FinancialReportScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 768;

    const store = useFinancialStore();
    const { branches, fetchBranches } = useBranchStore();

    const [user, setUser] = useState<any>(null);
    const [tabAktif, setTabAktif] = useState<'KAS' | 'PENJUALAN' | 'BELANJA'>('KAS');
    const [halamanSekarang, setHalamanSekarang] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [showPicker, setShowPicker] = useState<'START' | 'END' | null>(null);
    const [activeRange, setActiveRange] = useState<0 | 7 | 30 | 'custom'>(0);

    const dataPerHalaman = 10;

    useEffect(() => {
        const init = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                if (parsedUser.role !== 'OWNER') {
                    store.setFilter('branchId', parsedUser.branchId);
                } else {
                    fetchBranches();
                }
            }
            store.fetchFinancialReport();
        };
        init();
    }, []);

    useEffect(() => {
        store.fetchFinancialReport();
        setHalamanSekarang(1);
    }, [store.filters.branchId, store.filters.startDate, store.filters.endDate]);

    const dataTabelSekarang = useMemo(() => {
        const dataAsli = tabAktif === 'KAS' ? store.data?.tables.cashFlows :
            tabAktif === 'PENJUALAN' ? store.data?.tables.orders :
                store.data?.tables.expenses;
        if (!dataAsli) return [];
        const mulai = (halamanSekarang - 1) * dataPerHalaman;
        return dataAsli.slice(mulai, mulai + dataPerHalaman);
    }, [tabAktif, store.data, halamanSekarang]);

    const totalHalaman = useMemo(() => {
        const dataAsli = tabAktif === 'KAS' ? store.data?.tables.cashFlows :
            tabAktif === 'PENJUALAN' ? store.data?.tables.orders :
                store.data?.tables.expenses;
        return Math.ceil((dataAsli?.length || 0) / dataPerHalaman);
    }, [tabAktif, store.data]);

    const setRentangCepat = (hari: number) => {
        const akhir = new Date();
        const awal = new Date();
        if (hari === 0) { /* Hari ini */ }
        else if (hari === 30) { awal.setDate(1); }
        else { awal.setDate(awal.getDate() - hari); }

        const formatLocal = (d: Date) => {
            const offset = d.getTimezoneOffset();
            const local = new Date(d.getTime() - (offset * 60 * 1000));
            return local.toISOString().split('T')[0];
        };

        setActiveRange(hari as any);
        store.setFilter('startDate', formatLocal(awal));
        store.setFilter('endDate', formatLocal(akhir));
    };

    const formatWIB = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(dateStr));
    };

    const handleExportExcel = async () => {
        if (!store.data) return Alert.alert("Info", "Data belum dimuat.");
        setIsExporting(true);
        try {
            const workbook = XLSX.utils.book_new();
            const summary = store.data.summary;
            const wsSummary = XLSX.utils.aoa_to_sheet([
                ["LAPORAN KEUANGAN"], [""],
                ["TOTAL OMZET", Number(summary.totalOmzet)],
                ["LABA PENJUALAN", Number(summary.pendapatanNetto)],
                ["BIAYA BELANJA", Number(summary.totalBelanja)],
                ["PROFIT BERSIH", Number(summary.saldoAkumulasiProfit)]
            ]);
            XLSX.utils.book_append_sheet(workbook, wsSummary, "RINGKASAN");
            
            const fileName = `Financial_Report_${new Date().getTime()}.xlsx`;
            if (Platform.OS === 'web') { XLSX.writeFile(workbook, fileName); }
            else {
                const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
                const fileUri = FileSystem.cacheDirectory + fileName;
                await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
                await Sharing.shareAsync(fileUri);
            }
        } catch (e) { Alert.alert("Error", "Gagal ekspor."); } finally { setIsExporting(false); }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowPicker(null);
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            if (showPicker === 'START') store.setFilter('startDate', dateStr);
            if (showPicker === 'END') store.setFilter('endDate', dateStr);
            setActiveRange('custom');
        }
    };

    return (
        <MainLayout>
            <View className="flex-1 bg-slate-50">
                {/* --- MENGGUNAKAN SCREEN HEADER --- */}
                <ScreenHeader 
                    title="Laporan Keuangan"
                    subtitle="Akuntansi & Profitabilitas"
                    subtitleIcon={<Landmark size={10} color="#6366F1" />}
                    showSearch={false}
                    userRole={user?.role}
                    branches={branches || []}
                    selectedBranchId={store.filters.branchId}
                    onBranchChange={(id) => store.setFilter('branchId', id)}
                    userBranchName={user?.branch?.name}
                />

                <ScrollView className="flex-1" contentContainerStyle={{ padding: isDesktop ? 32 : 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                    {/* --- CARDS GRID --- */}
                    <View className="flex-row flex-wrap mb-6 -mx-1.5">
                        <View style={{ width: isDesktop ? '33.33%' : '50%' }} className="p-1.5">
                            <FinancialStatCard title="Omzet" value={store.data?.summary.totalOmzet || 0} colorClass="bg-indigo-500" icon={<TrendingUp color="white" size={16} />} subtitle="Penjualan Selesai" />
                        </View>
                        <View style={{ width: isDesktop ? '33.33%' : '50%' }} className="p-1.5">
                            <FinancialStatCard title="Laba" value={store.data?.summary.pendapatanNetto || 0} colorClass="bg-emerald-500" icon={<Wallet color="white" size={16} />} subtitle="Omzet - Modal" />
                        </View>
                        <View style={{ width: isDesktop ? '33.33%' : '50%' }} className="p-1.5">
                            <FinancialStatCard title="Belanja" value={store.data?.summary.totalBelanja || 0} colorClass="bg-rose-500" icon={<ArrowDownCircle color="white" size={16} />} subtitle="Biaya Operasional" />
                        </View>
                        <View style={{ width: isDesktop ? '33.33%' : '50%' }} className="p-1.5">
                            <FinancialStatCard title="Profit" value={store.data?.summary.saldoAkumulasiProfit || 0} colorClass="bg-blue-600" icon={<Layers color="white" size={16} />} subtitle="Laba - Belanja" />
                        </View>
                        <View style={{ width: isDesktop ? '33.33%' : '50%' }} className="p-1.5">
                            <FinancialStatCard title="Saldo Kas" value={store.data?.summary.saldoKasMurni || 0} colorClass="bg-slate-700" icon={<Banknote color="white" size={16} />} subtitle="Cash Flow Murni" />
                        </View>
                        <View style={{ width: isDesktop ? '33.33%' : '50%' }} className="p-1.5">
                            <FinancialStatCard title="KEKAYAAN BERSIH" value={store.data?.summary.saldoKeseluruhan || 0} colorClass="bg-amber-500" icon={<Landmark color="white" size={16} />} subtitle="Kas + Profit"  />
                        </View>
                    </View>

                    {/* --- FILTER & EXPORT CARD --- */}
                    <View className="mb-6 bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
                        <View className="flex-row items-center justify-between px-4 py-4 border-b md:px-6 md:py-5 border-slate-50 bg-slate-50/50">
                            <View className="flex-row items-center">
                                <View className="p-2 bg-white border rounded-lg border-slate-100">
                                    <Filter size={14} color="#64748B" />
                                </View>
                                <Text className="ml-3 text-xs font-black tracking-widest uppercase text-slate-700">Filter Laporan</Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleExportExcel} disabled={isExporting}
                                className={`h-10 px-4 rounded-xl flex-row items-center shadow-md shadow-emerald-100 ${isExporting ? 'bg-slate-400' : 'bg-emerald-600 active:scale-95'}`}
                            >
                                {isExporting ? <ActivityIndicator size="small" color="white" /> : <Download size={14} color="white" />}
                                {isDesktop && <Text className="ml-2 text-[10px] font-black text-white uppercase tracking-widest">Export Excel</Text>}
                            </TouchableOpacity>
                        </View>

                        <View className="gap-4 px-4 py-4 md:px-6 md:py-5">
                            {/* Shortcuts */}
                            <View className="flex-row flex-wrap gap-2">
                                {[{ l: 'Hari Ini', v: 0 }, { l: '7 Hari', v: 7 }, { l: 'Bulan Ini', v: 30 }].map((s: any) => (
                                    <TouchableOpacity
                                        key={s.v} onPress={() => setRentangCepat(s.v)} activeOpacity={0.7}
                                        className={`px-3 py-2 rounded-full border ${activeRange === s.v ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 border-slate-200'}`}
                                    >
                                        <Text className={`text-[10px] font-black uppercase tracking-tighter ${activeRange === s.v ? 'text-white' : 'text-slate-500'}`}>{s.l}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Date Range */}
                            <View className={`${isDesktop ? 'flex-row items-end' : 'flex-col'} gap-3`}>
                                <View className={isDesktop ? 'flex-1' : 'w-full'}>
                                    <Text className="text-[9px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest">Dari</Text>
                                    {Platform.OS === 'web' ? (
                                        createElement('input', {
                                            type: 'date', value: store.filters.startDate,
                                            onChange: (e: any) => { store.setFilter('startDate', e.target.value); setActiveRange('custom'); },
                                            style: { width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 12, fontWeight: '700', color: '#1E293B', outline: 'none' }
                                        })
                                    ) : (
                                        <TouchableOpacity onPress={() => setShowPicker('START')} className="flex-row items-center h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 active:bg-slate-100">
                                            <CalendarIcon size={14} color="#6366f1" />
                                            <Text className="ml-2 text-[11px] font-bold text-slate-700 flex-1">{store.filters.startDate}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {isDesktop && <View className="pt-2 pb-3"><ArrowRight size={14} color="#cbd5e1" /></View>}

                                <View className={isDesktop ? 'flex-1' : 'w-full'}>
                                    <Text className="text-[9px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest">Sampai</Text>
                                    {Platform.OS === 'web' ? (
                                        createElement('input', {
                                            type: 'date', value: store.filters.endDate,
                                            onChange: (e: any) => { store.setFilter('endDate', e.target.value); setActiveRange('custom'); },
                                            style: { width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 12, fontWeight: '700', color: '#1E293B', outline: 'none' }
                                        })
                                    ) : (
                                        <TouchableOpacity onPress={() => setShowPicker('END')} className="flex-row items-center h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 active:bg-slate-100">
                                            <CalendarIcon size={14} color="#6366f1" />
                                            <Text className="ml-2 text-[11px] font-bold text-slate-700 flex-1">{store.filters.endDate}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* --- DATA SECTION --- */}
                    <View className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm min-h-[450px]">
                        <View className="flex-row p-1.5 bg-slate-50/50">
                            {[
                                { id: 'KAS', label: 'Arus Kas', icon: Banknote, color: '#4F46E5' },
                                { id: 'PENJUALAN', label: 'Penjualan', icon: ReceiptText, color: '#10B981' },
                                { id: 'BELANJA', label: 'Belanja', icon: ArrowDownCircle, color: '#F43F5E' }
                            ].map(t => (
                                <TouchableOpacity key={t.id} onPress={() => { setTabAktif(t.id as any); setHalamanSekarang(1); }}
                                    className={`flex-1 flex-row items-center justify-center py-3.5 rounded-[24px] ${tabAktif === t.id ? 'bg-white shadow-sm border border-slate-100' : ''}`}>
                                    <t.icon size={14} color={tabAktif === t.id ? t.color : '#94A3B8'} />
                                    <Text className={`font-black text-[10px] uppercase ml-2 tracking-widest ${tabAktif === t.id ? 'text-slate-800' : 'text-slate-400'}`}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View className="flex-1">
                            {store.loading ? (
                                <View className="items-center justify-center flex-1 py-20">
                                    <ActivityIndicator size="large" color="#4F46E5" />
                                    <Text className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading...</Text>
                                </View>
                            ) : dataTabelSekarang.length === 0 ? (
                                <EmptyState icon={<Search size={50} color="#CBD5E1" />} message="Data Tidak Ditemukan" />
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
                                    <View style={{ minWidth: 850, flex: 1 }}>
                                        {/* HEADER TABEL */}
                                        <View className="flex-row w-full px-6 py-4 border-b bg-slate-50/50 border-slate-100">
                                            {tabAktif === 'KAS' && (
                                                <>
                                                    <Text style={styles.thDate}>TANGGAL</Text>
                                                    <Text style={styles.thDesc}>KATEGORI / KET</Text>
                                                    <Text style={styles.thType}>TIPE</Text>
                                                    <Text style={styles.thMoney}>NOMINAL</Text>
                                                    <Text style={styles.thMoney}>SALDO</Text>
                                                </>
                                            )}
                                            {tabAktif === 'PENJUALAN' && (
                                                <>
                                                    <Text style={styles.thInvoice}>NO. INVOICE</Text>
                                                    <Text style={styles.thDate}>TANGGAL</Text>
                                                    <Text style={styles.thDesc}>PELANGGAN</Text>
                                                    <Text style={styles.thType}>STATUS</Text>
                                                    <Text style={styles.thMoney}>TOTAL</Text>
                                                </>
                                            )}
                                            {tabAktif === 'BELANJA' && (
                                                <>
                                                    <Text style={styles.thDate}>TANGGAL</Text>
                                                    <Text style={styles.thDesc}>KETERANGAN</Text>
                                                    <Text style={styles.thDesc}>KATEGORI</Text>
                                                    <Text style={styles.thMoney}>TOTAL</Text>
                                                </>
                                            )}
                                        </View>

                                        {/* BARIS TABEL */}
                                        {dataTabelSekarang.map((item: any, idx: number) => (
                                            <View key={idx} className="flex-row items-center w-full px-6 py-4 transition-colors border-b border-slate-50 hover:bg-slate-50/50">
                                                {tabAktif === 'KAS' && (
                                                    <>
                                                        <Text style={styles.tdDate}>{formatWIB(item.date)}</Text>
                                                        <View style={styles.tdDesc}>
                                                            <Text className="text-[11px] font-black text-slate-800 uppercase mb-0.5">{item.category}</Text>
                                                            <Text className="text-[10px] font-medium text-slate-500" numberOfLines={1}>{item.description}</Text>
                                                        </View>
                                                        <View style={styles.tdType}>
                                                            <View className={`px-2.5 py-1 rounded-lg border ${item.type === 'INCOME' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                                                <Text className={`text-[9px] font-black uppercase tracking-widest ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.type}</Text>
                                                            </View>
                                                        </View>
                                                        <Text style={[styles.tdMoney, { color: item.type === 'INCOME' ? '#059669' : '#E11D48' }]}>
                                                            {item.type === 'INCOME' ? '+' : '-'} {Number(item.amount).toLocaleString('id-ID')}
                                                        </Text>
                                                        <Text style={[styles.tdMoney, { color: '#334155' }]}>
                                                            {Number(item.currentBalance).toLocaleString('id-ID')}
                                                        </Text>
                                                    </>
                                                )}
                                                {tabAktif === 'PENJUALAN' && (
                                                    <>
                                                        <Text style={styles.tdInvoice}>{item.invoiceNumber}</Text>
                                                        <Text style={styles.tdDate}>{formatWIB(item.createdAt)}</Text>
                                                        <View style={styles.tdDesc}>
                                                            <Text className="text-[12px] font-black text-slate-800 uppercase" numberOfLines={1}>{item.customerName || 'Walk-in Customer'}</Text>
                                                        </View>
                                                        <View style={styles.tdType}>
                                                            <View className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg">
                                                                <Text className="text-[9px] font-black text-slate-500 tracking-widest uppercase">{item.status}</Text>
                                                            </View>
                                                        </View>
                                                        <Text style={[styles.tdMoney, { color: '#4F46E5' }]}>{Number(item.totalAmount).toLocaleString('id-ID')}</Text>
                                                    </>
                                                )}
                                                {tabAktif === 'BELANJA' && (
                                                    <>
                                                        <Text style={styles.tdDate}>{formatWIB(item.date)}</Text>
                                                        <View style={styles.tdDesc}>
                                                            <Text className="text-[11px] font-black text-slate-800 uppercase mb-0.5" numberOfLines={1}>{item.description}</Text>
                                                        </View>
                                                        <View style={styles.tdDesc}>
                                                            <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.category}</Text>
                                                        </View>
                                                        <Text style={[styles.tdMoney, { color: '#E11D48' }]}>{Number(item.amount).toLocaleString('id-ID')}</Text>
                                                    </>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>
                            )}
                        </View>

                        {/* --- PAGINATION --- */}
                        <View className="flex-row items-center justify-between p-4 border-t border-slate-50 bg-slate-50/30">
                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HLM {halamanSekarang} / {totalHalaman || 1}</Text>
                            <View className="flex-row gap-2">
                                <TouchableOpacity disabled={halamanSekarang === 1} onPress={() => setHalamanSekarang(p => Math.max(1, p - 1))} className={`p-2 rounded-xl border ${halamanSekarang === 1 ? 'border-slate-100 opacity-40' : 'bg-white border-slate-200 shadow-sm active:bg-slate-50'}`}>
                                    <ChevronLeft size={16} color="#64748B" />
                                </TouchableOpacity>
                                <TouchableOpacity disabled={halamanSekarang >= totalHalaman || totalHalaman === 0} onPress={() => setHalamanSekarang(p => Math.min(totalHalaman, p + 1))} className={`p-2 rounded-xl border ${halamanSekarang >= totalHalaman || totalHalaman === 0 ? 'border-slate-100 opacity-40' : 'bg-white border-slate-200 shadow-sm active:bg-slate-50'}`}>
                                    <ChevronRight size={16} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* Native Picker */}
            {showPicker && Platform.OS !== 'web' && (
                <DateTimePicker
                    value={showPicker === 'START' ? new Date(store.filters.startDate) : new Date(store.filters.endDate)}
                    mode="date" display="default" onChange={onDateChange}
                />
            )}
        </MainLayout>
    );
}

// --- STYLE LEBAR KOLOM FIX & FLUID AGAR TIDAK MENCIUT SAAT DI SCROLL ---
const styles = StyleSheet.create({
    thDate: { width: 140, fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
    thInvoice: { width: 170, fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
    thDesc: { flex: 1, minWidth: 200, fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
    thType: { width: 120, fontSize: 10, fontWeight: '800', color: '#94A3B8', textAlign: 'center', letterSpacing: 0.5 },
    thMoney: { width: 140, fontSize: 10, fontWeight: '800', color: '#94A3B8', textAlign: 'right', letterSpacing: 0.5 },

    tdDate: { width: 140, fontSize: 11, color: '#64748B', fontWeight: '600' },
    tdInvoice: { width: 170, fontSize: 12, color: '#1E293B', fontWeight: '900' },
    tdDesc: { flex: 1, minWidth: 200, paddingRight: 16, justifyContent: 'center' },
    tdType: { width: 120, alignItems: 'center' },
    tdMoney: { width: 140, fontSize: 13, fontWeight: '900', color: '#334155', textAlign: 'right', fontVariant: ['tabular-nums'] },
});