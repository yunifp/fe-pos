import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, useWindowDimensions, TextInput } from 'react-native';
import { X, Check, PackagePlus, Box, Search } from 'lucide-react-native';
import InputField from './InputField';
import { useMaterialStore } from '../stores/materialStore';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (warehouseId: string, data: { materialId: string, quantity: number }) => Promise<void>;
    warehouses: any[];
    initialWarehouseId?: string | null;
}

export default function RestockFormModal({ visible, onClose, onSubmit, warehouses, initialWarehouseId }: Props) {
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    
    const { materials, fetchMaterials } = useMaterialStore();

    const [warehouseId, setWarehouseId] = useState<string>('');
    const [materialId, setMaterialId] = useState<string>('');
    const [quantity, setQuantity] = useState('');
    
    // --- STATE BARU UNTUK LIVE SEARCH MATERIAL ---
    const [searchMaterialQuery, setSearchMaterialQuery] = useState('');

    const isLarge = width >= 768;

    useEffect(() => {
        if (visible) {
            setErrors([]);
            setMaterialId('');
            setQuantity('');
            setSearchMaterialQuery(''); // Reset pencarian saat modal dibuka
            setWarehouseId(initialWarehouseId || ''); 
            fetchMaterials();
        }
    }, [visible, initialWarehouseId]);

    const validate = () => {
        const errs: string[] = [];
        if (!warehouseId) errs.push('warehouseId');
        if (!materialId) errs.push('materialId');
        if (!quantity || Number(quantity) <= 0) errs.push('quantity');
        setErrors(errs);
        return errs.length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return Alert.alert("Lengkapi Data", "Pilih gudang, material, dan masukkan jumlah yang valid.");
        setLoading(true);
        try {
            await onSubmit(warehouseId, { materialId, quantity: Number(quantity) });
            onClose();
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    };

    // --- LOGIKA FILTERING LIVE SEARCH ---
    const filteredMaterials = materials.filter(mat =>
        (mat.name || '').toLowerCase().includes(searchMaterialQuery.toLowerCase())
    );

    const modalStyle: any = isLarge ? { width: 500, borderRadius: 24, alignSelf: 'center', marginTop: '5%', maxHeight: '90%' } : { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, position: 'absolute', bottom: 0, maxHeight: '95%' };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View className="justify-end flex-1 bg-black/60">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modalStyle} className="overflow-hidden bg-white shadow-2xl">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                        <Text className="text-base italic font-black uppercase text-slate-800">Restock Supplier</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full"><X size={18} color="#64748B" /></TouchableOpacity>
                    </View>
                    <ScrollView className="p-5 bg-slate-50" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        
                        {/* PILIH GUDANG */}
                        <View className="p-4 mb-4 bg-white border rounded-2xl border-slate-100">
                            <Text className={`text-[9px] font-bold uppercase mb-3 ${errors.includes('warehouseId') ? 'text-rose-500' : 'text-slate-400'}`}>
                                Pilih Gudang Tujuan
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                {warehouses.map(wh => (
                                    <TouchableOpacity 
                                        key={wh.id} 
                                        onPress={() => setWarehouseId(wh.id)} 
                                        className={`mr-2 px-4 py-2.5 rounded-xl border ${warehouseId === wh.id ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 border-slate-200'}`}
                                    >
                                        <View className="flex-row items-center">
                                            <Box size={14} color={warehouseId === wh.id ? 'white' : '#64748B'} />
                                            <Text className={`ml-2 text-[10px] font-bold ${warehouseId === wh.id ? 'text-white' : 'text-slate-600'}`}>{wh.name}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* PILIH MATERIAL DENGAN FITUR SEARCH */}
                        <View className="p-4 mb-4 bg-white border rounded-2xl border-slate-100">
                            <Text className={`text-[9px] font-bold uppercase mb-2 ${errors.includes('materialId') ? 'text-rose-500' : 'text-slate-400'}`}>Pilih Bahan Baku</Text>
                            
                            {/* FIELD SEARCH BAR INTERNAL */}
                            <View className="flex-row items-center h-10 px-3 mb-3 border bg-slate-50 rounded-xl border-slate-200">
                                <Search size={14} color="#94A3B8" />
                                <TextInput
                                    placeholder="Cari nama bahan baku..."
                                    placeholderTextColor="#94A3B8"
                                    className="flex-1 h-full py-0 ml-2 text-xs font-bold text-slate-700"
                                    value={searchMaterialQuery}
                                    onChangeText={setSearchMaterialQuery}
                                    style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined}
                                />
                                {searchMaterialQuery !== '' && (
                                    <TouchableOpacity onPress={() => setSearchMaterialQuery('')}>
                                        <X size={14} color="#CBD5E1" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* CONTAINER CHIPS YANG BISA DISCROLL SUPAYA MODAL TIDAK MELEBAR */}
                            <View className="max-h-48 border border-slate-100 bg-slate-50/50 p-2 rounded-xl">
                                <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                    {filteredMaterials.map(mat => (
                                        <TouchableOpacity 
                                            key={mat.id} 
                                            onPress={() => setMaterialId(mat.id)} 
                                            className={`px-3 py-2 rounded-lg border ${materialId === mat.id ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                                        >
                                            <Text className={`text-[10px] font-bold ${materialId === mat.id ? 'text-white' : 'text-slate-600'}`}>{mat.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    {filteredMaterials.length === 0 && (
                                        <Text className="text-[10px] text-slate-400 italic p-2">Bahan baku tidak ditemukan.</Text>
                                    )}
                                </ScrollView>
                            </View>
                        </View>

                        {/* INPUT QTY */}
                        <View className="p-4 mb-8 bg-white border rounded-2xl border-slate-100">
                            <InputField label="JUMLAH (QTY) MASUK" isRequired={errors.includes('quantity')} placeholder="cth: 500" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
                        </View>
                    </ScrollView>
                    <View className="p-4 bg-white border-t border-gray-100 shadow-inner">
                        <TouchableOpacity onPress={handleSubmit} disabled={loading} className="flex-row items-center justify-center h-12 bg-emerald-600 shadow-lg rounded-xl shadow-emerald-200 active:scale-95">
                            {loading ? <ActivityIndicator color="white" size="small" /> : <><Text className="mr-2 font-black tracking-widest text-white uppercase">Tambahkan Stok</Text><PackagePlus size={18} color="white" /></>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}