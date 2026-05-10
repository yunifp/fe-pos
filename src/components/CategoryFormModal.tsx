import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { X, Check, Layers, Tag } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';
import InputField from './InputField'; // <--- Import komponen baru

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    branches: any[];
    userRole: string;
}

export default function CategoryFormModal({ visible, onClose, onSubmit, initialData, branches, userRole }: Props) {
    const { settings } = useSettingStore();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [targetBranchIds, setTargetBranchIds] = useState<string[]>([]);

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name);
            } else {
                setName('');
                setTargetBranchIds([]);
            }
        }
    }, [visible, initialData]);

    const handleSubmit = async () => {
        if (!name) return;
        setLoading(true);

        const payload: any = {
            name,
            targetBranchIds: userRole === 'OWNER' && !initialData ? targetBranchIds : undefined
        };

        if (initialData) payload.id = initialData.id;

        await onSubmit(payload);
        setLoading(false);
        onClose();
    };

    const toggleBranch = (id: string) => {
        if (targetBranchIds.includes(id)) setTargetBranchIds(p => p.filter(b => b !== id));
        else setTargetBranchIds(p => [...p, id]);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View className="flex-1 bg-black/60 justify-end">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
                    <View className="bg-gray-50 h-[70%] rounded-t-[40px] overflow-hidden shadow-2xl">

                        {/* Header */}
                        <View className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white flex-row justify-between items-center z-10">
                            <View>
                                <Text className="text-xl font-extrabold text-slate-800">{initialData ? 'Edit Kategori' : 'Kategori Baru'}</Text>
                                <Text className="text-slate-400 text-xs font-medium">Kelola pengelompokan produk</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-gray-100 rounded-full justify-center items-center">
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>

                            <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-6">
                                <View className="flex-row items-center mb-4">
                                    <View className="bg-orange-50 p-2 rounded-lg mr-3"><Tag size={18} color="#F97316" /></View>
                                    <Text className="font-bold text-slate-800 text-base">Detail Kategori</Text>
                                </View>

                                {/* MENGGUNAKAN INPUT FIELD REUSABLE */}
                                <InputField
                                    label="Nama Kategori"
                                    isRequired={true}
                                    placeholder="Contoh: Minuman, Makanan Berat"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            {!initialData && userRole === 'OWNER' && (
                                <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-4">
                                    <View className="flex-row justify-between items-center mb-4">
                                        <View className="flex-row items-center">
                                            <View className="bg-indigo-50 p-2 rounded-lg mr-3"><Layers size={18} color="#6366F1" /></View>
                                            <Text className="font-bold text-slate-800 text-base">Terapkan ke Cabang</Text>
                                        </View>

                                        <TouchableOpacity onPress={() => setTargetBranchIds(targetBranchIds.length === branches.length ? [] : branches.map(b => b.id))} className="px-3 py-1 bg-indigo-100 rounded-lg">
                                            <Text className="text-[9px] font-bold text-indigo-600">{targetBranchIds.length === branches.length ? 'BATAL SEMUA' : 'PILIH SEMUA'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View className="flex-row flex-wrap gap-2">
                                        {branches.map(b => (
                                            <TouchableOpacity key={b.id} onPress={() => toggleBranch(b.id)}
                                                className={`flex-row items-center px-3 py-2.5 rounded-xl border ${targetBranchIds.includes(b.id) ? 'bg-slate-800 border-slate-800' : 'bg-white border-gray-200'}`}
                                            >
                                                {targetBranchIds.includes(b.id) && <Check size={14} color="white" style={{ marginRight: 6 }} />}
                                                <Text className={`text-xs font-bold ${targetBranchIds.includes(b.id) ? 'text-white' : 'text-slate-600'}`}>{b.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                        </ScrollView>

                        <View className="p-5 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                            <TouchableOpacity
                                onPress={handleSubmit} disabled={loading}
                                className="h-14 rounded-2xl flex-row justify-center items-center shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                                style={{ backgroundColor: settings.themePrimaryColor }}
                            >
                                <Text className="text-white font-bold text-lg mr-2">
                                    {loading ? 'Menyimpan...' : 'Simpan Kategori'}
                                </Text>
                                {!loading && <Check color="white" size={20} strokeWidth={3} />}
                            </TouchableOpacity>
                        </View>

                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}