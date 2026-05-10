import React, { useEffect, useState, createElement } from 'react';
import {
    Modal, View, Text, TouchableOpacity, ScrollView,
    Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
    useWindowDimensions, Keyboard, TouchableWithoutFeedback, ViewStyle
} from 'react-native';
import { X, Check, Clock, Building2, Layout } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSettingStore } from '../stores/settingStore';
import MyInput from './MyInput';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    branches: any[];
    initialData?: any;
    isOwner: boolean;
}

export default function ShiftFormModal({ visible, onClose, onSave, branches, initialData, isOwner }: Props) {
    const { settings } = useSettingStore();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isLarge = windowWidth >= 768;
    const isEdit = !!initialData;
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        startTime: '08:00',
        endTime: '16:00',
        targetBranchIds: [] as string[]
    });

    const [mobilePicker, setMobilePicker] = useState<{ visible: boolean, field: 'startTime' | 'endTime' }>({ visible: false, field: 'startTime' });

    const timeStringToDate = (timeStr: string) => {
        const d = new Date();
        const [hours, minutes] = timeStr.split(':');
        d.setHours(parseInt(hours || '0', 10), parseInt(minutes || '0', 10), 0, 0);
        return d;
    };

    const dateToTimeString = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    useEffect(() => {
        if (visible) {
            setFormData({
                name: initialData?.name || '',
                startTime: initialData?.startTime || '08:00',
                endTime: initialData?.endTime || '16:00',
                targetBranchIds: []
            });
        }
    }, [visible, initialData]);

    const handleSave = async () => {
        if (!formData.name.trim()) return Alert.alert("Validasi", "Nama shift wajib diisi.");
        if (isOwner && !isEdit && formData.targetBranchIds.length === 0) {
            return Alert.alert("Validasi", "Pilih minimal satu cabang distribusi.");
        }
        setLoading(true);
        try {
            await onSave({ ...formData, type: 'MORNING' });
            onClose();
        } catch (error) {
            Alert.alert("Error", "Gagal menyimpan data shift.");
        } finally { setLoading(false); }
    };

    const toggleBranch = (id: string) => {
        setFormData(prev => ({
            ...prev,
            targetBranchIds: prev.targetBranchIds.includes(id)
                ? prev.targetBranchIds.filter(b => b !== id)
                : [...prev.targetBranchIds, id]
        }));
    };

    const renderTimeInput = (label: string, field: 'startTime' | 'endTime', color: string) => {
        return (
            <View className="flex-1">
                <Text className="mb-2 ml-1 text-[10px] font-black uppercase tracking-[1.5px] text-slate-400">{label}</Text>
                {Platform.OS === 'web' ? (
                    createElement('input', {
                        type: 'time',
                        value: formData[field],
                        onChange: (e: any) => setFormData(prev => ({ ...prev, [field]: e.target.value })),
                        style: {
                            width: '100%', height: 56, padding: '0 16px', borderRadius: 16, border: '1px solid #E2E8F0',
                            backgroundColor: '#F8FAFC', fontSize: 16, fontWeight: '800', color: '#1E293B', outline: 'none', textAlign: 'center'
                        }
                    })
                ) : (
                    <TouchableOpacity
                        onPress={() => setMobilePicker({ visible: true, field })}
                        className="flex-row items-center justify-center border h-14 border-slate-200 bg-slate-50 rounded-2xl"
                    >
                        <Clock size={18} color={color} />
                        <Text className="ml-2 text-base font-black text-slate-800">{formData[field]}</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const primaryColor = settings.themePrimaryColor || '#4F46E5';
    const modalLayout = isLarge
        ? { width: 650, maxHeight: windowHeight * 0.85, borderRadius: 32, alignSelf: 'center' as any }
        : { width: '100%', height: windowHeight * 0.94, borderTopLeftRadius: 40, borderTopRightRadius: 40 };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <View className="items-center justify-center flex-1 p-4 bg-black/60">
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className={`flex-1 w-full ${isLarge ? 'justify-center' : 'justify-end'}`}>
                        <View style={modalLayout as ViewStyle} className="overflow-hidden bg-white border shadow-2xl border-slate-100">
                            <View className="flex-row items-center justify-between px-8 py-6 border-b border-slate-50 bg-slate-50/50">
                                <View>
                                    <Text className="text-xl italic font-black uppercase text-slate-900">{isEdit ? 'Edit' : 'Tambah'} Shift</Text>
                                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manajemen Waktu Kerja</Text>
                                </View>
                                <TouchableOpacity onPress={onClose} className="p-2.5 bg-white border border-slate-100 rounded-full shadow-sm active:bg-slate-50"><X size={20} color="#64748B" /></TouchableOpacity>
                            </View>
                            <ScrollView className="p-8" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Nama Shift *
                                </Text>
                                {Platform.OS === 'web' ? (
                                    createElement('input', {
                                        type: 'text',
                                        placeholder: 'Contoh: Shift Pagi',
                                        value: formData.name,
                                        // Menggunakan callback prev state agar lebih aman
                                        onChange: (e: any) => setFormData(prev => ({ ...prev, name: e.target.value })),
                                        style: {
                                            width: '100%',
                                            height: 56,
                                            padding: '0 16px',
                                            borderRadius: 16,
                                            border: '1px solid #E2E8F0',
                                            backgroundColor: '#F8FAFC',
                                            fontSize: 14,
                                            fontWeight: '700',
                                            color: '#1E293B',
                                            outlineColor: primaryColor, // Fokus akan berwarna sesuai tema
                                            boxSizing: 'border-box',
                                        }
                                    })
                                ) : (
                                    <MyInput
                                        label="" // Kosongkan karena label sudah di atas
                                        placeholder="Contoh: Shift Pagi"
                                        value={formData.name}
                                        onChangeText={(text: string) => setFormData({ ...formData, name: text })}
                                        icon={<Layout size={18} color="#94A3B8" />}
                                        primaryColor={primaryColor}
                                    />
                                )}
                                <View className="flex-row gap-4 my-3">
                                    {renderTimeInput("Jam Masuk", "startTime", "#10B981")}
                                    {renderTimeInput("Jam Pulang", "endTime", "#F43F5E")}
                                </View>
                                {isOwner && !isEdit && (
                                    <View className="p-5 my-2 border bg-slate-50/50 rounded-[24px] border-slate-100">
                                        <Text className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Distribusikan Ke Cabang *</Text>
                                        <View className="flex-row flex-wrap gap-3">
                                            {branches.map(branch => (
                                                <TouchableOpacity key={branch.id} onPress={() => toggleBranch(branch.id)} className={`px-6 py-3 rounded-2xl border ${formData.targetBranchIds.includes(branch.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                                                    <Text className={`text-xs font-black uppercase ${formData.targetBranchIds.includes(branch.id) ? 'text-white' : 'text-slate-500'}`}>{branch.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                            <View className="p-6 bg-white border-t border-slate-50">
                                <TouchableOpacity onPress={handleSave} disabled={loading} className="flex-row items-center justify-center bg-indigo-600 h-16 rounded-[24px]" style={{ backgroundColor: primaryColor }}>
                                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black uppercase text-sm tracking-[2px] italic">Simpan Data Shift</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </View>
            {Platform.OS !== 'web' && mobilePicker.visible && (
                <DateTimePicker value={timeStringToDate(formData[mobilePicker.field])} mode="time" is24Hour={true} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => { setMobilePicker(p => ({ ...p, visible: false })); if (date) setFormData(prev => ({ ...prev, [mobilePicker.field]: dateToTimeString(date) })); }} />
            )}
        </Modal>
    );
}