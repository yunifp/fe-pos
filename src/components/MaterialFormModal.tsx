import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { X, Check, Package } from 'lucide-react-native';
import InputField from './InputField';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
}

export default function MaterialFormModal({ visible, onClose, onSubmit, initialData }: Props) {
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [costPerUnit, setCostPerUnit] = useState('');

    const isLarge = width >= 768;

    useEffect(() => {
        if (visible) {
            setErrors([]);
            if (initialData) {
                setName(initialData.name || '');
                setUnit(initialData.unit || '');
                setCostPerUnit(initialData.costPerUnit?.toString() || '');
            } else {
                setName(''); setUnit(''); setCostPerUnit('');
            }
        }
    }, [visible, initialData]);

    const validate = () => {
        const errs: string[] = [];
        if (!name.trim()) errs.push('name');
        if (!unit.trim()) errs.push('unit');
        if (!costPerUnit || Number(costPerUnit) < 0) errs.push('costPerUnit');
        setErrors(errs);
        return errs.length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return Alert.alert("Lengkapi Data", "Mohon isi semua field yang wajib.");
        setLoading(true);
        try {
            await onSubmit({ id: initialData?.id, name, unit, costPerUnit: Number(costPerUnit) });
            onClose();
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    };

    const modalStyle: any = isLarge 
        ? { width: 500, height: 'auto', maxHeight: '85%', borderRadius: 24, alignSelf: 'center', marginTop: '10%' } 
        : { width: '100%', height: 'auto', maxHeight: '90%', borderTopLeftRadius: 30, borderTopRightRadius: 30, position: 'absolute', bottom: 0 };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View className="justify-end flex-1 bg-black/50">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modalStyle} className="overflow-hidden bg-white shadow-2xl">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                        <Text className="text-base italic font-black uppercase text-slate-800">{initialData ? 'Edit' : 'Tambah'} Material</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full"><X size={18} color="#64748B" /></TouchableOpacity>
                    </View>
                    <ScrollView className="p-5 bg-slate-50" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View className="flex-row items-center p-4 mb-6 bg-white border shadow-sm rounded-2xl border-slate-100">
                            <View className="items-center justify-center w-16 h-16 overflow-hidden border border-dashed bg-slate-50 border-slate-200 rounded-xl">
                                <Package size={24} color="#94A3B8" />
                            </View>
                            <View className="flex-1 ml-4 pt-2">
                                <InputField label="NAMA MATERIAL (BAHAN BAKU)" isRequired={errors.includes('name')} placeholder="cth: Biji Kopi Arabica" value={name} onChangeText={setName} />
                            </View>
                        </View>
                        <View className="p-4 mb-8 bg-white border rounded-2xl border-slate-100">
                            <View className="mb-4"><InputField label="SATUAN (UNIT)" isRequired={errors.includes('unit')} placeholder="cth: Gram, Liter, Pcs" value={unit} onChangeText={setUnit} /></View>
                            <View><InputField label="HARGA MODAL PER SATUAN" isRequired={errors.includes('costPerUnit')} placeholder="cth: 200" value={costPerUnit} onChangeText={setCostPerUnit} keyboardType="numeric" /></View>
                        </View>
                    </ScrollView>
                    <View className="p-4 bg-white border-t border-gray-100 shadow-inner">
                        <TouchableOpacity onPress={handleSubmit} disabled={loading} className="flex-row items-center justify-center h-12 bg-indigo-600 shadow-lg rounded-xl shadow-indigo-200 active:scale-95">
                            {loading ? <ActivityIndicator color="white" size="small" /> : <><Text className="mr-2 font-black tracking-widest text-white uppercase">Simpan Material</Text><Check size={18} color="white" /></>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}