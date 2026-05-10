import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, useWindowDimensions, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { X, User, Phone, Mail, Check } from 'lucide-react-native';
import BranchSelector from './BranchSelector';
import InputField from './InputField'; // <--- Impor Komponen InputField
import { useSettingStore } from '../stores/settingStore';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    branches: any[];
    userRole: string;
    selectedBranchId: string | null;
}

export default function MemberFormModal({ visible, onClose, onSubmit, initialData, branches, userRole, selectedBranchId }: Props) {
    const { settings } = useSettingStore();
    const primaryColor = settings.themePrimaryColor || '#4F46E5';
    
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isLarge = windowWidth > 768;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ id: '', name: '', phone: '', email: '', branchId: '' });

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setFormData({
                    id: initialData.id,
                    name: initialData.name,
                    phone: initialData.phone,
                    email: initialData.email || '',
                    branchId: initialData.branchId
                });
            } else {
                setFormData({ id: '', name: '', phone: '', email: '', branchId: selectedBranchId || '' });
            }
        }
    }, [visible, initialData, selectedBranchId]);

    const handleSave = async () => {
        if (!formData.name.trim()) return Alert.alert("Validasi", "Nama lengkap wajib diisi.");
        if (!formData.phone || formData.phone.length < 10) return Alert.alert("Validasi", "Nomor HP minimal 10 digit.");
        if (formData.email && !formData.email.includes('@')) return Alert.alert("Validasi", "Format email tidak valid.");

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            // Error ditangani oleh layar utama
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            {/* TouchableWithoutFeedback agar keyboard menutup saat area kosong di klik */}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View className="items-center justify-center flex-1 bg-black/60 p-4">
                    
                    {/* Gunakan behavior undefined jika di Android agar tidak konflik */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        style={{ width: isLarge ? 500 : '100%', maxWidth: 550 }}
                    >
                        {/* Wrapper ini menangkap sentuhan agar tidak memicu Keyboard.dismiss() saat mengetik */}
                        <TouchableWithoutFeedback>
                            <View className="bg-white rounded-[28px] overflow-hidden shadow-2xl border border-slate-100">

                                {/* Header */}
                                <View className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex-row justify-between items-center">
                                    <View>
                                        <Text className="text-lg font-black text-slate-900 uppercase italic">
                                            {formData.id ? 'Edit' : 'Tambah'} Member
                                        </Text>
                                        <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-[1px]">
                                            Data Pelanggan Loyal
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={onClose} className="p-1.5 bg-white border border-slate-100 rounded-full">
                                        <X size={18} color="#64748B" />
                                    </TouchableOpacity>
                                </View>

                                {/* Form Body */}
                                <ScrollView
                                    className="px-6 py-6"
                                    style={{ maxHeight: windowHeight * 0.6 }}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled" // PENTING: Mencegah scrollview mencuri fokus
                                >
                                    <InputField
                                        label="Nama Lengkap"
                                        isRequired={true}
                                        placeholder="Andi Surandi"
                                        value={formData.name}
                                        onChangeText={(text: string) => setFormData({ ...formData, name: text })}
                                        icon={<User size={16} color="#64748B" />}
                                    />

                                    <InputField
                                        label="Nomor HP / WhatsApp"
                                        isRequired={true}
                                        placeholder="08xxxxxxxxxx"
                                        value={formData.phone}
                                        keyboardType="phone-pad"
                                        onChangeText={(text: string) => setFormData({ ...formData, phone: text.replace(/[^0-9]/g, '') })}
                                        icon={<Phone size={16} color="#64748B" />}
                                    />

                                    <InputField
                                        label="Email (Opsional)"
                                        placeholder="member@email.com"
                                        value={formData.email}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        onChangeText={(text: string) => setFormData({ ...formData, email: text })}
                                        icon={<Mail size={16} color="#64748B" />}
                                    />

                                    {userRole === 'OWNER' && (
                                        <View className="mb-2">
                                            <Text className="mb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                Penempatan Cabang
                                            </Text>
                                            <View className="border border-slate-200 bg-white rounded-xl overflow-hidden h-12 justify-center shadow-sm">
                                                <BranchSelector
                                                    branches={branches || []}
                                                    selectedId={formData.branchId}
                                                    onSelect={(id) => setFormData({ ...formData, branchId: id })}
                                                />
                                            </View>
                                        </View>
                                    )}
                                    <View className="h-4" />
                                </ScrollView>

                                {/* Footer Actions */}
                                <View className="p-4 flex-row gap-3 bg-white border-t border-slate-50">
                                    <TouchableOpacity
                                        onPress={onClose}
                                        className="flex-1 h-12 rounded-xl bg-slate-50 items-center justify-center active:bg-slate-100 border border-slate-100"
                                    >
                                        <Text className="font-black text-slate-400 text-[10px] uppercase">Batal</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleSave}
                                        disabled={isSubmitting}
                                        className="flex-[2] h-12 rounded-xl items-center justify-center shadow-lg active:scale-95"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <View className="flex-row items-center">
                                                <Check size={16} color="white" />
                                                <Text className="text-white font-black uppercase text-[10px] tracking-[1px] ml-2">
                                                    Simpan Member
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}