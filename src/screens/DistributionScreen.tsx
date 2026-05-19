import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { Truck, CheckCircle2, Navigation } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

import { useDistributionStore } from '../stores/distributionStore';
import { useWarehouseStore } from '../stores/warehouseStore';
import { useMaterialStore } from '../stores/materialStore';
import { useSettingStore } from '../stores/settingStore';
import { useBranchStore } from '../stores/branchStore'; // IMPORT GLOBAL BRANCH STORE

import MainLayout from '../components/MainLayout';
import ScreenHeader from '../components/ScreenHeader';
import { CustomToast } from '../components/CustomToast';
import FloatingActionButton from '../components/FloatingActionButton';
import EmptyState from '../components/EmptyState';

import DistributionFormModal from '../components/DistributionFormModal';
import DistributionDetailModal from '../components/DistributionDetailModal';

export default function DistributionScreen() {
    const { settings } = useSettingStore();
    const { width } = useWindowDimensions();

    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;
    const itemWidth = 100 / numColumns;

    const { distributions, fetchDistributions, createDistribution, receiveDistribution, isLoading } = useDistributionStore();
    const { warehouses, fetchWarehouses } = useWarehouseStore();
    const { materials, fetchMaterials } = useMaterialStore();
    
    // --- STATE CABANG GLOBAL ---
    const { branches, fetchBranches, selectedBranchId, setSelectedBranchId } = useBranchStore();

    const [isFormVisible, setFormVisible] = useState(false);
    const [isDetailVisible, setDetailVisible] = useState(false);
    const [selectedDistribution, setSelectedDistribution] = useState<any>(null);
    
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [searchQuery, setSearchQuery] = useState('');

    const [userRole, setUserRole] = useState('');
    const [userBranchId, setUserBranchId] = useState(''); // Untuk filter role non-owner

    useEffect(() => {
        const initData = async () => {
            try {
                const u = await AsyncStorage.getItem('user');
                if (u) {
                    const parsed = JSON.parse(u);
                    setUserRole(parsed.role || '');
                    setUserBranchId(parsed.branchId || ''); // Simpan real user branchId
                }
            } catch (error) { console.log(error); }
        };
        initData();
        fetchBranches();
        fetchDistributions();
        fetchWarehouses();
        fetchMaterials();
    }, []);

    const showToast = (msg: string, type: 'success' | 'error') => setToast({ visible: true, message: msg, type });

    const handleFormSubmit = async (data: any) => {
        try {
            await createDistribution(data);
            showToast('Surat Jalan berhasil dibuat dan dikirim!', 'success');
        } catch (error) {
            showToast('Gagal mengirim distribusi.', 'error');
        }
    };

    const handleReceive = async (id: string) => {
        try {
            await receiveDistribution(id);
            setDetailVisible(false);
            showToast('Barang diterima! Stok cabang otomatis bertambah.', 'success');
        } catch (error) {
            showToast('Gagal memproses penerimaan.', 'error');
        }
    };

    // Filter: Tampilkan berdasarkan search dan cabang terpilih (Jika bukan owner, cabang fix)
    const filteredData = distributions.filter((d: any) => {
        const matchSearch = d.sourceWarehouse?.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.destBranch?.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Cek cabang
        let matchBranch = true;
        if (userRole === 'OWNER' || userRole === 'MANAGER') {
             // Tampilkan semua jika selectedBranchId == all, jika tidak cocokan dengan cabang di store
             if (selectedBranchId !== 'all') {
                 matchBranch = d.destBranchId === selectedBranchId;
             }
        } else {
             // Non owner/manager hanya bisa lihat cabang miliknya
             matchBranch = d.destBranchId === userBranchId;
        }

        return matchSearch && matchBranch;
    });

    const getActiveBranchName = () => {
        if (selectedBranchId === 'all') return 'Semua Cabang';
        if (!selectedBranchId) return 'Pilih Cabang';
        const br = branches.find(b => b.id === selectedBranchId);
        return br ? br.name : 'Cabang';
    };

    const renderCard = ({ item }: { item: any }) => {
        const isReceived = item.status === 'RECEIVED';
        return (
            <View style={{ width: `${itemWidth}%`, padding: 6 }}>
                <TouchableOpacity onPress={() => { setSelectedDistribution(item); setDetailVisible(true); }} className="flex-row items-center p-4 bg-white border shadow-sm rounded-2xl border-slate-100">
                    <View className={`items-center justify-center mr-4 border w-12 h-12 rounded-xl ${isReceived ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                        {isReceived ? <CheckCircle2 color="#10B981" size={20} /> : <Truck color="#F59E0B" size={20} />}
                    </View>
                    <View className="justify-center flex-1 pr-1">
                        <Text className="text-xs font-black text-slate-800 leading-tight mb-0.5" numberOfLines={1}>{item.sourceWarehouse?.name} → {item.destBranch?.name}</Text>
                        <Text className="text-[9px] font-bold text-slate-400 mb-1" numberOfLines={1}>{moment(item.dispatchedAt).format('DD MMM YYYY')}</Text>
                        <View className="self-start mt-1">
                            <Text className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isReceived ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {isReceived ? 'Diterima' : 'In Transit'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <MainLayout>
            <View className="relative flex-1 bg-slate-50">
                <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                <ScreenHeader 
                    title="Distribusi Barang"
                    subtitle={`${filteredData.length} Surat Jalan`}
                    subtitleIcon={<Navigation size={10} color="#6366F1" />}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Cari riwayat pengiriman..."
                    userRole={userRole}
                    branches={branches}
                    selectedBranchId={selectedBranchId} // DIHUBUNGKAN KE ZUSTAND
                    onBranchChange={setSelectedBranchId} // BISA KLIK!
                    userBranchName={getActiveBranchName()}
                    showAllBranchOption={true} // Boleh nampilkan option "Semua Cabang"
                />

                {isLoading ? (
                    <View className="items-center justify-center flex-1"><ActivityIndicator size="large" color="#4F46E5" /></View>
                ) : (
                    <FlatList
                        data={filteredData}
                        renderItem={renderCard}
                        keyExtractor={(item) => item.id}
                        numColumns={numColumns}
                        key={numColumns}
                        contentContainerStyle={{ padding: 8, paddingBottom: 100, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={<EmptyState icon={<Truck size={60} color="#94A3B8" />} message="Belum ada riwayat distribusi" />}
                    />
                )}

                {/* Tombol Buat Distribusi hanya untuk Pusat / OWNER */}
                {(userRole === 'OWNER' || userRole === 'MANAGER') && (
                    <FloatingActionButton onPress={() => setFormVisible(true)} color={settings.themePrimaryColor || '#4F46E5'} />
                )}

                <DistributionFormModal 
                    visible={isFormVisible} 
                    onClose={() => setFormVisible(false)} 
                    onSubmit={handleFormSubmit} 
                    warehouses={warehouses}
                    branches={branches}
                    materials={materials}
                />
                
                <DistributionDetailModal 
                    visible={isDetailVisible} 
                    distribution={selectedDistribution} 
                    onClose={() => setDetailVisible(false)}
                    onReceive={handleReceive}
                    currentUserRole={userRole}
                    currentUserBranchId={userBranchId}
                />
            </View>
        </MainLayout>
    );
}