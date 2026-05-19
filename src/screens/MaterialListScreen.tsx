import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Package, Archive } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useMaterialStore } from '../stores/materialStore';
import { useSettingStore } from '../stores/settingStore';
import { useBranchStore } from '../stores/branchStore'; // IMPORT GLOBAL BRANCH STORE

import MainLayout from '../components/MainLayout';
import ScreenHeader from '../components/ScreenHeader';
import { CustomToast } from '../components/CustomToast';
import FloatingActionButton from '../components/FloatingActionButton';
import EmptyState from '../components/EmptyState';
import ConfirmationModal from '../components/ConfirmationModal';

import MaterialFormModal from '../components/MaterialFormModal';
import MaterialCard from '../components/MaterialCard';
import MaterialDetailModal from '../components/MaterialDetailModal';

export default function MaterialListScreen() {
    const { settings } = useSettingStore();
    const { width } = useWindowDimensions();

    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;
    const itemWidth = 100 / numColumns;

    const { materials, fetchMaterials, createMaterial, updateMaterial, deleteMaterial, isLoading } = useMaterialStore();
    
    // --- STATE CABANG GLOBAL ---
    const { branches, fetchBranches, selectedBranchId, setSelectedBranchId } = useBranchStore();

    const [isFormVisible, setFormVisible] = useState(false);
    const [isDetailVisible, setDetailVisible] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
    
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [deleteModal, setDeleteModal] = useState({ visible: false, materialId: '' });
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
            } catch (error) {
                console.log("Error fetching header data", error);
            }
        };

        initData();
        fetchBranches();
        fetchMaterials();
    }, []);

    const showToast = (msg: string, type: 'success' | 'error') => setToast({ visible: true, message: msg, type });

    const handleOpenAdd = () => { setSelectedMaterial(null); setFormVisible(true); };
    const handleOpenDetail = (material: any) => { setSelectedMaterial(material); setDetailVisible(true); };

    const handleFormSubmit = async (data: any) => {
        try {
            if (data.id) {
                await updateMaterial(data.id, data);
                showToast('Material diperbarui!', 'success');
            } else {
                await createMaterial(data);
                showToast('Material ditambahkan!', 'success');
            }
        } catch (error) {
            showToast('Gagal memproses data.', 'error');
        }
    };

    const executeDelete = async () => {
        const id = deleteModal.materialId;
        setDeleteModal({ visible: false, materialId: '' });
        try {
            await deleteMaterial(id);
            showToast('Material dihapus', 'success');
        } catch (e) {
            showToast('Gagal menghapus material karena masih terikat dengan resep produk.', 'error');
        }
    };

    const filteredMaterials = materials.filter((m: any) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Fungsi untuk mendapatkan nama cabang terpilih
    const getActiveBranchName = () => {
        if (!selectedBranchId) return 'Cabang';
        const br = branches.find(b => b.id === selectedBranchId);
        return br ? br.name : 'Cabang';
    };

    return (
        <MainLayout>
            <View className="relative flex-1 bg-slate-50">
                <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                {/* --- PENGATURAN SCREEN HEADER DINAMIS --- */}
                <ScreenHeader 
                    title="Master Material"
                    subtitle={`${filteredMaterials.length} Bahan Fisik`}
                    subtitleIcon={<Archive size={10} color="#6366F1" />}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Cari nama material..."
                    userRole={userRole}
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    onBranchChange={setSelectedBranchId} // BISA KLIK GANTI CABANG
                    userBranchName={getActiveBranchName()}
                />

                {isLoading ? (
                    <View className="items-center justify-center flex-1"><ActivityIndicator size="large" color="#4F46E5" /></View>
                ) : (
                    <FlatList
                        data={filteredMaterials}
                        renderItem={({ item }) => <MaterialCard item={item} onPress={handleOpenDetail} itemWidth={itemWidth} />}
                        keyExtractor={(item) => item.id}
                        numColumns={numColumns}
                        key={numColumns}
                        contentContainerStyle={{ padding: 8, paddingBottom: 100, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={<EmptyState icon={<Package size={60} color="#94A3B8" />} message={searchQuery ? 'Material tidak ditemukan' : 'Belum ada bahan baku'} />}
                    />
                )}

                <FloatingActionButton onPress={handleOpenAdd} color={settings.themePrimaryColor || '#4F46E5'} />

                <MaterialFormModal visible={isFormVisible} onClose={() => setFormVisible(false)} onSubmit={handleFormSubmit} initialData={selectedMaterial} />
                <MaterialDetailModal 
                    visible={isDetailVisible} 
                    material={selectedMaterial} 
                    onClose={() => setDetailVisible(false)}
                    onEdit={() => { setDetailVisible(false); setTimeout(() => setFormVisible(true), 300); }}
                    onDelete={(id: string) => { setDetailVisible(false); setDeleteModal({ visible: true, materialId: id }); }}
                />
                <ConfirmationModal visible={deleteModal.visible} title="Hapus Material?" message="Material tidak dapat dihapus jika sudah terikat pada resep produk (BOM)." confirmText="Hapus" isDanger={true} onConfirm={executeDelete} onCancel={() => setDeleteModal({ visible: false, materialId: '' })} />
            </View>
        </MainLayout>
    );
}