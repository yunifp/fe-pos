import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, useWindowDimensions, RefreshControl, Modal, Platform } from 'react-native';
import { Wallet, TrendingDown, Layers, CheckCircle2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
// @ts-ignore
import 'moment/locale/id';

import MainLayout from '../components/MainLayout';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import FloatingActionButton from '../components/FloatingActionButton';
import ConfirmationModal from '../components/ConfirmationModal';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import ExpenseFormModal from '../components/ExpenseFormModal';

import { useExpenseStore } from '../stores/expenseStore';
import { useHRStore } from '../stores/hrStore';
import { useSettingStore } from '../stores/settingStore'; // <--- IMPORT SETTING STORE

moment.locale('id');

export default function ExpenseScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const numColumns = isDesktop ? 2 : 1;
    const itemWidth = 100 / numColumns;

    const { expenses, suggestions, isLoading, fetchExpenses, fetchSuggestions, addExpense, updateExpense, removeExpense }: any = useExpenseStore();
    const { branches, fetchBranches } = useHRStore();
    
    // --- AMBIL TEMA WARNA ---
    const { settings } = useSettingStore();
    const primaryColor = settings.themePrimaryColor || '#4F46E5';

    const [user, setUser] = useState<any>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showAlert, setShowAlert] = useState({ visible: false, title: '', message: '', type: 'success' });
    const [isSaving, setIsSaving] = useState(false);

    const [isEdit, setIsEdit] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsed = JSON.parse(userData);
                setUser(parsed);
                
                let targetBranch = parsed.branch?.id || parsed.branchId;
                if (parsed.role === 'OWNER') {
                    await fetchBranches();
                }
                
                setSelectedBranchId(targetBranch);
                if (targetBranch) fetchExpenses(targetBranch);
                fetchSuggestions();
            }
        };
        init();
    }, []);

    const triggerAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => {
        setShowAlert({ visible: true, title, message, type });
        setTimeout(() => setShowAlert({ visible: false, title: '', message: '', type: 'success' }), 2000);
    };

    const stats = useMemo(() => {
        const today = moment().format('YYYY-MM-DD');
        const branchExpenses = selectedBranchId === 'all' ? expenses : expenses;
        
        const totalToday = branchExpenses.filter((e: any) => moment(e.date).format('YYYY-MM-DD') === today).reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
        const totalMonth = branchExpenses.filter((e: any) => moment(e.date).isSame(moment(), 'month')).reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
        return { totalToday, totalMonth };
    }, [expenses, selectedBranchId]);

    const filteredExpenses = useMemo(() => {
        if (!searchQuery) return expenses;
        return expenses.filter((e: any) => 
            e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.amount.toString().includes(searchQuery)
        );
    }, [expenses, searchQuery]);

    const handleSubmit = async (formData: any) => {
        setIsSaving(true);
        try {
            const dataToUpload = new FormData();
            dataToUpload.append('amount', formData.amount);
            dataToUpload.append('category', formData.category);
            dataToUpload.append('description', formData.description);
            dataToUpload.append('date', formData.date);
            dataToUpload.append('branchId', selectedBranchId);
            dataToUpload.append('recordedBy', user.id);
            dataToUpload.append('role', user.role);
            
            if (isEdit && selectedItem) dataToUpload.append('id', selectedItem.id);

            if (formData.receiptUrl && !formData.receiptUrl.startsWith('http')) {
                const uri = formData.receiptUrl;
                const filename = uri.split('/').pop() || 'receipt.jpg';
                const match = /\.(\w+)$/.exec(filename);
                dataToUpload.append('image', {
                    uri: Platform.OS === 'web' ? uri : uri.replace('file://', ''),
                    name: filename,
                    type: match ? `image/${match[1]}` : `image/jpeg`,
                } as any);
            }

            if (isEdit) {
                await updateExpense(selectedItem.id, dataToUpload);
                triggerAlert("Berhasil!", "Data belanja diperbarui");
            } else {
                await addExpense(dataToUpload);
                triggerAlert("Sukses!", "Belanja baru dicatat");
            }
            setShowModal(false);
            fetchExpenses(selectedBranchId);
        } catch (e: any) {
            triggerAlert("Gagal", "Terjadi kesalahan sistem", 'error');
        } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        try {
            await removeExpense(selectedItem.id, selectedBranchId, user.role);
            setShowConfirm(false);
            setShowDetail(false);
            triggerAlert("Terhapus", "Data telah dibersihkan");
            fetchExpenses(selectedBranchId);
        } catch (e: any) {
            triggerAlert("Gagal", e.response?.data?.message || "Gagal menghapus", 'error');
        }
    };

    const canModify = (itemDate: string) => {
        if (user?.role === 'OWNER') return true;
        return user?.role === 'MANAGER' && moment(itemDate).isSame(moment(), 'day');
    };

    return (
        <MainLayout>
            <View className="flex-1 bg-slate-50">
                <ScreenHeader 
                    title="Kelola Belanja"
                    subtitle="Finance Ops"
                    subtitleIcon={<TrendingDown size={10} color={primaryColor} />} // Gunakan primaryColor
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Cari keterangan belanja..."
                    userRole={user?.role}
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    onBranchChange={(id) => { 
                        setSelectedBranchId(id); 
                        fetchExpenses(id); 
                    }}
                    userBranchName={user?.branch?.name}
                />

                <FlatList
                    key={numColumns}
                    numColumns={numColumns}
                    data={filteredExpenses}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 10, paddingBottom: 100, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchExpenses(selectedBranchId)} />}
                    ListHeaderComponent={
                        <View className="flex-row flex-wrap mb-6 -mx-1.5 mt-2">
                            <View className="w-full p-1.5 md:w-1/2">
                                <View className="bg-slate-950 p-5 rounded-[24px] shadow-sm h-24 justify-center relative overflow-hidden border border-slate-800">
                                    <View className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Wallet size={80} color="white" /></View>
                                    <View className="relative z-10">
                                        <Text className="text-slate-500 font-black text-[8px] uppercase tracking-[2px] mb-1">Hari Ini</Text>
                                        <Text className="text-2xl font-black tracking-tighter text-white">Rp {stats.totalToday.toLocaleString('id-ID')}</Text>
                                    </View>
                                </View>
                            </View>
                            <View className="w-full p-1.5 md:w-1/2">
                                <View className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm h-24 justify-center relative overflow-hidden">
                                    {/* Gunakan primaryColor untuk dekorasi */}
                                    <View className="absolute -right-4 -bottom-4 opacity-[0.03] -rotate-12">
                                        <TrendingDown size={80} color={primaryColor} />
                                    </View>
                                    <View className="relative z-10">
                                        <Text className="text-slate-400 font-black text-[8px] uppercase tracking-[2px] mb-1">Bulan Ini</Text>
                                        {/* Gunakan primaryColor untuk teks */}
                                        <Text className="text-2xl font-black tracking-tighter" style={{ color: primaryColor }}>
                                            Rp {stats.totalMonth.toLocaleString('id-ID')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <ExpenseCard item={item} itemWidth={itemWidth} onPress={(i) => { setSelectedItem(i); setShowDetail(true); }} />
                    )}
                    ListEmptyComponent={
                        <EmptyState icon={<Layers size={50} color="#CBD5E1" />} message={searchQuery ? "Data tidak ditemukan" : "Belum Ada Pengeluaran"} />
                    }
                />
            </View>

            {/* Gunakan primaryColor pada tombol melayang */}
            <FloatingActionButton onPress={() => { setIsEdit(false); setSelectedItem(null); setShowModal(true); }} color={primaryColor} />

            <ExpenseDetailModal 
                visible={showDetail} 
                onClose={() => setShowDetail(false)} 
                item={selectedItem} 
                canModify={canModify(selectedItem?.date)}
                onEdit={() => { setShowDetail(false); setIsEdit(true); setShowModal(true); }}
                onDelete={() => setShowConfirm(true)}
            />

            <ExpenseFormModal 
                visible={showModal} 
                onClose={() => setShowModal(false)} 
                onSubmit={handleSubmit} 
                initialData={isEdit ? selectedItem : null} 
                suggestions={suggestions} 
                userRole={user?.role} 
                isSaving={isSaving}
            />

            <ConfirmationModal visible={showConfirm} title="Hapus Data?" message="Data belanja ini akan hilang selamanya." isDanger onCancel={() => setShowConfirm(false)} onConfirm={handleDelete} confirmText="Hapus" />

            <Modal visible={showAlert.visible} transparent animationType="fade">
                <View className="items-center justify-center flex-1 bg-black/20">
                    <View className="flex-row items-center px-6 py-4 bg-white rounded-full shadow-xl">
                        <CheckCircle2 size={18} color={showAlert.type === 'error' ? '#EF4444' : '#10B981'} />
                        <Text className="ml-2 text-xs font-black uppercase text-slate-800">{showAlert.title}</Text>
                    </View>
                </View>
            </Modal>
        </MainLayout>
    );
}