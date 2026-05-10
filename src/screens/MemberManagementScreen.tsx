import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, useWindowDimensions, RefreshControl } from 'react-native';
import { useMemberStore } from '../stores/memberStore';
import { useHRStore } from '../stores/hrStore';
import { useSettingStore } from '../stores/settingStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Award, Users } from 'lucide-react-native';

// Import Reusable Components
import MainLayout from '../components/MainLayout';
import { CustomToast } from '../components/CustomToast';
import ConfirmationModal from '../components/ConfirmationModal';
import ScreenHeader from '../components/ScreenHeader';
import FloatingActionButton from '../components/FloatingActionButton';
import EmptyState from '../components/EmptyState';
import MemberCard from '../components/MemberCard';
import MemberFormModal from '../components/MemberFormModal';

export default function MemberScreen() {
    const { members, fetchMembers, isLoading, deleteMember, saveMember } = useMemberStore();
    const { branches, fetchBranches } = useHRStore();
    const { settings, fetchSettings } = useSettingStore();

    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth >= 1024;
    const isTablet = windowWidth >= 768 && windowWidth < 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;
    const itemWidth = 100 / numColumns;

    const [user, setUser] = useState<any>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);

    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
    const [memberIdToDelete, setMemberIdToDelete] = useState<string | null>(null);

    useEffect(() => {
        const initScreen = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('user');
                fetchSettings();
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    setUser(parsed);
                    const defaultId = parsed.branch?.id || parsed.branchId;
                    setSelectedBranchId(defaultId);
                    if (parsed.role === 'OWNER') {
                        await fetchBranches();
                    }
                    await fetchMembers(defaultId);
                }
            } catch (error) {
                console.error("Initialization Error:", error);
            }
        };
        initScreen();
    }, []);

    const showToast = (message: string, type: 'success' | 'error') => setToast({ visible: true, message, type });

    const handleBranchChange = (id: string) => {
        setSelectedBranchId(id);
        fetchMembers(id, searchQuery);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        fetchMembers(selectedBranchId, text);
    };

    const handleOpenAdd = () => { setEditingMember(null); setModalVisible(true); };
    const handleOpenEdit = (item: any) => { setEditingMember(item); setModalVisible(true); };

    const handleSave = async (data: any) => {
        try {
            await saveMember(data);
            fetchMembers(selectedBranchId, searchQuery);
            showToast("Data member berhasil disimpan", "success");
        } catch (error: any) {
            showToast(error.response?.data?.message || "Terjadi kesalahan", "error");
            throw error; // Lempar error kembali ke modal agar loading berhenti
        }
    };

    const handleDeleteTrigger = (id: string) => {
        setMemberIdToDelete(id);
        setConfirmDeleteVisible(true);
    };

    const onConfirmDelete = async () => {
        if (!memberIdToDelete) return;
        try {
            await deleteMember(memberIdToDelete);
            fetchMembers(selectedBranchId, searchQuery);
            showToast("Member berhasil dihapus", "success");
        } catch (e) {
            showToast("Tidak dapat menghapus member", "error");
        } finally {
            setConfirmDeleteVisible(false);
            setMemberIdToDelete(null);
        }
    };

    return (
        <MainLayout>
            <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
            <ConfirmationModal visible={confirmDeleteVisible} title="Hapus Member" message="Data poin dan histori pelanggan ini akan dihapus permanen." isDanger onConfirm={onConfirmDelete} onCancel={() => { setConfirmDeleteVisible(false); setMemberIdToDelete(null); }} />

            <View className="flex-1 bg-slate-50">
                {/* --- MENGGUNAKAN SCREEN HEADER --- */}
                <ScreenHeader 
                    title="Database Member"
                    subtitle={`${members.length} Pelanggan Loyal`}
                    subtitleIcon={<Award size={10} color="#6366F1" />}
                    searchValue={searchQuery}
                    onSearchChange={handleSearch}
                    searchPlaceholder="Cari nama atau no. HP..."
                    userRole={user?.role}
                    branches={branches || []}
                    selectedBranchId={selectedBranchId}
                    onBranchChange={handleBranchChange}
                    userBranchName={user?.branch?.name}
                />

                {/* --- LIST DATA GRID --- */}
                {isLoading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color={settings.themePrimaryColor || '#4F46E5'} />
                    </View>
                ) : (
                    <FlatList
                        key={numColumns}
                        numColumns={numColumns}
                        data={members}
                        renderItem={({ item }) => (
                            <MemberCard 
                                item={item} 
                                itemWidth={itemWidth} 
                                onEdit={handleOpenEdit} 
                                onDelete={handleDeleteTrigger} 
                            />
                        )}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={{ padding: 10, paddingBottom: 100, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchMembers(selectedBranchId, searchQuery)} />}
                        ListEmptyComponent={
                            <EmptyState 
                                icon={<Users size={60} color="#CBD5E1" />} 
                                message={searchQuery ? 'Member tidak ditemukan' : 'Belum ada member'} 
                            />
                        }
                    />
                )}
            </View>

            <FloatingActionButton 
                onPress={handleOpenAdd} 
                color={settings.themePrimaryColor || '#4F46E5'} 
            />

            <MemberFormModal 
                visible={modalVisible} 
                onClose={() => setModalVisible(false)} 
                onSubmit={handleSave} 
                initialData={editingMember} 
                branches={branches || []} 
                userRole={user?.role} 
                selectedBranchId={selectedBranchId}
            />
        </MainLayout>
    );
}