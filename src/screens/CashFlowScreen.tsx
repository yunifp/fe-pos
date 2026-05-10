import React, { useEffect, useState, useMemo, createElement } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform, useWindowDimensions, RefreshControl } from 'react-native';
import { Wallet, ArrowUpCircle, ArrowDownCircle, PieChart, Calendar as CalendarIcon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, startOfMonth } from 'date-fns';

import MainLayout from '../components/MainLayout';
import { CustomToast } from '../components/CustomToast';
import ConfirmationModal from '../components/ConfirmationModal';
import ScreenHeader from '../components/ScreenHeader';
import FloatingActionButton from '../components/FloatingActionButton';
import EmptyState from '../components/EmptyState';
import CashFlowCard from '../components/CashFlowCard';
import CashFlowFormModal from '../components/CashFlowFormModal';

import { useCashFlowStore } from '../stores/cashFlowStore';
import { useHRStore } from '../stores/hrStore';
import { useSettingStore } from '../stores/settingStore';

const StatCard = ({ label, value, icon, color, isPrimary, className }: any) => (
    <View className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-1 ${className}`}>
        <View className="flex-row items-center justify-between mb-2">
            <View className="p-2 rounded-lg bg-slate-50">{icon}</View>
            <Text className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</Text>
        </View>
        <Text numberOfLines={1} className="text-lg font-black tracking-tighter" style={{ color: isPrimary ? '#1e293b' : color }}>{value}</Text>
    </View>
);

export default function CashFlowScreen() {
    const { cashFlows, fetchCashFlows, isLoading, saveCashFlow, deleteCashFlow } = useCashFlowStore();
    const { branches, fetchBranches } = useHRStore();
    const { settings } = useSettingStore();
    const { width: windowWidth } = useWindowDimensions();

    const isTablet = windowWidth >= 768;
    const primaryColor = settings.themePrimaryColor || '#4F46E5';

    const [user, setUser] = useState<any>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState(''); // <--- STATE PENCARIAN
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: '' });

    const [filterDates, setFilterDates] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });
    const [showPicker, setShowPicker] = useState<{ visible: boolean, field: 'startDate' | 'endDate' }>({ visible: false, field: 'startDate' });

    const stats = useMemo(() => {
        const income = cashFlows.filter(i => i.type === 'INCOME').reduce((acc, curr) => acc + Number(curr.amount), 0);
        const expense = cashFlows.filter(i => i.type === 'EXPENSE').reduce((acc, curr) => acc + Number(curr.amount), 0);
        return { income, expense, balance: income - expense };
    }, [cashFlows]);

    // --- LOGIKA FILTER PENCARIAN ---
    const filteredCashFlows = useMemo(() => {
        if (!searchQuery) return cashFlows;
        return cashFlows.filter(item => 
            (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.recorder?.fullName && item.recorder.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [cashFlows, searchQuery]);

    useEffect(() => {
        const init = async () => {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                const initialBranch = parsed.role === 'OWNER' ? 'all' : parsed.branchId;
                setSelectedBranchId(initialBranch);
                if (parsed.role === 'OWNER') fetchBranches();

                fetchCashFlows({ branchId: initialBranch, startDate: filterDates.startDate, endDate: filterDates.endDate });
            }
        };
        init();
    }, []);

    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

    const applyFilter = (newDates: any) => {
        fetchCashFlows({ branchId: selectedBranchId, startDate: newDates.startDate, endDate: newDates.endDate });
    };

    const handleSave = async (data: any) => {
        try {
            await saveCashFlow(data);
            fetchCashFlows({ branchId: selectedBranchId, startDate: filterDates.startDate, endDate: filterDates.endDate });
            setToast({ visible: true, message: "Transaksi berhasil disimpan", type: 'success' });
        } catch (e) {
            setToast({ visible: true, message: "Gagal menyimpan data", type: 'error' });
            throw e;
        }
    };

    return (
        <MainLayout>
            <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
            <ConfirmationModal
                visible={confirmDelete.visible} title="Hapus Transaksi" message="Data ini akan dihapus permanen. Lanjutkan?" isDanger
                onConfirm={async () => {
                    await deleteCashFlow(confirmDelete.id);
                    fetchCashFlows({ branchId: selectedBranchId, startDate: filterDates.startDate, endDate: filterDates.endDate });
                    setConfirmDelete({ visible: false, id: '' });
                    setToast({ visible: true, message: "Data berhasil dihapus", type: 'success' });
                }}
                onCancel={() => setConfirmDelete({ visible: false, id: '' })}
            />

            <View className="flex-1 bg-slate-50">
                {/* HEADER - Search bar dan Branch selector ada di sini */}
                <ScreenHeader 
                    title="Arus Kas"
                    subtitle="Monitoring operasional harian"
                    subtitleIcon={<Wallet size={10} color="#6366F1" />}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Cari kategori atau catatan..."
                    userRole={user?.role}
                    branches={branches || []}
                    selectedBranchId={selectedBranchId}
                    onBranchChange={(id) => { 
                        setSelectedBranchId(id); 
                        fetchCashFlows({ branchId: id, startDate: filterDates.startDate, endDate: filterDates.endDate }); 
                    }}
                    userBranchName={user?.branch?.name}
                />

                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchCashFlows({ branchId: selectedBranchId, startDate: filterDates.startDate, endDate: filterDates.endDate })} />}
                >
                    {/* STATS SECTION */}
                    <View className={`${isTablet ? 'flex-row' : 'flex-col'} gap-3 p-4 md:p-6 pb-2`}>
                        <StatCard label="Saldo Bersih" value={formatCurrency(stats.balance)} icon={<Wallet size={20} color={primaryColor} />} isPrimary color={stats.balance >= 0 ? primaryColor : '#f43f5e'} />
                        <View className="flex-row flex-1 gap-3">
                            <StatCard label="Pemasukan" value={formatCurrency(stats.income)} icon={<ArrowUpCircle size={20} color="#10b981" />} color="#10b981" className="flex-1" />
                            <StatCard label="Pengeluaran" value={formatCurrency(stats.expense)} icon={<ArrowDownCircle size={20} color="#f43f5e" />} color="#f43f5e" className="flex-1" />
                        </View>
                    </View>

                    {/* FILTER TANGGAL */}
                    <View className="px-4 md:px-6 mb-4">
                        <View className="p-4 bg-white border shadow-sm border-slate-100 rounded-3xl">
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-[10px] font-black text-slate-400 uppercase ml-1">Filter Tanggal</Text>
                            </View>
                            <View className="flex-row gap-3">
                                <View className="flex-1">
                                    {Platform.OS === 'web' ? (
                                        createElement('input', {
                                            type: 'date', value: filterDates.startDate,
                                            onChange: (e: any) => { const nd = { ...filterDates, startDate: e.target.value }; setFilterDates(nd); applyFilter(nd); },
                                            style: { width: '100%', height: 48, padding: '0 12px', borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 12, fontWeight: '700', color: '#1E293B', outline: 'none' }
                                        })
                                    ) : (
                                        <TouchableOpacity onPress={() => setShowPicker({ visible: true, field: 'startDate' })} className="flex-row items-center justify-between px-4 h-12 border bg-slate-50 border-slate-200 rounded-xl">
                                            <Text className="text-xs font-bold text-slate-700">{format(new Date(filterDates.startDate), 'dd/MM/yyyy')}</Text>
                                            <CalendarIcon size={14} color={primaryColor} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View className="justify-center"><Text className="font-bold text-slate-300">-</Text></View>

                                <View className="flex-1">
                                    {Platform.OS === 'web' ? (
                                        createElement('input', {
                                            type: 'date', value: filterDates.endDate,
                                            onChange: (e: any) => { const nd = { ...filterDates, endDate: e.target.value }; setFilterDates(nd); applyFilter(nd); },
                                            style: { width: '100%', height: 48, padding: '0 12px', borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 12, fontWeight: '700', color: '#1E293B', outline: 'none' }
                                        })
                                    ) : (
                                        <TouchableOpacity onPress={() => setShowPicker({ visible: true, field: 'endDate' })} className="flex-row items-center justify-between px-4 h-12 border bg-slate-50 border-slate-200 rounded-xl">
                                            <Text className="text-xs font-bold text-slate-700">{format(new Date(filterDates.endDate), 'dd/MM/yyyy')}</Text>
                                            <CalendarIcon size={14} color={primaryColor} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* LIST TRANSAKSI MENGGUNAKAN filteredCashFlows */}
                    <View className="px-4 md:px-6 pb-24">
                        <View className="overflow-hidden bg-white border shadow-sm rounded-3xl border-slate-100">
                            <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                                <Text className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Daftar Transaksi</Text>
                                <PieChart size={16} color="#94a3b8" />
                            </View>
                            {isLoading && cashFlows.length === 0 ? (
                                <View className="items-center py-20"><ActivityIndicator size="small" color={primaryColor} /><Text className="mt-2 text-[10px] font-bold text-slate-400 uppercase">Menarik Data...</Text></View>
                            ) : filteredCashFlows.length === 0 ? (
                                <EmptyState icon={<Wallet size={50} color="#CBD5E1" />} message={searchQuery ? "Data tidak ditemukan" : "Kas Kosong"} />
                            ) : (
                                <View>
                                    {filteredCashFlows.map((item, index) => (
                                        <CashFlowCard 
                                            key={item.id} 
                                            item={item} 
                                            isLast={index === filteredCashFlows.length - 1} 
                                            isAdmin={user?.role === 'OWNER'} 
                                            onEdit={() => { setEditingItem(item); setModalVisible(true); }} 
                                            onDelete={() => setConfirmDelete({ visible: true, id: item.id })} 
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* FAB & MODAL */}
            <FloatingActionButton onPress={() => { setEditingItem(null); setModalVisible(true); }} color={primaryColor} />

            <CashFlowFormModal 
                visible={modalVisible} 
                onClose={() => setModalVisible(false)} 
                onSubmit={handleSave} 
                initialData={editingItem} 
                branches={branches || []} 
                userRole={user?.role} 
                selectedBranchId={selectedBranchId} 
            />

            {showPicker.visible && (
                <DateTimePicker
                    value={new Date(filterDates[showPicker.field])}
                    mode="date" display="default"
                    onChange={(e, d) => {
                        setShowPicker({ ...showPicker, visible: false });
                        if (d) { const nd = { ...filterDates, [showPicker.field]: format(d, 'yyyy-MM-dd') }; setFilterDates(nd); applyFilter(nd); }
                    }}
                />
            )}
        </MainLayout>
    );
}