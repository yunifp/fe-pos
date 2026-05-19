import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { X, Check, Box } from 'lucide-react-native';
import InputField from './InputField';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
}

export default function WarehouseFormModal({ visible, onClose, onSubmit, initialData }: Props) {
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');

    const isLarge = width >= 768;

    useEffect(() => {
        if (visible) {
            setErrors([]);
            if (initialData) {
                setName(initialData.name || '');
                setAddress(initialData.address || '');
            } else {
                setName(''); setAddress('');
            }
        }
    }, [visible, initialData]);

    const validate = () => {
        const errs: string[] = [];
        if (!name.trim()) errs.push('name');
        setErrors(errs);
        return errs.length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return Alert.alert("Lengkapi Data", "Nama gudang wajib diisi.");
        setLoading(true);
        try {
            await onSubmit({ id: initialData?.id, name, address });
            onClose();
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    };

    const modalStyle: any = isLarge ? { width: 500, borderRadius: 24, alignSelf: 'center', marginTop: '10%' } : { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, position: 'absolute', bottom: 0 };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View className="justify-end flex-1 bg-black/50">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modalStyle} className="overflow-hidden bg-white shadow-2xl">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                        <Text className="text-base italic font-black uppercase text-slate-800">{initialData ? 'Edit' : 'Tambah'} Gudang</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full"><X size={18} color="#64748B" /></TouchableOpacity>
                    </View>
                    <ScrollView className="p-5 bg-slate-50" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View className="p-4 mb-4 bg-white border rounded-2xl border-slate-100">
                            <InputField label="NAMA GUDANG" isRequired={errors.includes('name')} placeholder="cth: Gudang Pusat Jakarta" value={name} onChangeText={setName} />
                        </View>
                        <View className="p-4 mb-8 bg-white border rounded-2xl border-slate-100">
                            <InputField label="ALAMAT GUDANG (OPSIONAL)" placeholder="cth: Jl. Raya Bogor No 10" value={address} onChangeText={setAddress} />
                        </View>
                    </ScrollView>
                    <View className="p-4 bg-white border-t border-gray-100 shadow-inner">
                        <TouchableOpacity onPress={handleSubmit} disabled={loading} className="flex-row items-center justify-center h-12 bg-indigo-600 shadow-lg rounded-xl shadow-indigo-200 active:scale-95">
                            {loading ? <ActivityIndicator color="white" size="small" /> : <><Text className="mr-2 font-black tracking-widest text-white uppercase">Simpan Gudang</Text><Check size={18} color="white" /></>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}