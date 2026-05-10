import React, { useEffect, useState, createElement } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Modal, TextInput,
    ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView,
    useWindowDimensions, StyleSheet, TouchableWithoutFeedback, Keyboard, ViewStyle
} from 'react-native';
import MainLayout from '../components/MainLayout';
import { useHRStore } from '../stores/hrStore';
import { useProductStore } from '../stores/productStore';
import { useUserStore } from '../stores/userStore';
import BranchSelector from '../components/BranchSelector';
import ShiftFormModal from '../components/ShiftFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { CustomToast } from '../components/CustomToast';
import {
    Plus, Clock, Trash2, Edit2, Calendar as CalendarIcon,
    Users, X, MapPin, LayoutGrid, Info, CheckCircle, User
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ShiftManagementScreen() {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isDesktop = windowWidth >= 1024;
    const isTablet = windowWidth >= 768 && windowWidth < 1024;
    const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

    const {
        shifts, schedules, fetchShifts, createShift, updateShift,
        deleteShift, fetchSchedules, assignManualSchedule, updateSchedule, deleteSchedule,
        generateAutoSchedule, isLoading
    } = useHRStore();
    const { branches, fetchInitialData } = useProductStore();
    const { users, fetchUsers } = useUserStore();

    const [userRole, setUserRole] = useState('');
    const [activeTab, setActiveTab] = useState<'SHIFTS' | 'SCHEDULES'>('SHIFTS');
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<string | null>(null);

    // --- MODAL STATES ---
    const [shiftModalVisible, setShiftModalVisible] = useState(false);
    const [editingShift, setEditingShift] = useState<any>(null);
    const [editingSchedule, setEditingSchedule] = useState<any>(null); // State untuk Edit Jadwal
    const [modalManualVisible, setModalManualVisible] = useState(false);
    const [modalAutoVisible, setModalAutoVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'SHIFT' | 'SCHEDULE' } | null>(null);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    // --- FORM STATES ---
    const [manualForm, setManualForm] = useState({ userId: '', shiftId: '', date: new Date() });
    const [autoForm, setAutoForm] = useState({ startDate: new Date(), endDate: new Date(), targetBranchId: '' });
    const [pickerMode, setPickerMode] = useState<'MANUAL' | 'AUTO_START' | 'AUTO_END' | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => setToast({ visible: true, message, type });

    useEffect(() => {
        const init = async () => {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const parsed = JSON.parse(u);
                setUserRole(parsed.role);
                if (parsed.role === 'OWNER') {
                    await fetchInitialData();
                    fetchUsers();
                } else {
                    setSelectedBranchFilter(parsed.branch.id);
                    fetchUsers(parsed.branch.id);
                }
            }
        };
        init();
    }, []);

    useEffect(() => {
        const setDefaultBranch = async () => {
            if (userRole === 'OWNER' && branches.length > 0 && selectedBranchFilter === null) {
                const u = await AsyncStorage.getItem('user');
                if (u) {
                    const parsedUser = JSON.parse(u);
                    if (parsedUser.branch?.id) {
                        setSelectedBranchFilter(parsedUser.branch.id);
                    }
                }
            }
        };
        setDefaultBranch();
    }, [userRole, branches, selectedBranchFilter]);

    useEffect(() => {
        if (selectedBranchFilter) {
            fetchShifts(selectedBranchFilter);
            fetchSchedules(undefined, selectedBranchFilter);
            if (userRole === 'OWNER') fetchUsers(selectedBranchFilter);
        } else if (userRole === 'OWNER' && selectedBranchFilter === null) {
            fetchShifts(null);
            fetchSchedules(undefined, null);
        }
    }, [selectedBranchFilter]);

    // --- HANDLERS ---
    const handleShiftSubmit = async (formData: any) => {
        try {
            if (editingShift) await updateShift(editingShift.id, formData);
            else await createShift({ ...formData, branchId: selectedBranchFilter });
            showToast('Berhasil disimpan!', 'success');
            setShiftModalVisible(false);
            fetchShifts(selectedBranchFilter);
        } catch (error) { showToast('Gagal menyimpan.', 'error'); }
    };

    const confirmDeletion = async () => {
        if (!itemToDelete) return;
        try {
            if (itemToDelete.type === 'SHIFT') await deleteShift(itemToDelete.id);
            else await deleteSchedule(itemToDelete.id);
            showToast('Data dihapus.', 'success');
            setDeleteModalVisible(false);
            activeTab === 'SHIFTS' ? fetchShifts(selectedBranchFilter) : fetchSchedules(undefined, selectedBranchFilter);
        } catch (e) { showToast('Gagal menghapus.', 'error'); }
    };

    const handleManualAssign = async () => {
        if (!manualForm.userId || !manualForm.shiftId) return showToast('Lengkapi data!', 'error');
        try {
            if (editingSchedule) {
                // LOGIKA UPDATE JADWAL (ID Schedule, ShiftID, Date)
                await updateSchedule(editingSchedule.id, { shiftId: manualForm.shiftId, date: manualForm.date.toISOString() });
                showToast('Jadwal diperbarui.', 'success');
            } else {
                // LOGIKA CREATE JADWAL BARU
                await assignManualSchedule({ ...manualForm, branchId: selectedBranchFilter });
                showToast('Jadwal disimpan.', 'success');
            }
            setModalManualVisible(false);
            setEditingSchedule(null);
            fetchSchedules(undefined, selectedBranchFilter);
        } catch (e) { showToast('Gagal menyimpan.', 'error'); }
    };

    const handleAutoGenerate = async () => {
        const target = userRole === 'OWNER' ? (autoForm.targetBranchId || selectedBranchFilter) : '';
        if (!target) return showToast('Pilih cabang!', 'error');
        try {
            await generateAutoSchedule({ ...autoForm, targetBranchId: target });
            setModalAutoVisible(false);
            fetchSchedules(undefined, selectedBranchFilter);
            showToast('Berhasil generate!', 'success');
        } catch (e) { showToast('Gagal generate.', 'error'); }
    };

    // --- REUSABLE DATE INPUT COMPONENT (SINKRON WEB & ANDROID) ---
    const DateInputButton = ({ label, dateValue, modeKey, containerStyle = {} }: any) => {
        return (
            <View style={containerStyle}>
                {label && <Text className="mb-1.5 ml-1 text-[10px] font-black tracking-widest uppercase text-slate-400">{label}</Text>}
                {Platform.OS === 'web' ? (
                    createElement('input', {
                        type: 'date',
                        value: dateValue.toISOString().split('T')[0],
                        onChange: (e: any) => {
                            const d = new Date(e.target.value);
                            if (modeKey === 'MANUAL') setManualForm(prev => ({ ...prev, date: d }));
                            else if (modeKey === 'AUTO_START') setAutoForm(prev => ({ ...prev, startDate: d }));
                            else if (modeKey === 'AUTO_END') setAutoForm(prev => ({ ...prev, endDate: d }));
                        },
                        style: {
                            width: '100%',
                            height: 48,
                            padding: '0 16px',
                            borderRadius: 12,
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#F8FAFC',
                            fontSize: 14,
                            fontWeight: '700',
                            color: '#334155',
                            outline: 'none'
                        }
                    })
                ) : (
                    <TouchableOpacity
                        onPress={() => setPickerMode(modeKey)}
                        className="flex-row items-center h-12 px-4 border border-slate-200 bg-slate-50 rounded-xl active:bg-slate-100"
                    >
                        <CalendarIcon size={16} color="#4F46E5" />
                        <Text className="ml-2 text-sm font-bold text-slate-700">
                            {dateValue.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const getPickerValue = () => {
        if (pickerMode === 'MANUAL') return manualForm.date;
        if (pickerMode === 'AUTO_START') return autoForm.startDate;
        if (pickerMode === 'AUTO_END') return autoForm.endDate;
        return new Date();
    };

    // --- RENDERERS ---
    const renderShiftItem = ({ item }: { item: any }) => {
        const itemWidth = isDesktop ? '33.33%' : isTablet ? '50%' : '100%';
        return (
            <View style={{ width: itemWidth, padding: 6 }}>
                <View className="flex-row items-center justify-between p-4 bg-white border shadow-sm border-slate-100 rounded-2xl min-h-[80px]">
                    <View className="flex-1 mr-2">
                        <Text className="text-sm italic font-black uppercase text-slate-800" numberOfLines={1}>{item.name}</Text>
                        <View className="flex-row items-center mt-1">
                            <Clock size={12} color="#6366F1" />
                            <Text className="ml-1 text-[10px] font-bold text-slate-400">{item.startTime} - {item.endTime}</Text>
                        </View>
                    </View>
                    <View className="flex-row gap-1.5">
                        <TouchableOpacity onPress={() => { setEditingShift(item); setShiftModalVisible(true); }} className="p-2 border border-indigo-100 rounded-lg bg-indigo-50">
                            <Edit2 size={14} color="#4F46E5" strokeWidth={3} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setItemToDelete({ id: item.id, type: 'SHIFT' }); setDeleteModalVisible(true); }} className="p-2 border rounded-lg bg-rose-50 border-rose-100">
                            <Trash2 size={14} color="#EF4444" strokeWidth={3} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderScheduleItem = ({ item }: { item: any }) => {
        const itemWidth = isDesktop ? '33.33%' : isTablet ? '50%' : '100%';
        return (
            <View style={{ width: itemWidth, padding: 6 }}>
                <View className="flex-row items-center p-4 bg-white border shadow-sm border-slate-100 rounded-2xl min-h-[90px]">
                    <View className="items-center justify-center flex-shrink-0 mr-3 border border-indigo-100 w-11 h-11 rounded-xl bg-indigo-50">
                        <Text className="text-base font-black text-indigo-600">{item.user.fullName?.charAt(0)}</Text>
                    </View>
                    <View className="flex-1 flex-shrink">
                        <View className="flex-row items-start justify-between">
                            <Text className="flex-1 mr-2 text-xs font-black uppercase text-slate-800" numberOfLines={1} ellipsizeMode="tail">{item.user.fullName}</Text>
                            <View className="flex-row gap-1">
                                <TouchableOpacity
                                    onPress={() => {
                                        setEditingSchedule(item);
                                        setManualForm({ userId: item.userId, shiftId: item.shiftId, date: new Date(item.date) });
                                        setModalManualVisible(true);
                                    }}
                                    className="p-1.5 bg-indigo-50 rounded-lg"
                                >
                                    <Edit2 size={12} color="#4F46E5" strokeWidth={3} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setItemToDelete({ id: item.id, type: 'SCHEDULE' }); setDeleteModalVisible(true); }} className="p-1.5 bg-rose-50 rounded-lg">
                                    <Trash2 size={12} color="#EF4444" strokeWidth={3} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View className="flex-row items-center mt-1">
                            <CalendarIcon size={10} color="#94A3B8" />
                            <Text className="ml-1 text-[9px] font-black text-slate-500 uppercase">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</Text>
                            <Text className="mx-1.5 text-slate-200">|</Text>
                            <Clock size={10} color="#6366F1" />
                            <Text className="ml-1 text-[9px] font-bold text-indigo-600">{item.shift.startTime}-{item.shift.endTime}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const modalStyle = isDesktop ? { width: 500, alignSelf: 'center' as any, borderRadius: 32 } : { width: windowWidth, borderTopLeftRadius: 40, borderTopRightRadius: 40 };

    return (
        <MainLayout>
            <View className="relative flex-1 bg-slate-50/50">
                <CustomToast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

                {/* --- HEADER COMPACT --- */}
                <View className="bg-white shadow-sm z-10 rounded-b-[30px] border-b border-slate-100">
                    <View className={`px-6 py-5 ${isDesktop ? 'flex-row items-center justify-between' : 'flex-col gap-4'}`}>
                        <View>
                            <Text className="text-xl font-black tracking-tight uppercase text-slate-900">Shift & Jadwal</Text>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operation Management</Text>
                        </View>

                        <View className={`${isDesktop ? 'flex-row' : 'flex-col'} items-center gap-3`}>
                            {userRole === 'OWNER' && (
                                <View style={{ width: isDesktop ? 220 : '100%' }}>
                                    <BranchSelector branches={branches} selectedId={selectedBranchFilter} onSelect={setSelectedBranchFilter} />
                                </View>
                            )}
                            <View className={`flex-row p-1 bg-slate-100 rounded-xl ${isDesktop ? 'w-48' : 'w-full'}`}>
                                <TouchableOpacity onPress={() => setActiveTab('SHIFTS')} className={`flex-1 py-2 items-center rounded-lg ${activeTab === 'SHIFTS' ? 'bg-white shadow-sm' : ''}`}>
                                    <Text className={`font-black text-[9px] uppercase tracking-widest ${activeTab === 'SHIFTS' ? 'text-indigo-600' : 'text-slate-400'}`}>Master</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setActiveTab('SCHEDULES')} className={`flex-1 py-2 items-center rounded-lg ${activeTab === 'SCHEDULES' ? 'bg-white shadow-sm' : ''}`}>
                                    <Text className={`font-black text-[9px] uppercase tracking-widest ${activeTab === 'SCHEDULES' ? 'text-indigo-600' : 'text-slate-400'}`}>Jadwal</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* --- CONTENT AREA --- */}
                <View className="flex-1">
                    {activeTab === 'SCHEDULES' && (
                        <View className={`flex-row justify-end gap-2 pt-4 mb-2 ${isDesktop ? 'max-w-6xl mx-auto w-full px-10' : 'px-6'}`}>
                            <TouchableOpacity onPress={() => { setEditingSchedule(null); setManualForm({ userId: '', shiftId: '', date: new Date() }); setModalManualVisible(true); }} className="flex-row items-center px-4 py-2.5 bg-white border border-indigo-100 rounded-xl active:bg-indigo-50 shadow-sm">
                                <Plus size={14} color="#4F46E5" strokeWidth={4} />
                                <Text className="ml-1.5 text-[10px] font-black text-indigo-600 uppercase">Manual</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setModalAutoVisible(true)} className="flex-row items-center px-4 py-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
                                <LayoutGrid size={14} color="white" strokeWidth={3} />
                                <Text className="ml-1.5 text-[10px] font-black text-white uppercase">Auto</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <FlatList
                        key={numColumns}
                        numColumns={numColumns}
                        data={activeTab === 'SHIFTS' ? shifts : schedules}
                        keyExtractor={item => item.id}
                        renderItem={activeTab === 'SHIFTS' ? renderShiftItem : renderScheduleItem}
                        contentContainerStyle={{ padding: 10, paddingBottom: 100, maxWidth: 1200, alignSelf: 'center', width: '100%' }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View className="items-center mt-20 opacity-20">
                                <CalendarIcon size={60} color="#94A3B8" />
                                <Text className="mt-4 text-xs font-black tracking-widest uppercase">Tidak ada data</Text>
                            </View>
                        }
                    />
                </View>

                {/* FAB MASTER SHIFT */}
                {activeTab === 'SHIFTS' && (
                    <TouchableOpacity
                        onPress={() => { setEditingShift(null); setShiftModalVisible(true); }}
                        className="absolute items-center justify-center bg-indigo-600 shadow-xl bottom-8 right-6 w-14 h-14 rounded-2xl active:scale-95"
                    >
                        <Plus color="white" size={28} strokeWidth={3} />
                    </TouchableOpacity>
                )}

                <ShiftFormModal visible={shiftModalVisible} onClose={() => setShiftModalVisible(false)} onSave={handleShiftSubmit} branches={branches} initialData={editingShift} isOwner={userRole === 'OWNER'} />
                <ConfirmationModal visible={deleteModalVisible} title="Hapus Data?" message="Tindakan ini tidak dapat dibatalkan secara permanen." isDanger onConfirm={confirmDeletion} onCancel={() => setDeleteModalVisible(false)} />

                {/* MODAL MANUAL (EDIT & CREATE) */}
                <Modal visible={modalManualVisible} transparent animationType="fade" onRequestClose={() => setModalManualVisible(false)}>
                    <View className={`flex-1 bg-black/60 ${isDesktop ? 'justify-center' : 'justify-end'}`}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                            <View style={modalStyle} className="overflow-hidden bg-white border shadow-2xl border-slate-100">
                                {/* Header */}
                                <View className="flex-row items-center justify-between px-8 py-6 border-b border-slate-50 bg-slate-50/50">
                                    <View className="flex-row items-center">
                                        <View className="items-center justify-center w-10 h-10 mr-3 bg-indigo-100 border border-indigo-200 rounded-xl">
                                            {editingSchedule ? <Edit2 size={20} color="#4F46E5" /> : <User size={20} color="#4F46E5" />}
                                        </View>
                                        <View>
                                            <Text className="text-xl italic font-black uppercase text-slate-900">{editingSchedule ? 'Edit Jadwal' : 'Input Jadwal'}</Text>
                                            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Operasional Staff Harian</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => setModalManualVisible(false)} className="p-2.5 bg-white border border-slate-100 rounded-full shadow-sm active:bg-slate-50"><X size={20} color="#64748B" /></TouchableOpacity>
                                </View>

                                <ScrollView className="p-8 max-h-[550px]" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                    <View className="flex-row items-center p-3 mb-6 border border-blue-100 bg-blue-50/50 rounded-2xl">
                                        <Info size={14} color="#3B82F6" />
                                        <Text className="ml-2 text-[10px] font-bold text-blue-600 uppercase tracking-tight">{editingSchedule ? 'Perubahan akan langsung memperbarui log absensi.' : 'Tentukan karyawan dan shift untuk tanggal tertentu.'}</Text>
                                    </View>

                                    <Text className="mb-3 ml-1 text-[10px] font-black uppercase tracking-[2px] text-slate-400">Pilih Karyawan *</Text>
                                    <View className="flex-row flex-wrap gap-2 mb-8">
                                        {users.map(u => {
                                            const isSelected = manualForm.userId === u.id;
                                            const isDisabled = !!editingSchedule;
                                            return (
                                                <TouchableOpacity key={u.id} disabled={isDisabled} onPress={() => setManualForm({ ...manualForm, userId: u.id })} className={`px-5 py-3 rounded-2xl border transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'bg-slate-50 border-slate-200'} ${isDisabled && !isSelected ? 'opacity-30' : 'opacity-100'}`}>
                                                    <Text className={`font-black uppercase text-[10px] tracking-widest ${isSelected ? 'text-white' : 'text-slate-500'}`}>{u.fullName}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <Text className="mb-3 ml-1 text-[10px] font-black uppercase tracking-[2px] text-slate-400">Pilih Shift Kerja *</Text>
                                    <View className="flex-row flex-wrap gap-2 mb-8">
                                        {shifts.map(s => {
                                            const isSelected = manualForm.shiftId === s.id;
                                            return (
                                                <TouchableOpacity key={s.id} onPress={() => setManualForm({ ...manualForm, shiftId: s.id })} className={`px-5 py-3 rounded-2xl border transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
                                                    <View className="flex-row items-center">
                                                        <Clock size={12} color={isSelected ? 'white' : '#64748B'} />
                                                        <View className="ml-2">
                                                            <Text className={`font-black uppercase text-[10px] tracking-widest ${isSelected ? 'text-white' : 'text-slate-800'}`}>{s.name}</Text>
                                                            <Text className={`text-[8px] font-bold ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{s.startTime} - {s.endTime}</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <DateInputButton label="Tanggal Kerja *" dateValue={manualForm.date} modeKey="MANUAL" />

                                    <TouchableOpacity onPress={handleManualAssign} activeOpacity={0.8} className="bg-indigo-600 h-16 rounded-[24px] mt-6 flex-row items-center justify-center shadow-xl shadow-indigo-100 active:scale-95 transition-all">
                                        <CheckCircle size={20} color="white" style={{ marginRight: 10 }} strokeWidth={3} />
                                        <Text className="text-sm font-black text-white uppercase tracking-[2px] italic">{editingSchedule ? 'Update Jadwal' : 'Simpan Jadwal'}</Text>
                                    </TouchableOpacity>
                                    <View className="h-10" />
                                </ScrollView>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>

                {/* MODAL AUTO */}
                <Modal visible={modalAutoVisible} transparent animationType="fade">
                    <View className={`flex-1 bg-black/60 ${isDesktop ? 'justify-center' : 'justify-end'}`}>
                        <View style={modalStyle} className="p-6 overflow-hidden bg-white border shadow-2xl md:p-8 border-slate-100">
                            <View className="items-center mb-6">
                                <View className="items-center justify-center w-12 h-12 mb-3 border border-indigo-100 bg-indigo-50 rounded-2xl">
                                    <Users size={24} color="#4F46E5" />
                                </View>
                                <Text className="text-xl font-black uppercase text-slate-900">Auto Generate</Text>
                                <View className="flex-row items-center px-6 mt-2">
                                    <Info size={10} color="#94A3B8" />
                                    <Text className="text-[9px] font-bold text-center text-slate-400 uppercase tracking-widest ml-1">Sistem menggunakan algoritma Round Robin.</Text>
                                </View>
                            </View>
                            <View className="flex-row gap-3 mb-8">
                                <DateInputButton label="DARI" dateValue={autoForm.startDate} modeKey="AUTO_START" containerStyle={{ flex: 1 }} />
                                <DateInputButton label="SAMPAI" dateValue={autoForm.endDate} modeKey="AUTO_END" containerStyle={{ flex: 1 }} />
                            </View>
                            <TouchableOpacity onPress={handleAutoGenerate} className="items-center justify-center bg-indigo-600 shadow-xl h-14 rounded-2xl shadow-indigo-100 active:scale-95"><Text className="text-xs font-black tracking-widest text-white uppercase">Mulai Proses</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setModalAutoVisible(false)} className="items-center py-3 mt-3 active:opacity-50"><Text className="font-black text-slate-400 uppercase text-[9px]">Tutup</Text></TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* PICKER ANDROID/IOS EXTERNAL */}
                {Platform.OS !== 'web' && pickerMode && (
                    <DateTimePicker
                        value={getPickerValue()}
                        mode="date" display="default"
                        onChange={(e, date) => {
                            setPickerMode(null);
                            if (date) {
                                if (pickerMode === 'MANUAL') setManualForm(p => ({ ...p, date }));
                                else if (pickerMode === 'AUTO_START') setAutoForm(p => ({ ...p, startDate: date }));
                                else setAutoForm(p => ({ ...p, endDate: date }));
                            }
                        }}
                    />
                )}
            </View>
        </MainLayout>
    );
}