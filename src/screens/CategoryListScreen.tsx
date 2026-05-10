import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useCategoryStore } from '../stores/categoryStore';
import { useSettingStore } from '../stores/settingStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tag, FolderOpen } from 'lucide-react-native';

// Komponen Reusable
import MainLayout from '../components/MainLayout';
import CategoryFormModal from '../components/CategoryFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { CustomToast } from '../components/CustomToast';
import FloatingActionButton from '../components/FloatingActionButton';
import EmptyState from '../components/EmptyState';
import CategoryCard from '../components/CategoryCard';
import ScreenHeader from '../components/ScreenHeader'; // <--- Import ini

export default function CategoryListScreen() {
    const { settings } = useSettingStore();
    const { categories, branches, fetchCategories, fetchInitialData, createCategory, updateCategory, deleteCategory, isLoading } = useCategoryStore();

    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 600 && width < 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;
    const itemWidth = 100 / numColumns;

    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    
    // State Baru untuk Pencarian Kategori
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalVisible, setModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [deleteModal, setDeleteModal] = useState({ visible: false, categoryId: 0 });

    useEffect(() => {
        fetchInitialData();
        AsyncStorage.getItem('user').then(u => {
            if (u) {
                const parsedUser = JSON.parse(u);
                setUser(parsedUser);
                setUserRole(parsedUser.role);
                if (parsedUser.role !== 'OWNER') fetchCategories();
            }
        });
    }, []);

    useEffect(() => {
        if (user && userRole === 'OWNER' && branches.length > 0 && !selectedBranchId) {
            const defaultId = user.branch.id;
            setSelectedBranchId(defaultId);
            fetchCategories(defaultId);
        }
    }, [user, userRole, branches]);

    const handleBranchChange = (id: string) => {
        setSelectedBranchId(id);
        fetchCategories(id);
    };

    const handleOpenAdd = () => { setEditingCategory(null); setModalVisible(true); };
    const handleOpenEdit = (cat: any) => { setEditingCategory(cat); setModalVisible(true); };
    const confirmDelete = (id: number) => setDeleteModal({ visible: true, categoryId: id });
    const showToast = (msg: string, type: 'success' | 'error') => setToast({ visible: true, message: msg, type });

    const handleFormSubmit = async (data: any) => {
        try {
            if (data.id) {
                await updateCategory(data.id, data);
                showToast('Kategori diperbarui', 'success');
            } else {
                await createCategory(data);
                showToast('Kategori ditambahkan', 'success');
            }
            if (userRole === 'OWNER' && selectedBranchId) fetchCategories(selectedBranchId);
            else fetchCategories();
        } catch (error) {
            showToast('Terjadi kesalahan', 'error');
        }
    };

    const executeDelete = async () => {
        const id = deleteModal.categoryId;
        setDeleteModal({ visible: false, categoryId: 0 });
        try {
            await deleteCategory(id);
            showToast('Kategori dihapus', 'success');
            if (userRole === 'OWNER' && selectedBranchId) fetchCategories(selectedBranchId);
            else fetchCategories();
        } catch (e) {
            showToast('Gagal menghapus kategori', 'error');
        }
    };

    // Filter Kategori Berdasarkan Pencarian
    const filteredCategories = categories.filter((c: any) => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainLayout>
            <View className="relative flex-1 bg-gray-50">
                <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                {/* --- PENGGUNAAN SCREEN HEADER --- */}
                <ScreenHeader 
                    title="Kategori"
                    subtitle={`${filteredCategories.length} Grup Terdaftar`}
                    subtitleIcon={<Tag size={10} color="#F97316" />}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Cari kategori..."
                    userRole={userRole}
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    userBranchName={user?.branch?.name}
                />

                {isLoading ? (
                    <View className="items-center justify-center flex-1">
                        <ActivityIndicator size="large" color={settings.themePrimaryColor} />
                    </View>
                ) : (
                    <FlatList
                        key={numColumns}
                        numColumns={numColumns}
                        data={filteredCategories} // Gunakan filteredCategories
                        renderItem={({ item }) => (
                            <CategoryCard item={item} itemWidth={itemWidth} onEdit={handleOpenEdit} onDelete={confirmDelete} />
                        )}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={{ padding: 8, paddingBottom: 100, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <EmptyState 
                                icon={<FolderOpen size={50} color="#CBD5E1" />} 
                                message={searchQuery ? 'Kategori Tidak Ditemukan' : 'Belum Ada Kategori'} 
                            />
                        }
                    />
                )}

                <FloatingActionButton onPress={handleOpenAdd} color={settings.themePrimaryColor || '#4F46E5'} />

                <CategoryFormModal visible={isModalVisible} onClose={() => setModalVisible(false)} onSubmit={handleFormSubmit} initialData={editingCategory} branches={branches} userRole={userRole} />
                <ConfirmationModal visible={deleteModal.visible} title="Hapus Kategori?" message="Yakin hapus? Produk dalam kategori ini akan menjadi 'Umum'." confirmText="Hapus" isDanger={true} onConfirm={executeDelete} onCancel={() => setDeleteModal({ visible: false, categoryId: 0 })} />
            </View>
        </MainLayout>
    );
}