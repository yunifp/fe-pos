import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { useBranchStore } from '../stores/branchStore';
import BranchFormModal from '../components/BranchFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { CustomToast } from '../components/CustomToast';
import MainLayout from '../components/MainLayout';
import { Plus, Edit, Trash2, MapPin, Phone, Building, Globe, Layers } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';

export default function BranchListScreen() {
    const { settings } = useSettingStore();
    const { width } = useWindowDimensions();
    const { branches, fetchBranches, createBranch, updateBranch, deleteBranch, isLoading } = useBranchStore();

    // RESPONSIVE LOGIC
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

    // STATES
    const [isFormVisible, setFormVisible] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [deleteModal, setDeleteModal] = useState({ visible: false, branchId: '' });

    useEffect(() => { fetchBranches(); }, []);

    // HANDLERS
    const handleOpenAdd = () => { setEditingBranch(null); setFormVisible(true); };
    const handleOpenEdit = (branch: any) => { setEditingBranch(branch); setFormVisible(true); };
    const showToast = (msg: string, type: 'success' | 'error') => setToast({ visible: true, message: msg, type });

    const handleFormSubmit = async (data: any) => {
        try {
            if (data.id) {
                await updateBranch(data.id, data);
                showToast('Cabang berhasil diperbarui', 'success');
            } else {
                await createBranch(data);
                showToast('Cabang baru ditambahkan', 'success');
            }
            fetchBranches();
        } catch (error) { showToast('Terjadi kesalahan sistem', 'error'); }
    };

    const confirmDelete = (id: string) => setDeleteModal({ visible: true, branchId: id });
    const executeDelete = async () => {
        try {
            await deleteBranch(deleteModal.branchId);
            showToast('Cabang berhasil dihapus', 'success');
        } catch (e) { showToast('Gagal menghapus cabang', 'error'); }
        setDeleteModal({ visible: false, branchId: '' });
    };

    const renderItem = ({ item }: { item: any }) => {
        const itemWidth = 100 / numColumns;
        return (
            <View style={{ width: `${itemWidth}%`, padding: 6 }}>
                <View className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-col justify-between h-full">
                    <View>
                        <View className="flex-row items-start justify-between mb-3">
                            <View className="flex-row items-center flex-1 pr-2">
                                <View className="items-center justify-center w-10 h-10 mr-3 border border-blue-100 bg-blue-50 rounded-xl">
                                    <Building size={18} color="#3B82F6" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-black text-slate-800 uppercase italic" numberOfLines={1}>{item.name}</Text>
                                    <View className="bg-emerald-50 self-start px-1.5 py-0.5 rounded-md border border-emerald-100 mt-0.5">
                                        <Text className="text-[8px] font-black text-emerald-600 tracking-widest">AKTIF</Text>
                                    </View>
                                </View>
                            </View>
                            <View className="flex-row gap-1">
                                <TouchableOpacity onPress={() => handleOpenEdit(item)} className="p-2 border bg-slate-50 rounded-lg border-slate-200 active:bg-indigo-50">
                                    <Edit size={14} color="#64748B" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => confirmDelete(item.id)} className="p-2 border border-rose-100 bg-rose-50 rounded-lg active:bg-rose-100">
                                    <Trash2 size={14} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="p-3 border border-slate-50 bg-slate-50/50 rounded-xl">
                            {item.address ? (
                                <View className="flex-row items-start mb-2">
                                    <MapPin size={12} color="#94A3B8" style={{ marginTop: 2 }} />
                                    <Text className="flex-1 ml-2 text-[10px] font-bold leading-4 text-slate-500" numberOfLines={2}>{item.address}</Text>
                                </View>
                            ) : null}

                            <View className="flex-row flex-wrap gap-2 pt-2 border-t border-slate-100">
                                {(item.latitude !== 0) && (
                                    <View className="flex-row items-center">
                                        <Globe size={10} color="#10B981" />
                                        <Text className="ml-1 text-[9px] font-bold text-slate-400">GPS OK</Text>
                                    </View>
                                )}
                                {item.phone ? (
                                    <View className="flex-row items-center">
                                        <Phone size={10} color="#94A3B8" />
                                        <Text className="ml-1 text-[9px] font-bold text-slate-400">{item.phone}</Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <MainLayout>
            <View className="relative flex-1 bg-slate-50">
                <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                {/* HEADER COMPACT */}
                <View className="bg-white shadow-sm z-10 rounded-b-[30px] border-b border-slate-100">
                    <View className="px-6 py-5 md:py-7 flex-row items-center justify-between">
                        <View>
                            <Text className="text-xl font-black tracking-tighter uppercase text-slate-900 leading-none">Outlet & Cabang</Text>
                            <View className="flex-row items-center mt-1">
                                <Layers size={10} color="#3B82F6" />
                                <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1.5">{branches.length} Lokasi Terdaftar</Text>
                            </View>
                        </View>
                        <View className="items-center justify-center w-10 h-10 border border-blue-100 rounded-full bg-blue-50">
                            <Building size={20} color="#3B82F6" />
                        </View>
                    </View>
                </View>

                {isLoading ? (
                    <View className="items-center justify-center flex-1"><ActivityIndicator size="large" color={settings.themePrimaryColor} /></View>
                ) : (
                    <FlatList
                        key={numColumns}
                        numColumns={numColumns}
                        data={branches}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 10, paddingBottom: 100, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View className="items-center justify-center mt-20 opacity-30">
                                <Building size={64} color="#CBD5E1" />
                                <Text className="mt-4 text-xs font-black uppercase text-slate-400">Belum ada cabang</Text>
                            </View>
                        }
                    />
                )}

                <TouchableOpacity
                    onPress={handleOpenAdd}
                    activeOpacity={0.8}
                    className="absolute bottom-6 right-6 w-14 h-14 rounded-2xl justify-center items-center shadow-lg active:scale-95"
                    style={{
                        backgroundColor: settings.themePrimaryColor,
                        shadowColor: settings.themePrimaryColor,
                        right: isDesktop ? (width - 1100) / 2 > 24 ? (width - 1100) / 2 : 24 : 24
                    }}
                >
                    <Plus color="white" size={28} strokeWidth={3} />
                </TouchableOpacity>

                <BranchFormModal visible={isFormVisible} onClose={() => setFormVisible(false)} onSubmit={handleFormSubmit} initialData={editingBranch} />
                <ConfirmationModal visible={deleteModal.visible} title="Hapus Cabang?" message="Tindakan ini tidak dapat dibatalkan." confirmText="Hapus" isDanger={true} onConfirm={executeDelete} onCancel={() => setDeleteModal({ visible: false, branchId: '' })} />
            </View>
        </MainLayout>
    );
}