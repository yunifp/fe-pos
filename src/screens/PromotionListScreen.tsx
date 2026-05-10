import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, useWindowDimensions } from 'react-native';
import { usePromotionStore } from '../stores/promotionStore';
import { useProductStore } from '../stores/productStore';
import { useSettingStore } from '../stores/settingStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ticket } from 'lucide-react-native';

// Import Reusable Components
import MainLayout from '../components/MainLayout';
import PromotionFormModal from '../components/PromotionFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { CustomToast } from '../components/CustomToast';
import ScreenHeader from '../components/ScreenHeader';
import FloatingActionButton from '../components/FloatingActionButton';
import EmptyState from '../components/EmptyState';
import PromotionCard from '../components/PromotionCard';

export default function PromotionListScreen() {
    const { settings } = useSettingStore();
    const { width } = useWindowDimensions();

    // Responsive Breakpoints
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;
    const itemWidth = 100 / numColumns;

    const { promotions, branches, fetchPromotions, fetchInitialData, createPromotion, updatePromotion, deletePromotion, isLoading } = usePromotionStore();
    const { products: allProducts, fetchProducts } = useProductStore();

    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalVisible, setModalVisible] = useState(false);
    const [editingPromo, setEditingPromo] = useState<any>(null);
    const [deleteModal, setDeleteModal] = useState({ visible: false, id: '' });
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    useEffect(() => {
        AsyncStorage.getItem('user').then(u => {
            if (u) {
                const parsedUser = JSON.parse(u);
                setUser(parsedUser);
                setUserRole(parsedUser.role);
                if (parsedUser.role === 'OWNER') {
                    fetchInitialData();
                    fetchProducts();
                } else {
                    fetchInitialData(parsedUser.branchId);
                    fetchPromotions();
                    fetchProducts(parsedUser.branchId);
                }
            }
        });
    }, []);

    useEffect(() => {
        if (userRole === 'OWNER' && branches.length > 0 && !selectedBranchId && user) {
            const defaultId = user.branch.id;
            setSelectedBranchId(defaultId);
            fetchPromotions(defaultId);
            fetchInitialData(defaultId);
        }
    }, [userRole, branches, user]);

    const handleBranchChange = (id: string) => {
        setSelectedBranchId(id);
        fetchPromotions(id);
        fetchInitialData(id);
    };

    const handleOpenAdd = () => { setEditingPromo(null); setModalVisible(true); };
    const handleOpenEdit = (item: any) => { setEditingPromo(item); setModalVisible(true); };

    const handleFormSubmit = async (data: any) => {
        try {
            if (data.id) {
                await updatePromotion(data.id, data);
                setToast({ visible: true, message: 'Promo diperbarui', type: 'success' });
            } else {
                await createPromotion(data);
                setToast({ visible: true, message: 'Promo diterbitkan', type: 'success' });
            }
            fetchPromotions(userRole === 'OWNER' ? (selectedBranchId as string) : undefined);
        } catch (error) {
            setToast({ visible: true, message: 'Gagal memproses data', type: 'error' });
        }
    };

    const executeDelete = async () => {
        await deletePromotion(deleteModal.id);
        setDeleteModal({ visible: false, id: '' });
        setToast({ visible: true, message: 'Promo dihapus', type: 'success' });
    };

    // Filter Promosi Berdasarkan Pencarian (Nama / Kode Promo)
    const filteredPromotions = promotions.filter((p: any) => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainLayout>
            <View className="relative flex-1 bg-slate-50">
                <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                {/* --- PENGGUNAAN SCREEN HEADER --- */}
                <ScreenHeader 
                    title="Promo & Loyalty"
                    subtitle="Manajemen Diskon Toko"
                    subtitleIcon={<Ticket size={10} color="#6366F1" />}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Cari nama atau kode promo..."
                    userRole={userRole}
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    userBranchName={user?.branch?.name}
                />

                {/* --- LIST AREA --- */}
                {isLoading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color={settings.themePrimaryColor || "#6366F1"} />
                    </View>
                ) : (
                    <FlatList
                        key={numColumns} 
                        numColumns={numColumns} 
                        data={filteredPromotions} 
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <PromotionCard 
                                item={item} 
                                itemWidth={itemWidth} 
                                onEdit={handleOpenEdit} 
                                onDelete={(id) => setDeleteModal({ visible: true, id })} 
                            />
                        )}
                        contentContainerStyle={{ padding: 10, paddingBottom: 100, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <EmptyState 
                                icon={<Ticket size={64} color="#CBD5E1" />} 
                                message={searchQuery ? 'Promo tidak ditemukan' : 'Tidak ada promo aktif'} 
                            />
                        }
                    />
                )}

                <FloatingActionButton 
                    onPress={handleOpenAdd} 
                    color={settings.themePrimaryColor || '#4F46E5'} 
                />

                <PromotionFormModal visible={isModalVisible} onClose={() => setModalVisible(false)} onSubmit={handleFormSubmit} initialData={editingPromo} branches={branches} products={allProducts} userRole={userRole} />
                <ConfirmationModal visible={deleteModal.visible} title="Hapus Promo?" message="Data ini tidak dapat dikembalikan." confirmText="Hapus" isDanger onConfirm={executeDelete} onCancel={() => setDeleteModal({ visible: false, id: '' })} />
            </View>
        </MainLayout>
    );
}