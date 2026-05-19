import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { X, Check, Truck, Plus, Trash2 } from 'lucide-react-native';
import InputField from './InputField';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    warehouses: any[];
    branches: any[];
    materials: any[];
}

export default function DistributionFormModal({ visible, onClose, onSubmit, warehouses, branches, materials }: Props) {
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(false);

    const [sourceWarehouseId, setSourceWarehouseId] = useState('');
    const [destBranchId, setDestBranchId] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ materialId: '', quantity: '' }]);

    const isLarge = width >= 768;

    useEffect(() => {
        if (visible) {
            setSourceWarehouseId('');
            setDestBranchId('');
            setNotes('');
            setItems([{ materialId: '', quantity: '' }]);
        }
    }, [visible]);

    const addItem = () => setItems([...items, { materialId: '', quantity: '' }]);
    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const updateItem = (index: number, field: string, value: string) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!sourceWarehouseId || !destBranchId) {
            return Alert.alert("Error", "Pilih Gudang Asal dan Cabang Tujuan.");
        }
        
        const validItems = items.filter(i => i.materialId && i.quantity && Number(i.quantity) > 0).map(i => ({
            materialId: i.materialId,
            quantity: Number(i.quantity)
        }));

        if (validItems.length === 0) {
            return Alert.alert("Error", "Minimal kirim 1 material dengan quantity valid.");
        }

        setLoading(true);
        try {
            await onSubmit({ sourceWarehouseId, destBranchId, notes, items: validItems });
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const modalStyle: any = isLarge ? { width: 600, height: '85%', borderRadius: 24, alignSelf: 'center', marginTop: '5%' } : { width: '100%', height: '94%', borderTopLeftRadius: 30, borderTopRightRadius: 30 };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View className="justify-end flex-1 bg-black/60">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modalStyle} className="overflow-hidden bg-white shadow-2xl">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                        <Text className="text-base italic font-black uppercase text-slate-800">Kirim Distribusi</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full"><X size={18} color="#64748B" /></TouchableOpacity>
                    </View>
                    <ScrollView className="p-5 bg-slate-50" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        
                        <View className="flex-row items-center justify-between gap-2 mb-4">
                            <View className="flex-1 p-3 bg-white border rounded-2xl border-slate-200">
                                <Text className="text-[10px] font-bold text-slate-400 uppercase mb-2">Dari Gudang</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {warehouses.map(wh => (
                                        <TouchableOpacity key={wh.id} onPress={() => setSourceWarehouseId(wh.id)} className={`mr-2 px-3 py-2 rounded-lg border ${sourceWarehouseId === wh.id ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 border-slate-200'}`}>
                                            <Text className={`text-[10px] font-bold ${sourceWarehouseId === wh.id ? 'text-white' : 'text-slate-600'}`}>{wh.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                            <View className="items-center justify-center p-2"><Truck size={20} color="#64748B" /></View>
                            <View className="flex-1 p-3 bg-white border rounded-2xl border-slate-200">
                                <Text className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ke Cabang</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {branches.map(br => (
                                        <TouchableOpacity key={br.id} onPress={() => setDestBranchId(br.id)} className={`mr-2 px-3 py-2 rounded-lg border ${destBranchId === br.id ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 border-slate-200'}`}>
                                            <Text className={`text-[10px] font-bold ${destBranchId === br.id ? 'text-white' : 'text-slate-600'}`}>{br.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <View className="p-4 mb-4 bg-white border rounded-2xl border-slate-100">
                            <InputField label="CATATAN SURAT JALAN (OPSIONAL)" placeholder="cth: Pengiriman rutin mingguan" value={notes} onChangeText={setNotes} />
                        </View>

                        <View className="p-4 mb-6 bg-white border rounded-2xl border-slate-100">
                            <Text className="text-[10px] font-bold text-slate-400 uppercase mb-3">Item yang Dikirim</Text>
                            {items.map((item, index) => (
                                <View key={index} className="flex-row items-center p-3 mb-2 border border-dashed bg-slate-50 rounded-xl border-slate-300">
                                    <View className="flex-1 mr-2">
                                        <Text className="text-[9px] font-bold mb-1 text-slate-500">MATERIAL</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                            {materials.map(mat => (
                                                <TouchableOpacity key={mat.id} onPress={() => updateItem(index, 'materialId', mat.id)} className={`mr-2 px-2 py-1 rounded border ${item.materialId === mat.id ? 'bg-indigo-500 border-indigo-600' : 'bg-white border-slate-200'}`}>
                                                    <Text className={`text-[9px] font-bold ${item.materialId === mat.id ? 'text-white' : 'text-slate-600'}`}>{mat.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                    <View className="w-20">
                                        <InputField label="QTY" value={item.quantity} onChangeText={(val: string) => updateItem(index, 'quantity', val)} keyboardType="numeric" />
                                    </View>
                                    {items.length > 1 && (
                                        <TouchableOpacity onPress={() => removeItem(index)} className="p-2 ml-1 mt-3">
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            <TouchableOpacity onPress={addItem} className="flex-row items-center justify-center p-3 mt-2 bg-indigo-50 rounded-xl">
                                <Plus size={16} color="#4F46E5" />
                                <Text className="ml-1 text-[10px] font-bold text-indigo-600 uppercase">Tambah Material</Text>
                            </TouchableOpacity>
                        </View>
                        <View className="h-10" />
                    </ScrollView>

                    <View className="p-4 bg-white border-t border-gray-100 shadow-inner">
                        <TouchableOpacity onPress={handleSubmit} disabled={loading} className="flex-row items-center justify-center h-12 bg-indigo-600 shadow-lg rounded-xl shadow-indigo-200 active:scale-95">
                            {loading ? <ActivityIndicator color="white" size="small" /> : <><Text className="mr-2 font-black tracking-widest text-white uppercase">Proses Pengiriman</Text><Check size={18} color="white" /></>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}