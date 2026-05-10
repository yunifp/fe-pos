import React, { useState, useEffect } from 'react';
import {
    View, Text, Modal, TouchableOpacity, ScrollView, TextInput,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
    useWindowDimensions, Keyboard, TouchableWithoutFeedback, ViewStyle
} from 'react-native';
import { X, Check, User, Mail, Lock, Key, Store, Phone } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';
import MyInput from './MyInput'; // Menggunakan komponen input yang sama dengan Branch/Member

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    branches: any[];
    userRole: string;
}

export default function UserFormModal({ visible, onClose, onSubmit, initialData, branches, userRole }: Props) {
    const { settings } = useSettingStore();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const isLarge = windowWidth >= 768;

    // --- STATE FORM (METODE STABIL: SINGLE OBJECT STATE) ---
    const [formData, setFormData] = useState({
        id: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        pin: '',
        role: 'CASHIER',
        jobPosition: 'CASHIER',
        branchId: ''
    });

    const roles = [
        { id: 'MANAGER', label: 'Manager' },
        { id: 'CASHIER', label: 'Kasir' },
        { id: 'KITCHEN', label: 'Dapur' },
        { id: 'WAITER', label: 'Pelayan' },
    ];

    const jobPositions = [
        { id: 'MANAGER', label: 'Manager' },
        { id: 'CASHIER', label: 'Kasir' },
        { id: 'BARISTA', label: 'Barista' },
        { id: 'KITCHEN_STAFF', label: 'Staff Dapur' },
        { id: 'WAITER', label: 'Pelayan' },
    ];

    const displayJobPositions = userRole === 'OWNER'
        ? [{ id: 'OWNER', label: 'OWNER' }, ...jobPositions]
        : jobPositions;

    const displayRoles = userRole === 'OWNER'
        ? [{ id: 'OWNER', label: 'OWNER' }, ...roles]
        : roles;

    // Sync data saat modal terbuka
    useEffect(() => {
        if (visible) {
            if (initialData) {
                setFormData({
                    id: initialData.id || '',
                    fullName: initialData.fullName || '',
                    email: initialData.email || '',
                    phone: initialData.phone || '',
                    role: initialData.role || 'CASHIER',
                    jobPosition: initialData.jobPosition || 'CASHIER',
                    branchId: initialData.branchId || '',
                    password: '', // Keamanan: Reset saat edit
                    pin: ''       // Keamanan: Reset saat edit
                });
            } else {
                setFormData({
                    id: '',
                    fullName: '',
                    email: '',
                    phone: '',
                    password: '',
                    pin: '',
                    role: 'CASHIER',
                    jobPosition: 'CASHIER',
                    branchId: branches.length > 0 ? branches[0].id : ''
                });
            }
        }
    }, [visible, initialData]);

    const handleSave = async () => {
        // --- VALIDASI WAJIB ---
        if (!formData.fullName.trim()) return Alert.alert("Validasi", "Nama lengkap wajib diisi.");
        if (!formData.email.trim()) return Alert.alert("Validasi", "Email wajib diisi.");
        if (!initialData && (!formData.password || formData.pin.length !== 6)) {
            return Alert.alert("Validasi", "Password & PIN 6 digit wajib untuk staff baru.");
        }

        setLoading(true);
        try {
            const payload: any = { ...formData };
            // Hapus field keamanan jika kosong (saat edit)
            if (!payload.password) delete payload.password;
            if (!payload.pin) delete payload.pin;
            // Hanya Owner yang boleh ganti branchId
            if (userRole !== 'OWNER') delete payload.branchId;

            await onSubmit(payload);
            onClose();
        } catch (e) {
            Alert.alert("Error", "Gagal menyimpan data karyawan.");
        } finally {
            setLoading(false);
        }
    };

    const primaryColor = settings.themePrimaryColor || '#4F46E5';

    // --- MODAL LAYOUT (Sesuai Metode Branch yang Lega & Stabil) ---
    const modalLayout = isLarge
        ? { width: 650, maxHeight: windowHeight * 0.85, borderRadius: 32, alignSelf: 'center' as any }
        : { width: '100%', height: windowHeight * 0.94, borderTopLeftRadius: 40, borderTopRightRadius: 40 };

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View className="items-center justify-center flex-1 p-4 bg-black/60 backdrop-blur-sm">
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        className={`flex-1 w-full ${isLarge ? 'justify-center' : 'justify-end'}`}
                    >
                        <View style={modalLayout as ViewStyle} className="overflow-hidden bg-white border shadow-2xl border-slate-100">

                            {/* --- COMPACT HEADER --- */}
                            <View className="flex-row items-center justify-between px-6 py-5 border-b border-slate-50 bg-slate-50/50">
                                <View>
                                    <Text className="text-xl italic font-black uppercase text-slate-900">
                                        {formData.id ? 'Edit' : 'Tambah'} Staff
                                    </Text>
                                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        Akses & Data Personal
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={onClose}
                                    className="p-2 bg-white border rounded-full shadow-sm border-slate-100"
                                >
                                    <X size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                className="p-6"
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                removeClippedSubviews={false} // PENTING: Mencegah bug fokus Android
                            >
                                <View className="gap-y-1">
                                    <MyInput
                                        label="Nama Lengkap *"
                                        placeholder="Contoh: Budi Santoso"
                                        value={formData.fullName}
                                        onChangeText={(text: string) => setFormData({ ...formData, fullName: text })}
                                        icon={<User size={18} color="#94A3B8" />}
                                        primaryColor={primaryColor}
                                    />

                                    <MyInput
                                        label="Email Login *"
                                        placeholder="budi@toko.com"
                                        value={formData.email}
                                        keyboardType="email-address"
                                        onChangeText={(text: string) => setFormData({ ...formData, email: text })}
                                        icon={<Mail size={18} color="#94A3B8" />}
                                        primaryColor={primaryColor}
                                    />

                                    <MyInput
                                        label="Nomor Hp *"
                                        placeholder="08123456789"
                                        value={formData.phone}
                                        keyboardType="phone-pad"
                                        onChangeText={(text: string) => setFormData({ ...formData, phone: text })}
                                        icon={<Phone size={18} color="#94A3B8" />}
                                        primaryColor={primaryColor}
                                    />

                                    <View className="p-4 my-2 border bg-slate-50 rounded-2xl border-slate-100">
                                        <Text className="mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Keamanan {formData.id && '(Isi jika ingin ganti)'}
                                        </Text>
                                        <View className={`${isLarge ? 'flex-row gap-4' : 'flex-col'}`}>
                                            <View className="flex-1">
                                                <MyInput
                                                    label="Password"
                                                    placeholder="******"
                                                    secureTextEntry
                                                    value={formData.password}
                                                    onChangeText={(text: string) => setFormData({ ...formData, password: text })}
                                                    icon={<Lock size={16} color="#94A3B8" />}
                                                    primaryColor={primaryColor}
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <MyInput
                                                    label="PIN (6 Digit)"
                                                    placeholder="123456"
                                                    keyboardType="numeric"
                                                    secureTextEntry
                                                    value={formData.pin}
                                                    onChangeText={(text: string) => setFormData({ ...formData, pin: text })}
                                                    icon={<Key size={16} color="#94A3B8" />}
                                                    primaryColor={primaryColor}
                                                />
                                            </View>
                                        </View>
                                    </View>

                                    <View className="mb-6">
                                        <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 ml-1">Posisi Pekerjaan*</Text>
                                        <View className="flex-row flex-wrap gap-3">
                                            {displayJobPositions.map(r => (
                                                <TouchableOpacity key={r.id} onPress={() => setFormData({ ...formData, jobPosition: r.id })}
                                                    className={`px-6 py-3 rounded-2xl border ${formData.jobPosition === r.id ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white border-slate-200'}`}>
                                                    <Text className={`text-xs font-black uppercase ${formData.jobPosition === r.id ? 'text-white' : 'text-slate-500'}`}>{r.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View className="mb-6">
                                        <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 ml-1">Role Akses Sistem *</Text>
                                        <View className="flex-row flex-wrap gap-3">
                                            {displayRoles.map(r => (
                                                <TouchableOpacity key={r.id} onPress={() => setFormData({ ...formData, role: r.id })}
                                                    className={`px-6 py-3 rounded-2xl border ${formData.role === r.id ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white border-slate-200'}`}>
                                                    <Text className={`text-xs font-black uppercase ${formData.role === r.id ? 'text-white' : 'text-slate-500'}`}>{r.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>



                                    {!formData.id && userRole === 'OWNER' && (
                                        <View className="mb-10">
                                            <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 ml-1">Penempatan Cabang *</Text>
                                            <View className="flex-row flex-wrap gap-3">
                                                {branches.map(b => (
                                                    <TouchableOpacity key={b.id} onPress={() => setFormData({ ...formData, branchId: b.id })}
                                                        className={`flex-row items-center px-6 py-3 rounded-2xl border ${formData.branchId === b.id ? 'bg-slate-800 border-slate-800 shadow-md' : 'bg-white border-slate-200'}`}>
                                                        <Store size={14} color={formData.branchId === b.id ? 'white' : '#94A3B8'} />
                                                        <Text className={`text-xs font-black uppercase ml-2 ${formData.branchId === b.id ? 'text-white' : 'text-slate-500'}`}>{b.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    )}
                                </View>
                                <View className="h-10" />
                            </ScrollView>

                            {/* --- FOOTER ACTIONS --- */}
                            <View className="flex-row gap-3 p-5 bg-white border-t border-slate-50">
                                <TouchableOpacity
                                    onPress={onClose}
                                    className="items-center justify-center flex-1 h-12 rounded-xl bg-slate-100 active:bg-slate-200"
                                >
                                    <Text className="font-black text-slate-400 text-[10px] uppercase">Batal</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={loading}
                                    className="flex-[2] h-12 rounded-xl items-center justify-center shadow-lg active:scale-95"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <View className="flex-row items-center">
                                            <Check size={18} color="white" />
                                            <Text className="text-white font-black uppercase text-[10px] tracking-[1px] ml-2">
                                                Simpan Karyawan
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </View>
        </Modal>
    );
}