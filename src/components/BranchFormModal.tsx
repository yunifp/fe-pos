import React, { useState, useEffect, createElement } from 'react';
import {
    View, Text, Modal, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
    useWindowDimensions, Keyboard, TouchableWithoutFeedback, ViewStyle, Switch
} from 'react-native';
import { X, Check, MapPin, Phone, Store, Settings2 } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';
import MyInput from './MyInput';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
}

export default function BranchFormModal({ visible, onClose, onSubmit, initialData }: Props) {
    const { settings } = useSettingStore();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const isLarge = windowWidth >= 768;

    // Menyelaraskan dengan Schema Backend: name, address, phone, enableOrderQueue
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        address: '',
        phone: '',
        enableOrderQueue: true
    });

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setFormData({
                    id: initialData.id || '',
                    name: initialData.name || '',
                    address: initialData.address || '',
                    phone: initialData.phone || '',
                    enableOrderQueue: initialData.enableOrderQueue !== false // Default true
                });
            } else {
                setFormData({ id: '', name: '', address: '', phone: '', enableOrderQueue: true });
            }
        }
    }, [visible, initialData]);

    const handleSave = async () => {
        if (!formData.name.trim()) return Alert.alert("Validasi", "Nama cabang wajib diisi.");
        
        setLoading(true);
        try {
            // Payload yang dikirim sekarang 100% patuh pada Zod Backend
            const payload = {
                id: formData.id ? formData.id : undefined,
                name: formData.name.trim(),
                phone: formData.phone.trim() || undefined,
                address: formData.address.trim() || undefined,
                enableOrderQueue: formData.enableOrderQueue
            };
            
            await onSubmit(payload);
            onClose();
        } catch (e) {
            console.error("Form Submit Error", e);
        } finally {
            setLoading(false);
        }
    };

    const primaryColor = settings.themePrimaryColor || '#4F46E5';

    // --- STYLE UNTUK CREATE ELEMENT (WEB) ---
    const webInputStyle = {
        width: '100%',
        height: 50,
        padding: '0 16px',
        borderRadius: 16,
        border: '1px solid #E2E8F0',
        backgroundColor: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        outline: 'none',
        boxSizing: 'border-box' as const,
        fontFamily: 'inherit'
    };

    const modalLayout = isLarge
        ? { width: 550, maxHeight: windowHeight * 0.85, borderRadius: 32, alignSelf: 'center' as any }
        : { width: '100%', height: windowHeight * 0.90, borderTopLeftRadius: 40, borderTopRightRadius: 40 };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View className="items-center justify-end flex-1 p-4 bg-black/60 backdrop-blur-sm">
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        className={`flex-1 w-full ${isLarge ? 'justify-center' : 'justify-end'}`}
                    >
                        <View style={modalLayout as ViewStyle} className="overflow-hidden bg-white shadow-2xl">

                            <View className="flex-row items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
                                <View>
                                    <Text className="text-xl font-black uppercase text-slate-900">
                                        {formData.id ? 'Edit Cabang' : 'Cabang Baru'}
                                    </Text>
                                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        Pengaturan Lokasi Outlet
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={onClose} className="p-2 bg-slate-100 rounded-full">
                                    <X size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView className="p-6 bg-slate-50" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                
                                <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-4 gap-4">
                                    <View>
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Cabang *</Text>
                                        {Platform.OS === 'web' ? (
                                            createElement('input', {
                                                placeholder: "Contoh: Cabang Jakarta Pusat",
                                                value: formData.name,
                                                onChange: (e: any) => setFormData({ ...formData, name: e.target.value }),
                                                style: webInputStyle
                                            })
                                        ) : (
                                            <MyInput label="" placeholder="Contoh: Cabang Jakarta Pusat" value={formData.name} onChangeText={(text: string) => setFormData({ ...formData, name: text })} icon={<Store size={18} color="#94A3B8" />} primaryColor={primaryColor} />
                                        )}
                                    </View>

                                    <View>
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Telepon</Text>
                                        {Platform.OS === 'web' ? (
                                            createElement('input', {
                                                type: 'tel',
                                                placeholder: "0812xxxxxxxx",
                                                value: formData.phone,
                                                onChange: (e: any) => setFormData({ ...formData, phone: e.target.value }),
                                                style: webInputStyle
                                            })
                                        ) : (
                                            <MyInput label="" placeholder="0812xxxxxxxx" value={formData.phone} keyboardType="phone-pad" onChangeText={(text: string) => setFormData({ ...formData, phone: text })} icon={<Phone size={18} color="#94A3B8" />} primaryColor={primaryColor} />
                                        )}
                                    </View>

                                    <View>
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Alamat Lengkap</Text>
                                        {Platform.OS === 'web' ? (
                                            createElement('textarea', {
                                                placeholder: "Masukkan alamat fisik cabang...",
                                                value: formData.address,
                                                rows: 3,
                                                onChange: (e: any) => setFormData({ ...formData, address: e.target.value }),
                                                style: { ...webInputStyle, height: 'auto', padding: '12px 16px' }
                                            })
                                        ) : (
                                            <MyInput label="" placeholder="Masukkan alamat fisik cabang..." value={formData.address} multiline numberOfLines={3} onChangeText={(text: string) => setFormData({ ...formData, address: text })} icon={<MapPin size={18} color="#94A3B8" />} primaryColor={primaryColor} />
                                        )}
                                    </View>
                                </View>

                                {/* SETTING ANTRIAN (Sesuai Backend schema) */}
                                <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center">
                                            <Settings2 size={16} color="#4F46E5" />
                                            <View className="ml-3">
                                                <Text className="text-xs font-black text-slate-700 uppercase">Antrian Pesanan</Text>
                                                <Text className="text-[9px] font-medium text-slate-400 mt-0.5">Aktifkan sistem Queue KDS & Struk</Text>
                                            </View>
                                        </View>
                                        <Switch 
                                            value={formData.enableOrderQueue} 
                                            onValueChange={(val) => setFormData({...formData, enableOrderQueue: val})} 
                                            trackColor={{true: primaryColor, false: '#CBD5E1'}}
                                        />
                                    </View>
                                </View>
                                
                                <View className="h-6" />
                            </ScrollView>

                            <View className="flex-row p-5 bg-white border-t border-slate-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                                <TouchableOpacity onPress={handleSave} disabled={loading} className="flex-1 h-14 rounded-2xl items-center justify-center shadow-lg active:scale-95 transition-all" style={{ backgroundColor: primaryColor }}>
                                    {loading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <View className="flex-row items-center">
                                            <Text className="text-white font-black uppercase text-sm mr-2">Simpan Cabang</Text>
                                            <Check size={18} color="white" strokeWidth={3} />
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