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
import ScreenHeader from '../components/ScreenHeader';

export default function CategoryListScreen() {
    const { settings } = useSettingStore();
    const { categories, fetchCategories, createCategory, updateCategory, deleteCategory, isLoading } = useCategoryStore();

    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 600 && width < 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;
    const itemWidth = 100 / numColumns;

    const [userRole, setUserRole] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalVisible, setModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [deleteModal, setDeleteModal] = useState({ visible: false, categoryId: 0 });

    useEffect(() => {
        const init = async () => {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const parsedUser = JSON.parse(u);
                setUserRole(parsedUser.role);
            }
            // Langsung fetch data global
            fetchCategories();
        };
        init();
    }, []);

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
        } catch (e: any) {
            showToast('Kategori gagal dihapus (kemungkinan masih dipakai di Produk)', 'error');
        }
    };

    // Safely filter categories
    const filteredCategories = (categories || []).filter((c: any) => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainLayout>
            <View className="relative flex-1 bg-gray-50">
                <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                <ScreenHeader 
                    title="Kategori"
                    subtitle={`${filteredCategories.length} Grup Terdaftar`}
                    subtitleIcon={<Tag size={10} color="#F97316" />}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Cari kategori..."
                    userRole={userRole}
                    branches={[]} // Kosong karena Kategori tidak dilimitasi per cabang
                    selectedBranchId={null}
                    onBranchChange={() => {}}
                    userBranchName="Berlaku Global"
                />

                {isLoading ? (
                    <View className="items-center justify-center flex-1">
                        <ActivityIndicator size="large" color={settings.themePrimaryColor || '#4F46E5'} />
                    </View>
                ) : (
                    <FlatList
                        key={numColumns}
                        numColumns={numColumns}
                        data={filteredCategories}
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

                <CategoryFormModal 
                    visible={isModalVisible} 
                    onClose={() => setModalVisible(false)} 
                    onSubmit={handleFormSubmit} 
                    initialData={editingCategory} 
                />
                
                <ConfirmationModal 
                    visible={deleteModal.visible} 
                    title="Hapus Kategori?" 
                    message="Yakin hapus? Kategori ini tidak bisa dihapus jika ada produk yang menggunakannya." 
                    confirmText="Hapus" 
                    isDanger={true} 
                    onConfirm={executeDelete} 
                    onCancel={() => setDeleteModal({ visible: false, categoryId: 0 })} 
                />
            </View>
        </MainLayout>
    );
}