import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, useWindowDimensions, RefreshControl } from 'react-native';
import { Package } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MainLayout from '../components/MainLayout';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import InventoryCard from '../components/InventoryCard';
import InventoryAdjustModal from '../components/InventoryAdjustModal';
import InventoryHistoryModal from '../components/InventoryHistoryModal';

import { useInventoryStore } from '../stores/inventoryStore';
import { useBranchStore } from '../stores/branchStore';

export default function InventoryScreen() {
    const { width } = useWindowDimensions();

    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;
    const itemWidth = 100 / numColumns;

    const {
        products, loading, fetchInventory, adjustStock,
        historyLogs, loadingHistory, loadingMoreHistory, fetchHistory, loadMoreHistory
    } = useInventoryStore();
    const { branches, fetchBranches } = useBranchStore();

    const [user, setUser] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [expandedProducts, setExpandedProducts] = useState<number[]>([]);

    const [adjustModalVisible, setAdjustModalVisible] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    const [historyModalVisible, setHistoryModalVisible] = useState(false);

    useEffect(() => {
        const init = async () => {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const parsed = JSON.parse(u);
                setUser(parsed);

                let targetBranchId = parsed.branch?.id || parsed.branchId;

                if (parsed.role === 'OWNER') {
                    await fetchBranches();
                    const allBranches = useBranchStore.getState().branches;
                    if (allBranches.length > 0) targetBranchId = allBranches[0].id;
                }

                setSelectedBranch(targetBranchId);
                if (targetBranchId) fetchInventory(targetBranchId);
            }
        };
        init();
    }, []);

    const handleSearch = (text: string) => {
        setSearch(text);
        const branchIdToUse = selectedBranch || user?.branchId;
        if (branchIdToUse) fetchInventory(branchIdToUse, text);
    };

    const handleBranchChange = (id: string) => {
        setSelectedBranch(id);
        fetchInventory(id, search);
    };

    const handleRefresh = () => fetchInventory(selectedBranch, search);

    const toggleExpand = (id: number) => {
        setExpandedProducts(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
    };

    const openAdjustModal = (variant: any) => {
        setSelectedVariant(variant);
        setAdjustModalVisible(true);
    };

    const openHistoryModal = (variant: any) => {
        const branchIdToUse = selectedBranch || user?.branchId;
        if (!branchIdToUse) return alert("Data cabang belum siap.");
        setSelectedVariant(variant);
        fetchHistory(branchIdToUse, variant.id, 1);
        setHistoryModalVisible(true);
    };

    const handleAdjustmentSubmit = async (type: string, qty: string, reason: string) => {
        if (!qty || parseInt(qty) <= 0) return alert("Jumlah minimal 1");
        const branchIdToUse = selectedBranch || user?.branchId;
        if (!branchIdToUse) return alert("Cabang tidak valid.");

        setSubmitting(true);
        const res = await adjustStock({
            branchId: branchIdToUse,
            variantId: selectedVariant.id,
            quantity: parseInt(qty),
            type,
            reason
        });
        setSubmitting(false);

        if (res.success) {
            setAdjustModalVisible(false);
            handleRefresh();
        } else {
            alert(res.message);
        }
    };

    return (
        <MainLayout>
            <View className="flex-1 bg-slate-50">
                {/* MENGGUNAKAN SCREEN HEADER */}
                <ScreenHeader 
                    title="Stok Produk"
                    subtitle="Inventory"
                    subtitleIcon={<Package size={10} color="#6366F1" />}
                    searchValue={search}
                    onSearchChange={handleSearch}
                    searchPlaceholder="Cari nama atau SKU..."
                    userRole={user?.role}
                    branches={branches}
                    selectedBranchId={selectedBranch}
                    onBranchChange={handleBranchChange}
                    userBranchName={user?.branch?.name}
                />

                {loading && products.length === 0 ? (
                    <View className="items-center justify-center flex-1">
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text className="mt-4 text-[10px] font-black tracking-widest uppercase text-slate-400">Memuat Stok...</Text>
                    </View>
                ) : (
                    <FlatList
                        key={numColumns}
                        numColumns={numColumns}
                        data={products}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <InventoryCard 
                                item={item} 
                                itemWidth={itemWidth} 
                                isExpanded={expandedProducts.includes(item.id)}
                                onToggleExpand={toggleExpand}
                                onOpenHistory={openHistoryModal}
                                onOpenAdjust={openAdjustModal}
                            />
                        )}
                        contentContainerStyle={{ padding: 10, paddingBottom: 100, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
                        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
                        ListEmptyComponent={
                            <EmptyState 
                                icon={<Package size={60} color="#CBD5E1" />} 
                                message={search ? "Produk tidak ditemukan" : "Inventori Kosong"} 
                            />
                        }
                    />
                )}
            </View>

            <InventoryAdjustModal 
                visible={adjustModalVisible}
                onClose={() => setAdjustModalVisible(false)}
                onSubmit={handleAdjustmentSubmit}
                selectedVariant={selectedVariant}
                submitting={submitting}
            />

            <InventoryHistoryModal 
                visible={historyModalVisible}
                onClose={() => setHistoryModalVisible(false)}
                selectedVariant={selectedVariant}
                historyLogs={historyLogs}
                loadingHistory={loadingHistory}
                loadingMoreHistory={loadingMoreHistory}
                onLoadMore={() => {
                    const branchIdToUse = selectedBranch || user?.branchId;
                    if (selectedVariant && branchIdToUse) loadMoreHistory(branchIdToUse, selectedVariant.id);
                }}
            />
        </MainLayout>
    );
}