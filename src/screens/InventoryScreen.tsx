import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, useWindowDimensions, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Box, Archive, PackagePlus, ArrowRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useWarehouseStore } from '../stores/warehouseStore';
import { useMaterialStore } from '../stores/materialStore';
import { useSettingStore } from '../stores/settingStore';
import { useBranchStore } from '../stores/branchStore'; // IMPORT GLOBAL BRANCH STORE

import MainLayout from '../components/MainLayout';
import ScreenHeader from '../components/ScreenHeader';
import { CustomToast } from '../components/CustomToast';
import EmptyState from '../components/EmptyState';
import ConfirmationModal from '../components/ConfirmationModal';

import WarehouseFormModal from '../components/WarehouseFormModal';
import WarehouseDetailModal from '../components/WarehouseDetailModal';
import RestockFormModal from '../components/RestockFormModal';
import FloatingActionButton from '../components/FloatingActionButton';

export default function InventoryScreen() {
    const { settings } = useSettingStore();
    const { width } = useWindowDimensions();

    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;

    const numColumns = isDesktop ? 2 : isTablet ? 1 : 1;
    const itemWidth = 100 / numColumns;

    const { warehouses, fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, addStock, isLoading } = useWarehouseStore();
    const { materials, fetchMaterials } = useMaterialStore();
    
    // --- STATE CABANG GLOBAL ---
    const { branches, fetchBranches, selectedBranchId, setSelectedBranchId } = useBranchStore();

    const [isFormVisible, setFormVisible] = useState(false);
    const [isDetailVisible, setDetailVisible] = useState(false);
    const [isRestockVisible, setRestockVisible] = useState(false);

    const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
    const [activeWarehouseId, setActiveWarehouseId] = useState<string | null>(null);

    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [deleteModal, setDeleteModal] = useState({ visible: false, warehouseId: '' });
    const [searchQuery, setSearchQuery] = useState('');

    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const initData = async () => {
            try {
                const u = await AsyncStorage.getItem('user');
                if (u) {
                    const parsed = JSON.parse(u);
                    setUserRole(parsed.role || '');
                }
            } catch (error) { console.log(error); }
        };
        initData();
        fetchBranches();
        fetchWarehouses();
        fetchMaterials();
    }, []);

    const showToast = (msg: string, type: 'success' | 'error') => setToast({ visible: true, message: msg, type });

    const handleOpenAdd = () => { setSelectedWarehouse(null); setFormVisible(true); };
    const handleOpenDetail = (warehouse: any) => { setActiveWarehouseId(warehouse.id); setDetailVisible(true); };

    const handleOpenRestock = (warehouseId?: string) => {
        setActiveWarehouseId(warehouseId || null);
        setRestockVisible(true);
    };

    const handleFormSubmit = async (data: any) => {
        try {
            if (data.id) {
                await updateWarehouse(data.id, data);
                showToast('Gudang diperbarui!', 'success');
            } else {
                await createWarehouse(data);
                showToast('Gudang ditambahkan!', 'success');
            }
        } catch (error) {
            showToast('Gagal memproses data.', 'error');
        }
    };

    const executeDelete = async () => {
        const id = deleteModal.warehouseId;
        setDeleteModal({ visible: false, warehouseId: '' });
        try {
            await deleteWarehouse(id);
            showToast('Gudang dihapus', 'success');
        } catch (e) {
            showToast('Gagal menghapus gudang.', 'error');
        }
    };

    const handleRestockSubmit = async (warehouseId: string, data: { materialId: string, quantity: number }) => {
        try {
            await addStock(warehouseId, data);
            showToast('Stok berhasil ditambahkan ke Gudang!', 'success');
            fetchWarehouses();
        } catch (e) {
            showToast('Gagal menambah stok.', 'error');
        }
    };

    const filteredWarehouses = warehouses.filter((w: any) => w.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Fungsi untuk mendapatkan nama cabang terpilih
    const getActiveBranchName = () => {
        if (!selectedBranchId) return 'Cabang';
        const br = branches.find(b => b.id === selectedBranchId);
        return br ? br.name : 'Cabang';
    };

    const renderWarehouseCard = ({ item }: { item: any }) => (
        <View style={{ width: `${itemWidth}%`, padding: 6 }}>
            <TouchableOpacity onPress={() => handleOpenDetail(item)} className="flex-row items-center p-4 bg-white border shadow-sm rounded-2xl border-slate-100">
                <View className="items-center justify-center mr-4 border w-12 h-12 rounded-xl bg-indigo-50 border-indigo-100">
                    <Box color="#4F46E5" size={24} />
                </View>
                <View className="justify-center flex-1 pr-1">
                    <Text className="text-sm font-black text-slate-800 leading-tight mb-0.5" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-[10px] font-bold text-slate-400 mb-1" numberOfLines={1}>{item.address || '-'}</Text>
                    <View className="bg-slate-100 px-2 py-0.5 rounded-md self-start mt-1">
                        <Text className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                            {item._count?.stocks || 0} Material
                        </Text>
                    </View>
                </View>
                <ArrowRight size={16} color="#CBD5E1" />
            </TouchableOpacity>
        </View>
    );

    return (
        <MainLayout>
            <View className="relative flex-1 bg-slate-50">
                <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                <ScreenHeader
                    title="Gudang & Logistik"
                    subtitle="Manajemen Penyimpanan & Stok"
                    subtitleIcon={<Archive size={10} color="#6366F1" />}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Cari nama gudang..."
                    userRole={userRole}
                    branches={branches}
                    selectedBranchId={selectedBranchId} // SUDAH DINAMIS
                    onBranchChange={setSelectedBranchId} // BISA DIKLIK 
                    userBranchName={getActiveBranchName()}
                />

                <View className={`flex-1 p-4 gap-4 ${isDesktop || isTablet ? 'flex-row h-[calc(100vh-140px)]' : 'flex-col'}`}>

                    <View className={`bg-white border border-slate-100 shadow-sm rounded-[32px] overflow-hidden relative ${isDesktop || isTablet ? 'flex-[1.5] h-full' : 'flex-1 min-h-[400px]'}`}>
                        <View className="flex-row items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <View>
                                <Text className="text-sm font-black uppercase tracking-wider text-slate-800">Daftar Gudang</Text>
                                <Text className="text-[10px] font-bold text-slate-400 mt-1">{filteredWarehouses.length} Gudang Terdaftar</Text>
                            </View>
                        </View>

                        {isLoading ? (
                            <View className="items-center justify-center flex-1"><ActivityIndicator size="large" color="#4F46E5" /></View>
                        ) : (
                            <FlatList
                                data={filteredWarehouses}
                                renderItem={renderWarehouseCard}
                                keyExtractor={(item) => item.id}
                                numColumns={numColumns}
                                key={numColumns}
                                contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={<EmptyState icon={<Box size={60} color="#94A3B8" />} message={searchQuery ? 'Gudang tidak ditemukan' : 'Belum ada data gudang'} />}
                            />
                        )}
                        <FloatingActionButton onPress={handleOpenAdd} color={settings.themePrimaryColor || '#4F46E5'} />
                    </View>

                    <View className={`bg-white border border-slate-100 shadow-sm rounded-[32px] overflow-hidden flex-col relative ${isDesktop || isTablet ? 'w-80 lg:w-96 h-full' : 'w-full min-h-[400px]'}`}>
                        <View className="p-6 bg-slate-900 border-b border-slate-800 items-center justify-center pb-8">
                            <View className="w-16 h-16 bg-emerald-500/20 rounded-full items-center justify-center mb-3">
                                <PackagePlus size={32} color="#34D399" />
                            </View>
                            <Text className="text-white font-black text-lg uppercase tracking-widest text-center">Pengadaan Stok</Text>
                            <Text className="text-slate-400 text-xs font-medium mt-1 text-center">Input stok material masuk dari Supplier</Text>
                        </View>

                        <View className="flex-1 px-5 pt-6 pb-5 overflow-hidden">
                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Master Material</Text>

                            <ScrollView className="flex-1" showsVerticalScrollIndicator={true} nestedScrollEnabled={true} contentContainerStyle={{ paddingBottom: 100 }}>
                                {materials.length === 0 ? (
                                    <Text className="text-xs text-slate-400 italic p-2 text-center">Belum ada bahan baku terdaftar.</Text>
                                ) : (
                                    materials.map(mat => (
                                        <View key={mat.id} className="flex-row items-center justify-between p-3 mb-2 bg-slate-50 border border-slate-100 rounded-xl shadow-sm">
                                            <Text className="text-xs font-bold text-slate-700 flex-1 pr-2" numberOfLines={1}>{mat.name}</Text>
                                            <Text className="text-[9px] font-black text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200 flex-shrink-0">
                                                {mat.unit}
                                            </Text>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        </View>

                        <FloatingActionButton onPress={handleOpenRestock} color={'#10B981'} />
                    </View>
                </View>

                <WarehouseFormModal visible={isFormVisible} onClose={() => setFormVisible(false)} onSubmit={handleFormSubmit} initialData={selectedWarehouse} />
                <WarehouseDetailModal visible={isDetailVisible} warehouseId={activeWarehouseId} onClose={() => setDetailVisible(false)} onEdit={(wh: any) => { setDetailVisible(false); setSelectedWarehouse(wh); setTimeout(() => setFormVisible(true), 300); }} onDelete={(id: string) => { setDetailVisible(false); setDeleteModal({ visible: true, warehouseId: id }); }} onRestock={(id: string) => { setDetailVisible(false); setTimeout(() => handleOpenRestock(id), 300); }} />
                <RestockFormModal visible={isRestockVisible} onClose={() => setRestockVisible(false)} onSubmit={handleRestockSubmit} warehouses={warehouses} initialWarehouseId={activeWarehouseId} />
                <ConfirmationModal visible={deleteModal.visible} title="Hapus Gudang?" message="Pastikan gudang ini sudah kosong. Gudang yang masih memiliki stok tidak dapat dihapus." confirmText="Hapus" isDanger={true} onConfirm={executeDelete} onCancel={() => setDeleteModal({ visible: false, warehouseId: '' })} />
            </View>
        </MainLayout>
    );
}