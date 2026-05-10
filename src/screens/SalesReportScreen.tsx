import React, { useEffect, useState, useMemo, createElement } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, useWindowDimensions, Platform, Alert } from 'react-native';
import { FileSpreadsheet, Filter, Search, Eye, TrendingUp, ShoppingBag, CreditCard, ChevronRight, ArrowRightLeft, ChevronDown, ChevronUp, Calendar as CalendarIcon, ChevronLeft as ChevronLeftIcon, Wallet, Store, Banknote, QrCode, Smartphone, Gift } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx-js-style';

// Components
import MainLayout from '../components/MainLayout';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import DropdownModal from '../components/DropdownModal';
import SalesOrderDetailModal from '../components/SalesOrderDetailModal';
import Badge from '../components/Badge';

// Stores
import { useSalesStore } from '../stores/salesStore';
import { useBranchStore } from '../stores/branchStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- STAT CARD LOKAL (Khusus Laporan) ---
function StatCard({ title, value, color, icon, isPrice, note }: any) {
    return (
        <View className="w-full">
            <View className={`${color} p-4 md:p-5 rounded-[24px] shadow-sm relative overflow-hidden`} style={{ minHeight: 110 }}>
                <View className="absolute scale-[2] -right-2 -top-2 opacity-10 rotate-12">{icon}</View>
                <View className="z-10 justify-between flex-1">
                    <Text className="text-[9px] font-black text-white/80 uppercase tracking-[1.5px]" numberOfLines={1}>{title}</Text>
                    <View>
                        <Text className="text-lg font-black tracking-tight text-white md:text-xl" numberOfLines={1} adjustsFontSizeToFit>
                            {isPrice ? `Rp ${Number(value || 0).toLocaleString('id-ID')}` : (value || 0)}
                        </Text>
                        {note && <Text className="mt-1 text-[8px] font-bold text-white/60 uppercase italic" numberOfLines={1}>{note}</Text>}
                    </View>
                </View>
            </View>
        </View>
    );
}

function TableHeader({ label, flex, textAlign = 'left' }: any) {
    return <Text style={{ flex, textAlign }} className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{label}</Text>;
}

function FilterBox({ label, children, flex = 1 }: any) {
    return (
        <View style={{ flex, minWidth: 150 }}>
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2">{label}</Text>
            <View className="flex-row items-center px-4 py-2 border bg-slate-50 border-slate-100 rounded-xl h-11">{children}</View>
        </View>
    );
}

export default function SalesReportScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;

    const { reportData, isLoading, filters, setFilter, fetchReport } = useSalesStore();
    const { branches, fetchBranches } = useBranchStore();
    const [user, setUser] = useState<any>(null);
    
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isFilterMinimized, setIsFilterMinimized] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isExporting, setIsExporting] = useState(false);

    // Modal States
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);
    const [showItemsPerPageModal, setShowItemsPerPageModal] = useState(false);

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        const init = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                if (parsedUser.role === 'OWNER') {
                    fetchBranches();
                    fetchReport();
                } else {
                    fetchReport(parsedUser.branch.id);
                }
            }
        };
        init();
    }, [filters.startDate, filters.endDate, filters.orderType, filters.paymentMethod, filters.branchId, filters.status, filters.paymentStatus]);

    useEffect(() => { setCurrentPage(1); }, [filters, itemsPerPage]);

    const displayedReportData = useMemo(() => {
        if (!reportData?.data) return [];
        let data = reportData.data;
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            data = data.filter((order: any) =>
                order.invoiceNumber.toLowerCase().includes(searchTerm) ||
                (order.customerName && order.customerName.toLowerCase().includes(searchTerm))
            );
        }
        return data;
    }, [reportData, filters.search]);

    const getPaymentTotal = (method: string) => {
        const data = reportData?.stats.breakdownMethod?.find((m: any) => m.paymentMethod === method);
        return data?._sum.totalAmount || 0;
    };

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return displayedReportData.slice(startIndex, startIndex + itemsPerPage);
    }, [displayedReportData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(displayedReportData.length / itemsPerPage);

    const formatWIB = (dateStr: string) => {
        return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(dateStr)) + ' WIB';
    };

    // --- EXPORT LOGIC ---
    const handleExport = async () => {
        if (displayedReportData.length === 0) return Alert.alert("Info", "Tidak ada data untuk diekspor.");
        setIsExporting(true);
        try {
            const borderStyle = { top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } }, left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } } };
            const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F46E5" } }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } };
            const subHeaderStyle = { font: { bold: true, color: { rgb: "000000" } }, fill: { fgColor: { rgb: "E0E7FF" } }, border: borderStyle, alignment: { horizontal: "left" } };
            const cellStyle = { border: borderStyle, alignment: { horizontal: "left" } };
            const currencyStyle = { border: borderStyle, numFmt: "#,##0", alignment: { horizontal: "right" } };

            const branchName = filters.branchId === 'all' ? 'SEMUA CABANG' : branches.find((b: any) => b.id === filters.branchId)?.name.toUpperCase() || 'CABANG';
            const period = filters.startDate && filters.endDate ? `${filters.startDate} s.d ${filters.endDate}` : `HARI INI (${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })})`;
            const stats = reportData?.stats || {};
            const netProfit = (stats.totalOmzet || 0) - (stats.totalHpp || 0);

            const wsData: any[][] = [
                [{ v: "LAPORAN PENJUALAN", s: { font: { bold: true, sz: 16 } } }],
                [{ v: `CABANG: ${branchName}`, s: { font: { bold: true } } }],
                [{ v: `PERIODE: ${period}`, s: { font: { bold: true } } }],
                [{ v: `DICETAK OLEH: ${user?.name || '-'} (${new Date().toLocaleString('id-ID')})`, s: { font: { italic: true } } }],
                [],
                [{ v: "RINGKASAN KEUANGAN", s: subHeaderStyle }, { v: "", s: subHeaderStyle }],
                [{ v: "Total Omzet (Kotor)", s: cellStyle }, { v: stats.totalOmzet, s: currencyStyle }],
                [{ v: "Total HPP (Modal)", s: cellStyle }, { v: stats.totalHpp, s: currencyStyle }],
                [{ v: "Laba Bersih", s: cellStyle }, { v: netProfit, s: { ...currencyStyle, font: { bold: true, color: { rgb: "10B981" } } } }],
                [{ v: "Total Transaksi", s: cellStyle }, { v: stats.totalTransactions, s: { ...cellStyle, alignment: { horizontal: "right" } } }],
                [],
                [{ v: "RINCIAN METODE PEMBAYARAN", s: subHeaderStyle }, { v: "", s: subHeaderStyle }],
            ];

            const paymentMethods = ['CASH', 'QRIS', 'MIDTRANS', 'CARD', 'TRANSFER', 'MARKETPLACE', 'COMPLIMENTARY'];
            paymentMethods.forEach(method => wsData.push([{ v: method === 'COMPLIMENTARY' ? 'GRATIS' : method, s: cellStyle }, { v: getPaymentTotal(method), s: currencyStyle || 0 }]));
            wsData.push([], []);

            wsData.push(["No. Invoice", "Waktu", "Pelanggan", "Kasir", "Tipe", "Metode", "Status Order", "Status Bayar", "Total (Rp)", "Jml Item", "Rincian Item"].map(h => ({ v: h, s: headerStyle })));
            displayedReportData.forEach((order: any) => {
                wsData.push([
                    { v: order.invoiceNumber, s: cellStyle }, { v: formatWIB(order.createdAt), s: cellStyle },
                    { v: order.customerName || 'Walk-in', s: cellStyle }, { v: order.cashier?.fullName || '-', s: cellStyle },
                    { v: order.orderType, s: { ...cellStyle, alignment: { horizontal: "center" } } }, { v: order.paymentMethod, s: { ...cellStyle, alignment: { horizontal: "center" } } },
                    { v: order.status, s: { ...cellStyle, font: { color: { rgb: order.status === 'COMPLETED' ? "10B981" : "F59E0B" } } } },
                    { v: order.paymentStatus, s: { ...cellStyle, font: { color: { rgb: order.paymentStatus === 'PAID' ? "10B981" : "EF4444" } } } },
                    { v: order.totalAmount, s: currencyStyle }, { v: order.items?.length || 0, s: { ...cellStyle, alignment: { horizontal: "center" } } },
                    { v: order.items?.map((i: any) => `${i.variant?.product?.name} (${i.quantity})`).join(", ") || "", s: { ...cellStyle, alignment: { wrapText: true } } }
                ]);
            });

            const worksheet = XLSX.utils.aoa_to_sheet([]);
            worksheet['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 10, r: wsData.length } });
            wsData.forEach((row, r) => row.forEach((cell, c) => worksheet[XLSX.utils.encode_cell({ r, c })] = cell));
            worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } }, { s: { r: 10 + paymentMethods.length, c: 0 }, e: { r: 10 + paymentMethods.length, c: 1 } }];
            worksheet['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 8 }, { wch: 60 }];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
            const fileName = `Laporan_Penjualan_${branchName.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

            if (Platform.OS === 'web') {
                XLSX.writeFile(workbook, fileName);
            } else {
                const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
                const fileUri = FileSystem.cacheDirectory + fileName;
                await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
                if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Download Laporan' });
            }
        } catch (error) { Alert.alert("Gagal", "Gagal membuat laporan Excel."); } finally { setIsExporting(false); }
    };

    const renderDatePicker = (value: string, show: boolean, setShow: (v: boolean) => void, type: 'startDate' | 'endDate') => {
        const dateValue = value ? new Date(value) : new Date();
        if (Platform.OS === 'web') {
            return <input type="date" value={value} onChange={(e) => setFilter(type, e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 12, fontWeight: 'bold', width: '100%', outline: 'none', color: '#475569' }} />;
        }
        return (
            <>
                <TouchableOpacity onPress={() => setShow(true)} className="flex-1">
                    <Text className="text-xs font-bold text-slate-700">{value ? new Date(value).toLocaleDateString('id-ID') : 'Pilih'}</Text>
                </TouchableOpacity>
                {show && <DateTimePicker value={dateValue} mode="date" display="default" onChange={(event, selectedDate) => { setShow(false); if (selectedDate) setFilter(type, selectedDate.toISOString().split('T')[0]); }} />}
            </>
        );
    };

    return (
        <MainLayout>
            <View className="flex-1 bg-slate-50">
                <ScreenHeader 
                    title="Laporan Penjualan"
                    subtitle="Analitik & Performa Order"
                    subtitleIcon={<TrendingUp size={10} color="#6366F1" />}
                    showSearch={false} // Disable search di Header karena ada custom filter bar di bawah
                    userRole={user?.role}
                    branches={branches}
                    selectedBranchId={filters.branchId}
                    onBranchChange={(id) => setFilter('branchId', id)}
                    userBranchName={user?.branch?.name}
                />

                <ScrollView className="flex-1" contentContainerStyle={{ padding: isDesktop ? 32 : 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                    {/* STATS GRID */}
                    <View className="mb-6 gap-y-6">
                        <View>
                            <View className="flex-row items-center mb-3 ml-1">
                                <View className="w-1 h-4 bg-indigo-600 rounded-full mr-2.5" />
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ringkasan Finansial</Text>
                            </View>
                            <View className="flex-row flex-wrap -mx-1.5">
                                <View style={{ width: isDesktop ? '33.33%' : '50%' }} className="p-1.5">
                                    <StatCard title="Total Omzet" value={reportData?.stats.totalOmzet} color="bg-indigo-600" isPrice icon={<TrendingUp size={24} color="white" />} />
                                </View>
                                <View style={{ width: isDesktop ? '33.33%' : '50%' }} className="p-1.5">
                                    <StatCard title="Laba Bersih" value={(reportData?.stats.totalOmzet || 0) - (reportData?.stats.totalHpp || 0)} color="bg-emerald-600" isPrice icon={<Wallet size={24} color="white" />} />
                                </View>
                                <View style={{ width: isDesktop ? '33.33%' : '100%' }} className="p-1.5">
                                    <StatCard title="Total Transaksi" value={reportData?.stats.totalTransactions} color="bg-slate-800" icon={<ShoppingBag size={24} color="white" />} />
                                </View>
                            </View>
                        </View>

                        <View>
                            <View className="flex-row items-center mb-3 ml-1">
                                <View className="w-1 h-4 bg-emerald-500 rounded-full mr-2.5" />
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode Pembayaran</Text>
                            </View>
                            <View className="flex-row flex-wrap -mx-1.5">
                                {[
                                    { l: 'Cash', v: 'CASH', c: 'bg-emerald-600', i: <Banknote size={20} color="white" /> },
                                    { l: 'QRIS (STATIC)', v: 'QRIS', c: 'bg-violet-600', i: <QrCode size={20} color="white" /> },
                                    { l: 'Transfer', v: 'TRANSFER', c: 'bg-blue-500', i: <ArrowRightLeft size={20} color="white" /> },
                                    { l: 'QRIS (MID)', v: 'MIDTRANS', c: 'bg-indigo-600', i: <Smartphone size={20} color="white" /> },
                                    { l: 'Card', v: 'CARD', c: 'bg-rose-500', i: <CreditCard size={20} color="white" /> },
                                    { l: 'Gratis', v: 'COMPLIMENTARY', c: 'bg-slate-500', i: <Gift size={20} color="white" /> },
                                ].map((m, idx) => (
                                    <View key={idx} style={{ width: isDesktop ? '25%' : '50%' }} className="p-1.5">
                                        <StatCard title={m.l} value={getPaymentTotal(m.v)} color={m.c} isPrice icon={m.i} />
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* FILTER & EXPORT BOX */}
                    <View className="mb-6 overflow-hidden bg-white border shadow-sm rounded-[24px] border-slate-200">
                        <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-50 bg-slate-50/50">
                            <TouchableOpacity onPress={() => setIsFilterMinimized(!isFilterMinimized)} className="flex-row items-center flex-1">
                                <Filter size={16} color="#4F46E5" />
                                <Text className="ml-2 text-sm font-black tracking-tighter uppercase text-slate-700">Filter Data</Text>
                                {isFilterMinimized ? <ChevronDown size={16} color="#94A3B8" className="ml-2" /> : <ChevronUp size={16} color="#94A3B8" className="ml-2" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleExport}
                                disabled={isExporting || isLoading}
                                className={`flex-row items-center px-4 py-2 rounded-xl shadow-sm transition-all ${isExporting ? 'bg-slate-400' : 'bg-emerald-600 active:scale-95'}`}
                            >
                                {isExporting ? <ActivityIndicator size="small" color="white" /> : <FileSpreadsheet size={14} color="white" />}
                                {isDesktop && <Text className="ml-2 text-[10px] font-black text-white uppercase tracking-widest">{isExporting ? 'Proses...' : 'Ekspor Excel'}</Text>}
                            </TouchableOpacity>
                        </View>

                        {!isFilterMinimized && (
                            <View className="p-4 md:p-5">
                                <View className="flex-row flex-wrap">
                                    <View className={user?.role === 'OWNER' ? "w-full lg:w-1/4 p-1 mb-2" : "w-full lg:w-1/3 p-1 mb-2"}>
                                        <FilterBox label="Cari Invoice/Pelanggan">
                                            <Search size={16} color="#94A3B8" />
                                            <TextInput
                                                className="flex-1 h-10 ml-2 text-[12px] font-semibold text-slate-700"
                                                placeholder="No. Invoice..."
                                                placeholderTextColor="#94A3B8"
                                                value={filters.search}
                                                onChangeText={(v) => setFilter('search', v)}
                                                style={Platform.OS === 'web' ? { outline: 'none' } as any : undefined}
                                            />
                                        </FilterBox>
                                    </View>

                                    <View className="w-1/2 p-1 lg:w-1/8"><FilterBox label="Mulai">{renderDatePicker(filters.startDate, showStartPicker, setShowStartPicker, 'startDate')}</FilterBox></View>
                                    <View className="w-1/2 p-1 lg:w-1/8"><FilterBox label="Selesai">{renderDatePicker(filters.endDate, showEndPicker, setShowEndPicker, 'endDate')}</FilterBox></View>

                                    <View className="w-1/2 p-1 lg:w-1/8">
                                        <FilterBox label="Tipe Order">
                                            <TouchableOpacity onPress={() => setShowTypeModal(true)} className="flex-row items-center justify-between flex-1">
                                                <Text className="text-[11px] font-bold text-slate-700 uppercase">{filters.orderType || 'ALL'}</Text>
                                                <ChevronDown size={14} color="#94A3B8" />
                                            </TouchableOpacity>
                                        </FilterBox>
                                    </View>

                                    <View className="w-1/2 p-1 lg:w-1/8">
                                        <FilterBox label="Metode Bayar">
                                            <TouchableOpacity onPress={() => setShowPaymentModal(true)} className="flex-row items-center justify-between flex-1">
                                                <Text className="text-[11px] font-bold text-slate-700 uppercase">{filters.paymentMethod || 'ALL'}</Text>
                                                <ChevronDown size={14} color="#94A3B8" />
                                            </TouchableOpacity>
                                        </FilterBox>
                                    </View>

                                    <View className="w-1/2 p-1 lg:w-1/8">
                                        <FilterBox label="Status Order">
                                            <TouchableOpacity onPress={() => setShowStatusModal(true)} className="flex-row items-center justify-between flex-1">
                                                <Text className="text-[11px] font-bold text-slate-700 uppercase">{filters.status || 'ALL'}</Text>
                                                <ChevronDown size={14} color="#94A3B8" />
                                            </TouchableOpacity>
                                        </FilterBox>
                                    </View>

                                    <View className="w-1/2 p-1 lg:w-1/8">
                                        <FilterBox label="Status Bayar">
                                            <TouchableOpacity onPress={() => setShowPaymentStatusModal(true)} className="flex-row items-center justify-between flex-1">
                                                <Text className="text-[11px] font-bold text-slate-700 uppercase">{filters.paymentStatus || 'ALL'}</Text>
                                                <ChevronDown size={14} color="#94A3B8" />
                                            </TouchableOpacity>
                                        </FilterBox>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* TABLE & CARDS SECTION */}
                    <View className="flex-1 bg-white border shadow-sm rounded-[24px] border-slate-200 overflow-hidden">
                        {isLoading ? (
                            <View className="items-center justify-center flex-1 py-20">
                                <ActivityIndicator size="small" color="#4F46E5" />
                                <Text className="mt-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Menyusun Laporan...</Text>
                            </View>
                        ) : displayedReportData.length === 0 ? (
                            <EmptyState icon={<FileSpreadsheet size={50} color="#CBD5E1" />} message="Data Laporan Kosong" />
                        ) : (
                            <View className="flex-1">
                                <ScrollView showsVerticalScrollIndicator={true} className="flex-1">
                                    {isDesktop ? (
                                        <View className="w-full">
                                            <View className="flex-row px-6 py-4 border-b bg-slate-50/50 border-slate-100">
                                                <TableHeader label="WAKTU & INVOICE" flex={2.5} />
                                                <TableHeader label="PELANGGAN" flex={2} />
                                                <TableHeader label="STATUS" flex={2} />
                                                <TableHeader label="TOTAL" flex={1.5} textAlign="right" />
                                                <TableHeader label="" flex={0.5} />
                                            </View>
                                            {paginatedData.map((order: any) => (
                                                <View key={order.id} className="flex-row items-center px-6 py-4 transition-all border-b border-slate-50 hover:bg-indigo-50/30">
                                                    <View style={{ flex: 2.5 }}>
                                                        <Text className="text-[11px] font-bold text-slate-400 mb-0.5 tracking-tighter">{formatWIB(order.createdAt)}</Text>
                                                        <Text className="text-xs font-black uppercase text-slate-900">{order.invoiceNumber}</Text>
                                                    </View>
                                                    <View style={{ flex: 2 }}>
                                                        <Text className="text-[13px] font-bold text-slate-700">{order.customerName || 'Walk-in Customer'}</Text>
                                                        <Text className="text-[10px] font-medium text-slate-400 italic">Kasir: {order.cashier?.fullName || '-'}</Text>
                                                    </View>
                                                    <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                                                        <Badge label={order.status} color="bg-slate-100" textColor="text-slate-600" />
                                                        <Badge label={order.paymentStatus} color={order.paymentStatus === 'PAID' ? "bg-emerald-50" : "bg-rose-50"} textColor={order.paymentStatus === 'PAID' ? "text-emerald-600" : "text-rose-600"} />
                                                        <Badge label={order.paymentMethod || '-'} color="bg-indigo-50" textColor="text-indigo-600" />
                                                    </View>
                                                    <View style={{ flex: 1.5 }}>
                                                        <Text className="text-[14px] font-black text-right text-slate-900 tracking-tight">Rp {Number(order.totalAmount).toLocaleString('id-ID')}</Text>
                                                    </View>
                                                    <TouchableOpacity onPress={() => setSelectedOrder(order)} className="items-end justify-center flex-0.5 ml-4">
                                                        <View className="p-2 bg-slate-100 rounded-xl"><Eye size={16} color="#475569" /></View>
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <View className="p-4">
                                            {paginatedData.map((order: any) => (
                                                <TouchableOpacity key={order.id} onPress={() => setSelectedOrder(order)} className="p-5 mb-4 bg-white border border-slate-100 rounded-[20px] shadow-sm flex-row items-center justify-between active:bg-slate-50">
                                                    <View className="flex-1">
                                                        <Text className="text-[10px] font-bold text-slate-400 mb-1">{formatWIB(order.createdAt)}</Text>
                                                        <Text className="mb-3 text-sm font-black tracking-tighter uppercase text-slate-800">{order.invoiceNumber}</Text>
                                                        <View className="flex-row flex-wrap gap-2">
                                                            <Badge label={order.status} color="bg-slate-100" textColor="text-slate-600" />
                                                            <Badge label={order.paymentStatus} color={order.paymentStatus === 'PAID' ? "bg-emerald-50" : "bg-rose-50"} textColor={order.paymentStatus === 'PAID' ? "text-emerald-600" : "text-rose-600"} />
                                                        </View>
                                                    </View>
                                                    <View className="items-end">
                                                        <Text className="font-black text-indigo-600 text-[16px]">Rp {Number(order.totalAmount).toLocaleString('id-ID')}</Text>
                                                        <ChevronRight size={18} color="#CBD5E1" style={{ marginTop: 4 }} />
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </ScrollView>

                                {/* PAGINATION FOOTER */}
                                <View className="flex-row flex-wrap items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                                    <View className="flex-row items-center mb-2 md:mb-0">
                                        <Text className="text-[11px] font-bold text-slate-400 uppercase mr-3">Tampilkan</Text>
                                        <TouchableOpacity onPress={() => setShowItemsPerPageModal(true)} className="flex-row items-center px-3 py-1 bg-white border rounded-lg border-slate-200">
                                            <Text className="text-[11px] font-bold text-slate-700 mr-2">{itemsPerPage} Data</Text>
                                            <ChevronDown size={12} color="#64748B" />
                                        </TouchableOpacity>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Text className="text-[11px] font-bold text-slate-400 uppercase mr-4">Hal {currentPage} dari {totalPages || 1}</Text>
                                        <View className="flex-row gap-2">
                                            <TouchableOpacity disabled={currentPage === 1} onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))} className={`p-2 rounded-xl border ${currentPage === 1 ? 'border-slate-100 opacity-30' : 'border-slate-200 bg-white shadow-sm'}`}>
                                                <ChevronLeftIcon size={16} color={currentPage === 1 ? "#94A3B8" : "#4F46E5"} />
                                            </TouchableOpacity>
                                            <TouchableOpacity disabled={currentPage === totalPages || totalPages === 0} onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className={`p-2 rounded-xl border ${currentPage === totalPages || totalPages === 0 ? 'border-slate-100 opacity-30' : 'border-slate-200 bg-white shadow-sm'}`}>
                                                <ChevronRight size={16} color={currentPage === totalPages || totalPages === 0 ? "#94A3B8" : "#4F46E5"} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>

                <SalesOrderDetailModal visible={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder} />

                <DropdownModal visible={showTypeModal} onClose={() => setShowTypeModal(false)} title="Pilih Tipe Order" options={[{label:'ALL', value:'ALL'}, {label:'DINE IN', value:'DINE_IN'}, {label:'TAKE HOME', value:'TAKE_HOME'}, {label:'ONLINE', value:'ONLINE'}]} selectedValue={filters.orderType || 'ALL'} onSelect={(v) => { setFilter('orderType', v); setShowTypeModal(false); }} />
                <DropdownModal visible={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Pilih Metode Bayar" options={[{label:'ALL', value:'ALL'}, {label:'CASH', value:'CASH'}, {label:'QRIS (STATIC)', value:'QRIS'}, {label:'CARD', value:'CARD'}, {label:'TRANSFER', value:'TRANSFER'}, {label:'MIDTRANS', value:'MIDTRANS'}, {label:'MARKETPLACE', value:'MARKETPLACE'}, {label:'GRATIS', value:'COMPLIMENTARY'}]} selectedValue={filters.paymentMethod || 'ALL'} onSelect={(v) => { setFilter('paymentMethod', v); setShowPaymentModal(false); }} />
                <DropdownModal visible={showStatusModal} onClose={() => setShowStatusModal(false)} title="Pilih Status Order" options={[{label:'ALL', value:'ALL'}, {label:'PENDING', value:'PENDING'}, {label:'COOKING', value:'COOKING'}, {label:'READY', value:'READY'}, {label:'COMPLETED', value:'COMPLETED'}, {label:'CANCELLED', value:'CANCELLED'}]} selectedValue={filters.status || 'ALL'} onSelect={(v) => { setFilter('status', v); setShowStatusModal(false); }} />
                <DropdownModal visible={showPaymentStatusModal} onClose={() => setShowPaymentStatusModal(false)} title="Pilih Status Bayar" options={[{label:'ALL', value:'ALL'}, {label:'UNPAID', value:'UNPAID'}, {label:'PAID', value:'PAID'}, {label:'REFUND PENDING', value:'REFUND_PENDING'}, {label:'REFUNDED', value:'REFUNDED'}]} selectedValue={filters.paymentStatus || 'ALL'} onSelect={(v) => { setFilter('paymentStatus', v); setShowPaymentStatusModal(false); }} />
                <DropdownModal visible={showItemsPerPageModal} onClose={() => setShowItemsPerPageModal(false)} title="Jumlah Data Per Halaman" options={[{label:'10 Data', value:10}, {label:'25 Data', value:25}, {label:'50 Data', value:50}, {label:'100 Data', value:100}]} selectedValue={itemsPerPage} onSelect={(v) => { setItemsPerPage(v); setShowItemsPerPageModal(false); }} />

            </View>
        </MainLayout>
    );
}