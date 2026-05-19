import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { X, Check, Tag } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';
import InputField from './InputField';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
}

export default function CategoryFormModal({ visible, onClose, onSubmit, initialData }: Props) {
    const { settings } = useSettingStore();
    const { width, height } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name);
            } else {
                setName('');
            }
        }
    }, [visible, initialData]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setLoading(true);

        const payload: any = { name, isActive: true };
        if (initialData) payload.id = initialData.id;

        await onSubmit(payload);
        setLoading(false);
        onClose();
    };

    const isLarge = width >= 768;
    
    // PENYESUAIAN STRUKTUR MODEL COMPACT MODAL: Mengikuti modal lainnya agar proporsional
    const modalStyle: any = isLarge 
        ? { width: 500, maxHeight: height * 0.6, borderRadius: 24, alignSelf: 'center', marginTop: '10%' } 
        : { width: '100%', maxHeight: height * 0.7, borderTopLeftRadius: 30, borderTopRightRadius: 30, position: 'absolute', bottom: 0 };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View className="flex-1 bg-black/60 justify-end">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modalStyle} className="overflow-hidden bg-slate-50 shadow-2xl">
                    
                    {/* Header */}
                    <View className="px-6 py-4 border-b border-slate-200 bg-white flex-row justify-between items-center z-10 shadow-sm">
                        <View>
                            <Text className="text-base italic font-black uppercase text-slate-800">{initialData ? 'Edit Kategori' : 'Kategori Baru'}</Text>
                            <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Berlaku untuk seluruh cabang</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="w-8 h-8 bg-slate-100 rounded-full justify-center items-center">
                            <X size={16} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
                            <View className="flex-row items-center mb-4">
                                <View className="bg-orange-50 p-2 rounded-lg mr-3 border border-orange-100">
                                    <Tag size={16} color="#F97316" />
                                </View>
                                <Text className="font-black text-slate-800 text-sm uppercase tracking-wider">Detail Kategori</Text>
                            </View>

                            <InputField
                                label="Nama Kategori"
                                isRequired={true}
                                placeholder="Contoh: Minuman Dingin"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </ScrollView>

                    <View className="p-4 bg-white border-t border-slate-100">
                        <TouchableOpacity
                            onPress={handleSubmit} disabled={loading || !name.trim()}
                            className={`h-12 rounded-xl flex-row justify-center items-center shadow-md transition-all ${(!name.trim() || loading) ? 'opacity-50' : 'active:scale-95'}`}
                            style={{ backgroundColor: settings.themePrimaryColor || '#4F46E5' }}
                        >
                            <Text className="text-white font-black text-xs uppercase tracking-widest mr-2">
                                {loading ? 'Menyimpan...' : 'Simpan Kategori'}
                            </Text>
                            {!loading && <Check color="white" size={16} strokeWidth={3} />}
                        </TouchableOpacity>
                    </View>

                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}