import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useProductStore } from '../stores/productStore';
import { useCategoryStore } from '../stores/categoryStore';
import { useSettingStore } from '../stores/settingStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Package, Box } from 'lucide-react-native';

import MainLayout from '../components/MainLayout';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductFormModal from '../components/ProductFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { CustomToast } from '../components/CustomToast';
import FloatingActionButton from '../components/FloatingActionButton';
import EmptyState from '../components/EmptyState';
import ProductCard from '../components/ProductCard';
import ScreenHeader from '../components/ScreenHeader';

export default function ProductListScreen() {
    const { settings } = useSettingStore();
    const { width } = useWindowDimensions();

    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;
    const itemWidth = 100 / numColumns;

    const { products, branches, fetchProducts, fetchInitialData, createProduct, updateProduct, deleteProduct, isLoading: productLoading } = useProductStore();
    const { categories, fetchCategories, isLoading: categoryLoading } = useCategoryStore();

    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [isFormVisible, setFormVisible] = useState(false);
    const [isDetailVisible, setDetailVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [deleteModal, setDeleteModal] = useState({ visible: false, productId: 0 });
    const [searchQuery, setSearchQuery] = useState('');

    const isLoading = productLoading || categoryLoading;

    useEffect(() => {
        fetchInitialData();
        AsyncStorage.getItem('user').then(u => {
            if (u) {
                const parsedUser = JSON.parse(u);
                setUser(parsedUser);
                setUserRole(parsedUser.role);
                
                // --- PERBAIKAN: Pemanggilan fetchCategories() kini tanpa parameter ---
                fetchCategories(); 

                if (parsedUser.role === 'OWNER') {
                    const defaultBranch = parsedUser.branch?.id;
                    if (defaultBranch) {
                        setSelectedBranchId(defaultBranch);
                        fetchProducts(defaultBranch);
                    }
                } else {
                    fetchProducts(parsedUser.branchId);
                }
            }
        });
    }, []);

    useEffect(() => {
        if (userRole === 'OWNER' && branches.length > 0 && !selectedBranchId && user) {
            const firstBranch = branches[0].id;
            setSelectedBranchId(firstBranch);
            fetchProducts(firstBranch);
        }
    }, [userRole, branches, user]);

    const handleBranchChange = (branchId: string) => {
        setSelectedBranchId(branchId);
        fetchProducts(branchId);
    };

    const handleOpenAdd = () => { setSelectedProduct(null); setFormVisible(true); };
    const handleOpenDetail = (product: any) => { setSelectedProduct(product); setDetailVisible(true); };
    const showToast = (msg: string, type: 'success' | 'error') => setToast({ visible: true, message: msg, type });

    const handleFormSubmit = async (payloadRaw: any) => {
        try {
            const branchIdToUse = userRole === 'OWNER' ? selectedBranchId : user?.branchId;
            
            const payload: any = {
                categoryId: payloadRaw.categoryId,
                name: payloadRaw.name,
                hasVariant: payloadRaw.hasVariant,
            };
            
            if (branchIdToUse) payload.branchId = branchIdToUse;

            if (payloadRaw.hasVariant) {
                payload.variants = payloadRaw.variants;
            } else {
                payload.price = payloadRaw.price;
                payload.trackStock = payloadRaw.trackStock;
                payload.stock = payloadRaw.stock;
                if (payloadRaw.recipes && payloadRaw.recipes.length > 0) {
                    payload.recipes = payloadRaw.recipes;
                }
            }

            if (payloadRaw.id) {
                await updateProduct(payloadRaw.id, payload);
                showToast('Produk diperbarui!', 'success');
            } else {
                await createProduct(payload);
                showToast('Produk ditambahkan!', 'success');
            }
            fetchProducts(branchIdToUse as string);
        } catch (error: any) {
            const errorData = error.response?.data;
            let errorMsg = errorData?.message || 'Gagal menyimpan produk.';
            
            if (errorData?.errors && Array.isArray(errorData.errors)) {
                errorMsg = errorData.errors.map((e: any) => e.message).join('\n');
            } else if (errorData?.error?.issues && Array.isArray(errorData.error.issues)) {
                errorMsg = errorData.error.issues.map((i: any) => i.message).join('\n');
            } else if (errorData?.error) {
                errorMsg += `\nDetail: ${errorData.error}`;
            }
            
            console.error("Payload yang dikirim:", payloadRaw);
            showToast(errorMsg, 'error');
        }
    };

    const executeDelete = async () => {
        const id = deleteModal.productId;
        setDeleteModal({ visible: false, productId: 0 });
        try {
            await deleteProduct(id);
            showToast('Produk dihapus', 'success');
            fetchProducts(userRole === 'OWNER' ? (selectedBranchId as string) : (user?.branchId as string));
        } catch (e) {
            showToast('Gagal menghapus', 'error');
        }
    };

    const filteredProducts = products.filter((p: any) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainLayout>
            <View className="relative flex-1 bg-slate-50">
                <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                <ScreenHeader 
                    title="Katalog Produk"
                    subtitle={`${filteredProducts.length} Item`}
                    subtitleIcon={<Box size={10} color="#6366F1" />}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Cari nama produk..."
                    userRole={userRole}
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    userBranchName={user?.branch?.name}
                />

                {isLoading ? (
                    <View className="items-center justify-center flex-1"><ActivityIndicator size="large" color="#4F46E5" /></View>
                ) : (
                    <FlatList
                        data={filteredProducts}
                        renderItem={({ item }) => (
                            <ProductCard item={item} onPress={handleOpenDetail} itemWidth={itemWidth} currencySymbol={settings.currencySymbol} />
                        )}
                        keyExtractor={(item) => item.id.toString()}
                        numColumns={numColumns}
                        key={numColumns}
                        contentContainerStyle={{ padding: 8, paddingBottom: 100, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={<EmptyState icon={<Package size={60} color="#94A3B8" />} message={searchQuery ? 'Tidak ditemukan' : 'Katalog Kosong'} />}
                    />
                )}

                <FloatingActionButton onPress={handleOpenAdd} color={settings.themePrimaryColor || '#4F46E5'} />

                <ProductFormModal visible={isFormVisible} onClose={() => setFormVisible(false)} onSubmit={handleFormSubmit} initialData={selectedProduct} categories={categories} branches={branches} userRole={userRole} />
                
                <ProductDetailModal visible={isDetailVisible} product={selectedProduct} onClose={() => setDetailVisible(false)} onEdit={() => { setDetailVisible(false); setTimeout(() => setFormVisible(true), 300); }} onDelete={(id: number) => { setDetailVisible(false); setDeleteModal({ visible: true, productId: id }); }} />

                <ConfirmationModal visible={deleteModal.visible} title="Hapus Produk?" message="Data stok produk ini akan dihapus permanen." confirmText="Hapus" isDanger={true} onConfirm={executeDelete} onCancel={() => setDeleteModal({ visible: false, productId: 0 })} />
            </View>
        </MainLayout>
    );
}