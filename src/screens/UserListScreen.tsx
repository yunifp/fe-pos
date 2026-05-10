import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, useWindowDimensions, RefreshControl, Platform, Modal, ScrollView } from 'react-native';
import { useUserStore } from '../stores/userStore';
import BranchSelector from '../components/BranchSelector';
import UserFormModal from '../components/UserFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { CustomToast } from '../components/CustomToast';
import MainLayout from '../components/MainLayout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Plus, Edit, Trash2, User, ShieldCheck, MapPin,
    Users, Eye, X, Mail, Phone, Calendar, Hash, Briefcase
} from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';

export default function UserListScreen() {
    const { settings } = useSettingStore();
    const { width, height } = useWindowDimensions();

    // Breakpoints & Responsive Logic
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

    const { users, branches, fetchUsers, fetchInitialData, createUser, updateUser, deleteUser, isLoading } = useUserStore();

    const [userRole, setUserRole] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

    const [isModalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    // --- STATE BARU DETAIL ---
    const [isDetailVisible, setDetailVisible] = useState(false);
    const [viewingUser, setViewingUser] = useState<any>(null);

    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [deleteModal, setDeleteModal] = useState({ visible: false, userId: '' });

    useEffect(() => {
        AsyncStorage.getItem('user').then(u => {
            if (u) {
                const user = JSON.parse(u);
                setCurrentUser(user);
                setUserRole(user.role);
                if (user.role === 'OWNER') {
                    fetchInitialData();
                } else {
                    fetchUsers();
                }
            }
        });
    }, []);

    useEffect(() => {
        if (currentUser && userRole === 'OWNER' && branches.length > 0 && !selectedBranchId) {
            const defaultId = currentUser.branch.id;
            setSelectedBranchId(defaultId);
            fetchUsers(defaultId);
        }
    }, [currentUser, userRole, branches]);

    const handleBranchChange = (id: string) => {
        setSelectedBranchId(id);
        fetchUsers(id);
    };

    const handleOpenAdd = () => { setEditingUser(null); setModalVisible(true); };
    const handleOpenEdit = (user: any) => { setEditingUser(user); setModalVisible(true); };
    const handleOpenDetail = (user: any) => { setViewingUser(user); setDetailVisible(true); };
    const confirmDelete = (userId: string) => setDeleteModal({ visible: true, userId });

    const handleFormSubmit = async (data: any) => {
        try {
            if (data.id) {
                await updateUser(data.id, data);
                showToast('Data karyawan diperbarui', 'success');
            } else {
                await createUser(data);
                showToast('Karyawan baru ditambahkan', 'success');
            }
            const refreshId = userRole === 'OWNER' ? selectedBranchId : undefined;
            fetchUsers(refreshId as string);
        } catch (error) {
            showToast('Terjadi kesalahan', 'error');
        }
    };

    const executeDelete = async () => {
        await deleteUser(deleteModal.userId);
        setDeleteModal({ visible: false, userId: '' });
        showToast('Karyawan dihapus', 'success');
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ visible: true, message, type });
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'OWNER':
                return { bg: 'bg-indigo-600', text: 'text-white', label: 'Owner' };
            case 'MANAGER':
                return { bg: 'bg-blue-500', text: 'text-white', label: 'Manager' };
            case 'CASHIER':
                return { bg: 'bg-emerald-500', text: 'text-white', label: 'Kasir' };
            case 'KITCHEN':
                return { bg: 'bg-orange-500', text: 'text-white', label: 'Dapur' };
            case 'WAITER':
                return { bg: 'bg-amber-500', text: 'text-white', label: 'Waiter' };
            default:
                return { bg: 'bg-slate-400', text: 'text-white', label: role };
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const badge = getRoleBadge(item.role);
        const itemWidth = 100 / numColumns;

        return (
            <View style={{ width: `${itemWidth}%`, padding: 6 }}>
                <View className="bg-white p-4 rounded-[28px] flex-row shadow-sm border border-slate-100 items-center">
                    {/* INFO USER - Gunakan flex-1 agar mengambil sisa ruang yang ada */}
                    <TouchableOpacity
                        onPress={() => handleOpenDetail(item)}
                        className="flex-row items-center flex-1 mr-2"
                        activeOpacity={0.6}
                    >
                        <View className="items-center justify-center flex-shrink-0 w-12 h-12 border bg-slate-50 border-slate-100 rounded-2xl">
                            <User size={24} color={settings.themePrimaryColor || "#6366F1"} />
                        </View>

                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-black tracking-tight text-slate-800" numberOfLines={1}>
                                {item.fullName}
                            </Text>
                            <View className="flex-row flex-wrap items-center mt-1">
                                <View className={`px-2 py-0.5 rounded-md ${badge.bg} mr-2 mb-1`}>
                                    <Text className={`text-[8px] font-black uppercase tracking-tighter ${badge.text}`}>{badge.label}</Text>
                                </View>
                                <Text className="text-[10px] font-bold text-slate-400 mb-1" numberOfLines={1}>{item.email}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* TOMBOL AKSI - Diberikan flex-shrink-0 agar ukurannya tetap/tidak terjepit */}
                    <View className="flex-row gap-1.5 flex-shrink-0">
                        <TouchableOpacity onPress={() => handleOpenDetail(item)} className="p-2 border bg-slate-50 border-slate-100 rounded-xl">
                            <Eye size={14} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleOpenEdit(item)} className="p-2 border border-indigo-100 bg-indigo-50 rounded-xl">
                            <Edit size={14} color="#4F46E5" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDelete(item.id)} className="p-2 border bg-rose-50 border-rose-100 rounded-xl">
                            <Trash2 size={14} color="#F43F5E" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <MainLayout>
            <View className="relative flex-1 bg-slate-50">
                <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                {/* --- COMPACT HEADER --- */}
                <View className="bg-white shadow-sm z-10 rounded-b-[35px] border-b border-slate-100">
                    <View className={`px-5 py-4 md:px-8 md:py-6 ${isTablet || isDesktop ? 'flex-row items-center justify-between' : 'flex-col'}`}>
                        <View className={isTablet || isDesktop ? '' : 'mb-4'}>
                            <Text className="text-2xl font-black leading-none tracking-tighter uppercase text-slate-900">Karyawan</Text>
                            <View className="flex-row items-center mt-1.5">
                                <View className="p-1 mr-2 bg-indigo-500 rounded-md">
                                    <ShieldCheck size={10} color="white" />
                                </View>
                                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manajemen Akses Staff</Text>
                            </View>
                        </View>

                        <View className={isDesktop || isTablet ? 'w-72' : 'w-full'}>
                            {userRole === 'OWNER' && branches.length > 0 ? (
                                <BranchSelector branches={branches} selectedId={selectedBranchId} onSelect={handleBranchChange} />
                            ) : (
                                <View className="flex-row items-center px-4 py-2.5 border bg-slate-50 rounded-2xl border-slate-100 self-start">
                                    <MapPin size={14} color="#6366F1" />
                                    <Text className="ml-2 text-[11px] font-black tracking-widest uppercase text-slate-500">{currentUser?.branch?.name || 'Cabang Aktif'}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* --- GRID LIST --- */}
                {isLoading ? (
                    <View className="items-center justify-center flex-1">
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</Text>
                    </View>
                ) : (
                    <FlatList
                        key={numColumns}
                        numColumns={numColumns}
                        data={users}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{
                            padding: 12,
                            paddingBottom: 120,
                            maxWidth: 1200,
                            alignSelf: 'center',
                            width: '100%'
                        }}
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoading}
                                onRefresh={() => fetchUsers(userRole === 'OWNER' ? (selectedBranchId ?? undefined) : undefined)}
                                colors={["#6366F1"]}
                            />
                        }
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View className="items-center justify-center mt-20 opacity-30">
                                <Users size={64} color="#94A3B8" strokeWidth={1} />
                                <Text className="mt-4 text-xs font-black tracking-widest text-center uppercase text-slate-400">Belum ada karyawan terdaftar{'\n'}di cabang ini</Text>
                            </View>
                        }
                    />
                )}

                {/* FAB (Floating Action Button) */}
                <TouchableOpacity
                    onPress={handleOpenAdd}
                    activeOpacity={0.8}
                    className="absolute items-center justify-center bg-indigo-600 shadow-lg bottom-8 right-6 w-14 h-14 rounded-2xl shadow-indigo-300 active:scale-95"
                    style={{ right: isDesktop ? (width - 1100) / 2 + 24 : 24 }}
                >
                    <Plus color="white" size={28} strokeWidth={3} />
                </TouchableOpacity>

                {/* --- MODAL LIHAT DETAIL (COMPACT VERSION) --- */}
                <Modal visible={isDetailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
                    <View className="items-center justify-center flex-1 p-4 bg-black/60">
                        <View className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl">

                            {/* Header: Dibuat lebih slim */}
                            <View className="relative items-center p-5 bg-indigo-600">
                                <TouchableOpacity
                                    onPress={() => setDetailVisible(false)}
                                    className="absolute p-1.5 rounded-full top-4 right-4 bg-white/10"
                                >
                                    <X size={18} color="white" />
                                </TouchableOpacity>

                                {/* Ukuran lingkaran profil diperkecil dari w-24 ke w-16 */}
                                <View className="w-16 h-16 bg-white/20 rounded-[24px] items-center justify-center mb-2 border border-white/30">
                                    <User size={32} color="white" strokeWidth={1.5} />
                                </View>

                                <Text className="text-lg font-black tracking-tight text-center text-white uppercase">
                                    {viewingUser?.fullName}
                                </Text>

                                <View className={`mt-1.5 px-3 py-0.5 rounded-lg ${getRoleBadge(viewingUser?.role).bg.replace('100', '200')}`}>
                                    <Text className={`text-[9px] font-black uppercase ${getRoleBadge(viewingUser?.role).text}`}>
                                        {getRoleBadge(viewingUser?.role).label}
                                    </Text>
                                </View>
                            </View>

                            {/* Detail Body: Padding dikurangi dari p-8 ke p-5 */}
                            <ScrollView className="px-6 py-4 max-h-[350px]">
                                <DetailItem icon={<Mail size={14} color="#94A3B8" />} label="Email Address" value={viewingUser?.email} />
                                <DetailItem icon={<Phone size={14} color="#94A3B8" />} label="Phone Number" value={viewingUser?.phone || '-'} />
                                <DetailItem icon={<MapPin size={14} color="#94A3B8" />} label="Cabang" value={viewingUser?.branch?.name || 'Semua Cabang'} />
                                <DetailItem icon={<Briefcase size={14} color="#94A3B8" />} label="Posisi Pekerjaan" value={viewingUser?.jobPosition || '-'} />
                                <DetailItem icon={<ShieldCheck size={14} color="#94A3B8" />} label="Role Akses" value={getRoleBadge(viewingUser?.role).label} />
                                <DetailItem icon={<Calendar size={14} color="#94A3B8" />} label="Bergabung" value={viewingUser?.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} />
                                <DetailItem icon={<Hash size={14} color="#94A3B8" />} label="Internal ID" value={`ID-${viewingUser?.id?.substring(0, 8).toUpperCase()}`} isLast />
                            </ScrollView>

                            {/* Footer Action: Dibuat lebih pendek */}
                            <View className="flex-row gap-2 p-4 border-t bg-slate-50 border-slate-100">
                                <TouchableOpacity
                                    onPress={() => { setDetailVisible(false); handleOpenEdit(viewingUser); }}
                                    className="flex-row items-center justify-center flex-1 py-3 bg-indigo-600 rounded-xl"
                                >
                                    <Edit size={14} color="white" className="mr-2" />
                                    <Text className="text-[11px] font-black text-white uppercase">Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setDetailVisible(false)}
                                    className="items-center justify-center px-5 py-3 bg-white border border-slate-200 rounded-xl"
                                >
                                    <Text className="text-[11px] font-bold uppercase text-slate-500">Tutup</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Existing Modals */}
                <UserFormModal
                    visible={isModalVisible} onClose={() => setModalVisible(false)} onSubmit={handleFormSubmit}
                    initialData={editingUser} branches={branches} userRole={userRole}
                />

                <ConfirmationModal
                    visible={deleteModal.visible} title="Hapus Akun?" message="Akses login akan dicabut permanen dari sistem."
                    confirmText="Ya, Hapus" isDanger={true}
                    onConfirm={executeDelete} onCancel={() => setDeleteModal({ visible: false, userId: '' })}
                />
            </View>
        </MainLayout>
    );
}

// --- SUB COMPONENT DETAIL ITEM ---
function DetailItem({ icon, label, value, isLast }: { icon: any, label: string, value: string, isLast?: boolean }) {
    return (
        <View className={`flex-row items-center ${isLast ? 'mb-1' : 'mb-4'}`}>
            <View className="items-center justify-center w-8 h-8 mr-3 border rounded-lg bg-slate-50 border-slate-100">
                {icon}
            </View>
            <View className="flex-1">
                <Text className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {label}
                </Text>
                <Text className="text-[13px] font-bold text-slate-700 mt-0.5" numberOfLines={1}>
                    {value}
                </Text>
            </View>
        </View>
    );
}