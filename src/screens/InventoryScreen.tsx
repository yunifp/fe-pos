import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { Box, Archive, PackagePlus, ArrowRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useWarehouseStore } from '../stores/warehouseStore';
import { useMaterialStore } from '../stores/materialStore';
import { useSettingStore } from '../stores/settingStore';
import { useBranchStore } from '../stores/branchStore'; 

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

    // --- STATE TAB SWITCHER ---
    const [activeTab, setActiveTab] = useState<'WAREHOUSE' | 'RESTOCK'>('WAREHOUSE');

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
            fetchWarehouses();
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
            fetchWarehouses();
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
    const filteredMaterials = materials.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const getActiveBranchName = () => {
        if (!selectedBranchId) return 'Cabang';
        const br = branches.find(b => b.id === selectedBranchId);
        return br ? br.name : 'Cabang';
    };

    const primaryColor = settings.themePrimaryColor || '#4F46E5';

    const renderWarehouseCard = ({ item }: { item: any }) => (
        <View style={{ width: `${itemWidth}%`, padding: 6 }}>
            <TouchableOpacity onPress={() => handleOpenDetail(item)} className="flex-row items-center p-4 bg-white border shadow-sm rounded-3xl border-slate-100">
                <View className="items-center justify-center mr-4 border w-12 h-12 rounded-xl bg-indigo-50 border-indigo-100">
                    <Archive color={primaryColor} size={20} />
                </View>
                <View className="justify-center flex-1 pr-1">
                    <Text className="text-[13px] font-black text-slate-800 leading-tight mb-1" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-[9px] font-bold text-slate-400 mb-1.5" numberOfLines={1}>{item.address || 'Alamat tidak diatur'}</Text>
                    <View className="bg-slate-50 px-2 py-1 rounded-md self-start border border-slate-100">
                        <Text className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                            {item._count?.stocks || 0} Material
                        </Text>
                    </View>
                </View>
                <View className="items-center justify-center w-8 h-8 rounded-full bg-slate-50">
                    <ArrowRight size={14} color="#CBD5E1" />
                </View>
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
                    searchPlaceholder={activeTab === 'WAREHOUSE' ? "Cari nama gudang..." : "Cari material..."}
                    userRole={userRole}
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    onBranchChange={setSelectedBranchId} 
                    userBranchName={getActiveBranchName()}
                />

                <View className={`flex-1 p-4 ${isDesktop || isTablet ? 'max-w-[1200px] w-full self-center' : ''}`}>
                    
                    {/* --- TAB SWITCHER UI KONSISTEN DENGAN TEMA --- */}
                    <View className="flex-row p-1 mb-5 bg-white border border-slate-100 rounded-2xl shadow-sm self-start">
                        <TouchableOpacity 
                            onPress={() => setActiveTab('WAREHOUSE')}
                            className={`flex-row items-center px-5 py-2.5 rounded-xl transition-all ${activeTab === 'WAREHOUSE' ? 'shadow-md' : 'bg-transparent'}`}
                            style={activeTab === 'WAREHOUSE' ? { backgroundColor: primaryColor } : {}}
                        >
                            <Archive size={16} color={activeTab === 'WAREHOUSE' ? 'white' : '#64748B'} />
                            <Text className={`ml-2 text-xs font-black uppercase tracking-widest ${activeTab === 'WAREHOUSE' ? 'text-white' : 'text-slate-500'}`}>Daftar Gudang</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => setActiveTab('RESTOCK')}
                            className={`flex-row items-center px-5 py-2.5 rounded-xl transition-all ${activeTab === 'RESTOCK' ? 'shadow-md' : 'bg-transparent'}`}
                            style={activeTab === 'RESTOCK' ? { backgroundColor: primaryColor } : {}}
                        >
                            <PackagePlus size={16} color={activeTab === 'RESTOCK' ? 'white' : '#64748B'} />
                            <Text className={`ml-2 text-xs font-black uppercase tracking-widest ${activeTab === 'RESTOCK' ? 'text-white' : 'text-slate-500'}`}>Pengadaan Stok</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- TAB CONTENT: WAREHOUSE --- */}
                    {activeTab === 'WAREHOUSE' && (
                        <View className="flex-1 overflow-hidden relative bg-white border shadow-sm border-slate-100 rounded-[32px]">
                            
                            {/* HEADER TAB GUDANG IDENTIK */}
                            <View className="flex-row items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                                <View>
                                    <Text className="text-sm font-black tracking-wider uppercase text-slate-800">Daftar Gudang</Text>
                                    <Text className="text-[10px] font-bold text-slate-400 mt-1">{filteredWarehouses.length} Gudang Terdaftar</Text>
                                </View>
                            </View>

                            {isLoading ? (
                                <View className="items-center justify-center flex-1"><ActivityIndicator size="large" color={primaryColor} /></View>
                            ) : (
                                <FlatList
                                    data={filteredWarehouses}
                                    renderItem={renderWarehouseCard}
                                    keyExtractor={(item) => item.id}
                                    numColumns={numColumns}
                                    key={`warehouse-${numColumns}`}
                                    contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
                                    showsVerticalScrollIndicator={false}
                                    ListEmptyComponent={<EmptyState icon={<Archive size={60} color="#94A3B8" />} message={searchQuery ? 'Gudang tidak ditemukan' : 'Belum ada data gudang'} />}
                                />
                            )}
                            {/* FAB IDENTIK */}
                            <FloatingActionButton onPress={handleOpenAdd} color={primaryColor} />
                        </View>
                    )}

                    {/* --- TAB CONTENT: RESTOCK --- */}
                    {activeTab === 'RESTOCK' && (
                        <View className="flex-1 overflow-hidden relative bg-white border shadow-sm border-slate-100 rounded-[32px]">
                            
                            {/* HEADER TAB RESTOCK IDENTIK */}
                            <View className="flex-row items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                                <View>
                                    <Text className="text-sm font-black tracking-wider uppercase text-slate-800">Pengadaan Stok</Text>
                                    <Text className="text-[10px] font-bold text-slate-400 mt-1">Input stok dari Supplier ke Gudang</Text>
                                </View>
                            </View>

                            <View className="flex-1 pt-4 pb-5">
                                <Text className="px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Referensi Daftar Material</Text>
                                
                                <FlatList
                                    data={filteredMaterials}
                                    keyExtractor={(item) => item.id}
                                    numColumns={numColumns}
                                    key={`material-${numColumns}`}
                                    contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 100 }}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <View style={{ width: `${itemWidth}%`, padding: 6 }}>
                                            <View className="flex-row items-center p-4 bg-white border shadow-sm border-slate-100 rounded-2xl">
                                                <View className="items-center justify-center w-10 h-10 mr-4 border bg-indigo-50 rounded-xl border-indigo-100">
                                                    <PackagePlus color={primaryColor} size={18} />
                                                </View>
                                                <View className="flex-1 pr-2">
                                                    <Text className="text-sm font-bold text-slate-700" numberOfLines={1}>{item.name}</Text>
                                                </View>
                                                <View className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md">
                                                    <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.unit}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                    ListEmptyComponent={<EmptyState icon={<PackagePlus size={60} color="#94A3B8" />} message={searchQuery ? 'Bahan baku tidak ditemukan' : 'Bahan baku kosong'} />}
                                />
                            </View>

                            {/* FAB IDENTIK */}
                            <FloatingActionButton onPress={() => handleOpenRestock()} color={primaryColor} />
                        </View>
                    )}

                </View>

                {/* MODALS */}
                <WarehouseFormModal visible={isFormVisible} onClose={() => setFormVisible(false)} onSubmit={handleFormSubmit} initialData={selectedWarehouse} />
                <WarehouseDetailModal visible={isDetailVisible} warehouseId={activeWarehouseId} onClose={() => setDetailVisible(false)} onEdit={(wh: any) => { setDetailVisible(false); setSelectedWarehouse(wh); setTimeout(() => setFormVisible(true), 300); }} onDelete={(id: string) => { setDetailVisible(false); setDeleteModal({ visible: true, warehouseId: id }); }} onRestock={(id: string) => { setDetailVisible(false); setTimeout(() => handleOpenRestock(id), 300); }} />
                <RestockFormModal visible={isRestockVisible} onClose={() => setRestockVisible(false)} onSubmit={handleRestockSubmit} warehouses={warehouses} initialWarehouseId={activeWarehouseId} />
                <ConfirmationModal visible={deleteModal.visible} title="Hapus Gudang?" message="Pastikan gudang ini sudah kosong. Gudang yang masih memiliki stok tidak dapat dihapus." confirmText="Hapus" isDanger={true} onConfirm={executeDelete} onCancel={() => setDeleteModal({ visible: false, warehouseId: '' })} />
            </View>
        </MainLayout>
    );
}