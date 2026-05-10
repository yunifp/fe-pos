import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Switch, KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { X, Check, Trash2, Box, DollarSign, Archive, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSettingStore } from '../stores/settingStore';
import api from '../api/api';
import InputField from './InputField'; // <--- Import komponen baru

interface Props {
    visible: boolean; onClose: () => void; onSubmit: (data: any) => Promise<void>; initialData?: any; categories: any[]; branches: any[]; userRole: string;
}

export default function ProductFormModal({ visible, onClose, onSubmit, initialData, categories, branches, userRole }: Props) {
    const { settings } = useSettingStore();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [hasVariants, setHasVariants] = useState(false);
    const [openPrice, setOpenPrice] = useState(false);
    const [trackStock, setTrackStock] = useState(true);
    const [singlePrice, setSinglePrice] = useState('');
    const [singleHpp, setSingleHpp] = useState('');
    const [singleStock, setSingleStock] = useState('');
    const [singleMinStock, setSingleMinStock] = useState('');
    const [singleSku, setSingleSku] = useState('');
    const [variants, setVariants] = useState<any[]>([{ stableKey: '1', name: '', price: '', hpp: '', stock: '', minStock: '', sku: '' }]);
    const [targetBranchIds, setTargetBranchIds] = useState<string[]>([]);

    const isLarge = width >= 768;

    useEffect(() => {
        if (visible) {
            setErrors([]);
            if (initialData) {
                setName(initialData.name || '');
                setDescription(initialData.description || '');
                setCategoryId(initialData.categoryId || null);
                setImage(initialData.image ? (api.defaults.baseURL?.replace('/api', '') + initialData.image) : null);
                setHasVariants(!!initialData.hasVariants);
                setOpenPrice(!!initialData.openPrice);
                const firstVar = initialData.variants?.[0];
                setTrackStock(firstVar?.manageStock ?? true);

                if (initialData.hasVariants) {
                    setVariants(initialData.variants.map((v: any) => ({
                        id: v.id, stableKey: v.id.toString(), name: v.name, price: v.price.toString(),
                        hpp: v.hpp.toString(), stock: v.stocks?.[0]?.quantity?.toString() || '0',
                        minStock: v.stocks?.[0]?.minStock?.toString() || '5', sku: v.sku || ''
                    })));
                } else if (firstVar) {
                    setSinglePrice(firstVar.price.toString()); setSingleHpp(firstVar.hpp.toString());
                    setSingleStock(firstVar.stocks?.[0]?.quantity?.toString() || '0');
                    setSingleMinStock(firstVar.stocks?.[0]?.minStock?.toString() || '5');
                    setSingleSku(firstVar.sku || '');
                }
            } else {
                setName(''); setDescription(''); setCategoryId(null); setImage(null); setHasVariants(false);
                setOpenPrice(false); setTrackStock(true);
                setSinglePrice(''); setSingleHpp(''); setSingleStock(''); setSingleMinStock(''); setSingleSku('');
                setVariants([{ stableKey: Math.random().toString(), name: '', price: '', hpp: '', stock: '', minStock: '', sku: '' }]);
                setTargetBranchIds([]);
            }
        }
    }, [visible, initialData]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.6 });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const validate = () => {
        const errs: string[] = [];
        if (!name.trim()) errs.push('name');
        if (!categoryId) errs.push('category');

        if (!hasVariants && !openPrice) {
            if (!singlePrice || Number(singlePrice) <= 0) errs.push('price');
        } else if (hasVariants) {
            variants.forEach((v, i) => { if (!v.name.trim() || (!openPrice && (!v.price || Number(v.price) <= 0))) errs.push(`variant-${i}`); });
        }

        if (userRole === 'OWNER' && !initialData && targetBranchIds.length === 0) errs.push('branch');
        setErrors(errs);
        return errs.length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return Alert.alert("Lengkapi Data", "Mohon isi semua field yang ditandai.");
        setLoading(true);
        try {
            const finalVariants = hasVariants ? variants.map(v => ({
                id: v.id, name: v.name, price: Number(v.price), hpp: Number(v.hpp), sku: v.sku,
                stock: trackStock ? Number(v.stock) : 0, minStock: trackStock ? Number(v.minStock) : 5,
                manageStock: trackStock, isActive: true
            })) : [{
                id: initialData?.variants?.[0]?.id, name: 'Regular', price: Number(singlePrice),
                hpp: Number(singleHpp), sku: singleSku, stock: trackStock ? Number(singleStock) : 0,
                minStock: trackStock ? Number(singleMinStock) : 5, manageStock: trackStock, isActive: true
            }];

            await onSubmit({
                id: initialData?.id, name, description, categoryId, image, hasVariants, openPrice, variants: finalVariants,
                targetBranchIds: userRole === 'OWNER' && !initialData ? targetBranchIds : undefined
            });
            onClose();
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const modalStyle: any = isLarge ? { width: 600, height: '85%', borderRadius: 24, alignSelf: 'center', marginTop: '5%' } : { width: '100%', height: '94%', borderTopLeftRadius: 30, borderTopRightRadius: 30 };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View className="justify-end flex-1 bg-black/50">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modalStyle} className="overflow-hidden bg-white shadow-2xl">
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                        <Text className="text-base italic font-black uppercase text-slate-800">{initialData ? 'Edit' : 'Tambah'} Produk</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full"><X size={18} color="#64748B" /></TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-5 bg-slate-50" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View className="flex-row items-center p-4 mb-6 bg-white border shadow-sm rounded-2xl border-slate-100">
                            <TouchableOpacity onPress={pickImage} className="items-center justify-center w-20 h-20 overflow-hidden border-2 border-dashed bg-slate-50 border-slate-200 rounded-xl">
                                {image ? <Image source={{ uri: image }} className="w-full h-full" /> : <Camera size={24} color="#94A3B8" />}
                            </TouchableOpacity>
                            <View className="flex-1 ml-4 pt-4">
                                <InputField label="NAMA PRODUK" isRequired={errors.includes('name')} placeholder="Ketik nama..." value={name} onChangeText={setName} />
                            </View>
                        </View>

                        <View className="p-4 mb-4 bg-white border rounded-2xl border-slate-100">
                            <Text className={`text-[9px] font-bold uppercase mb-2 ${errors.includes('category') ? 'text-rose-500' : 'text-slate-400'}`}>Pilih Kategori</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {categories.map(cat => (
                                    <TouchableOpacity key={cat.id} onPress={() => setCategoryId(cat.id)} className={`mr-2 px-4 py-2 rounded-lg border ${categoryId === cat.id ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                                        <Text className={`text-[10px] font-bold ${categoryId === cat.id ? 'text-white' : 'text-slate-500'}`}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View className="p-4 mb-6 bg-white border rounded-2xl border-slate-100">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center"><Archive size={14} color="#6366F1" /><Text className="ml-2 text-xs font-black uppercase text-slate-700">Inventaris</Text></View>
                                <View className="flex-row items-center"><Text className="mr-2 text-[10px] font-bold text-slate-400">Lacak Stok</Text><Switch value={trackStock} onValueChange={setTrackStock} /></View>
                            </View>

                            <View className="flex-row items-center justify-between p-2 mb-3 border bg-slate-50 rounded-xl border-slate-100">
                                <View className="flex-row items-center">
                                    <DollarSign size={14} color="#6366F1" />
                                    <Text className="text-[10px] font-black text-slate-500 uppercase ml-2">Open Price (Harga Bebas)?</Text>
                                </View>
                                <Switch value={openPrice} onValueChange={setOpenPrice} />
                            </View>

                            <View className="flex-row items-center justify-between p-2 mb-4 border bg-slate-50 rounded-xl border-slate-100">
                                <View className="flex-row items-center">
                                    <Box size={14} color="#6366F1" />
                                    <Text className="text-[10px] font-black text-slate-500 uppercase ml-2">Gunakan Multi Varian?</Text>
                                </View>
                                <Switch value={hasVariants} onValueChange={setHasVariants} />
                            </View>

                            {!hasVariants ? (
                                <View className="flex-row flex-wrap gap-2">
                                    <View className="w-[48%]"><InputField label="HARGA JUAL" isRequired={errors.includes('price')} value={singlePrice} onChangeText={setSinglePrice} keyboardType="numeric" /></View>
                                    <View className="w-[48%]"><InputField label="HPP (MODAL)" value={singleHpp} onChangeText={setSingleHpp} keyboardType="numeric" /></View>
                                    {trackStock && (
                                        <>
                                            <View className="w-[48%]"><InputField label="STOK AWAL" value={singleStock} onChangeText={setSingleStock} keyboardType="numeric" /></View>
                                            <View className="w-[48%]"><InputField label="STOK MIN." value={singleMinStock} onChangeText={setSingleMinStock} keyboardType="numeric" /></View>
                                        </>
                                    )}
                                </View>
                            ) : (
                                <View>
                                    {variants.map((v, i) => (
                                        <View key={v.stableKey} className="p-3 mb-3 border bg-slate-50 rounded-xl border-slate-100">
                                            <View className="flex-row items-center justify-between mb-2">
                                                <Text className="text-[10px] font-black text-indigo-500 uppercase">Varian #{i + 1}</Text>
                                                {i > 0 && <TouchableOpacity onPress={() => setVariants(variants.filter((_, idx) => idx !== i))}><Trash2 size={14} color="#EF4444" /></TouchableOpacity>}
                                            </View>
                                            <InputField label="NAMA VARIAN" isRequired={errors.includes(`variant-${i}`)} value={v.name} onChangeText={(t: any) => { const nv = [...variants]; nv[i].name = t; setVariants(nv); }} />
                                            <View className="flex-row gap-2 pt-2">
                                                <View className="flex-1"><InputField label="HARGA JUAL" value={v.price} onChangeText={(t: any) => { const nv = [...variants]; nv[i].price = t; setVariants(nv); }} keyboardType="numeric" /></View>
                                                <View className="flex-1"><InputField label="HPP (Modal)" value={v.hpp} onChangeText={(t: any) => { const nv = [...variants]; nv[i].hpp = t; setVariants(nv); }} keyboardType="numeric" /></View>
                                            </View>
                                            {trackStock && (<View className="flex-row gap-2">
                                                <View className="flex-1"><InputField label="STOK AWAL" value={v.stock} onChangeText={(t: any) => { const nv = [...variants]; nv[i].stock = t; setVariants(nv); }} keyboardType="numeric" /></View>
                                                <View className="flex-1"><InputField label="STOK MIN." value={v.minStock} onChangeText={(t: any) => { const nv = [...variants]; nv[i].minStock = t; setVariants(nv); }} keyboardType="numeric" /></View>
                                            </View>)}
                                        </View>
                                    ))}
                                    <TouchableOpacity onPress={() => setVariants([...variants, { stableKey: Math.random().toString(), name: '', price: '', hpp: '', stock: '', minStock: '', sku: '' }])} className="items-center p-3 mt-2 border-2 border-indigo-200 border-dashed rounded-xl"><Text className="text-[10px] font-bold text-indigo-600">+ TAMBAH VARIAN</Text></TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {userRole === 'OWNER' && !initialData && (
                            <View className="p-4 mb-10 bg-white border rounded-2xl border-slate-100">
                                <View className="flex-row items-center justify-between mb-3">
                                    <Text className={`text-[10px] font-black uppercase ${errors.includes('branch') ? 'text-rose-500' : 'text-slate-400'}`}>Distribusi Cabang</Text>
                                    <TouchableOpacity onPress={() => setTargetBranchIds(targetBranchIds.length === branches.length ? [] : branches.map(b => b.id))} className="px-3 py-1 bg-indigo-100 rounded-lg">
                                        <Text className="text-[9px] font-bold text-indigo-600">{targetBranchIds.length === branches.length ? 'BATAL SEMUA' : 'PILIH SEMUA'}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View className="flex-row flex-wrap gap-2">
                                    {branches.map(b => (
                                        <TouchableOpacity key={b.id} onPress={() => setTargetBranchIds(p => p.includes(b.id) ? p.filter(x => x !== b.id) : [...p, b.id])} className={`px-3 py-2 rounded-lg border ${targetBranchIds.includes(b.id) ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-200'}`}>
                                            <Text className={`text-[10px] font-bold ${targetBranchIds.includes(b.id) ? 'text-white' : 'text-slate-500'}`}>{b.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                        <View className="h-10" />
                    </ScrollView>

                    <View className="p-4 bg-white border-t border-gray-100 shadow-inner">
                        <TouchableOpacity onPress={handleSubmit} disabled={loading} className="flex-row items-center justify-center h-12 bg-indigo-600 shadow-lg rounded-xl shadow-indigo-200 active:scale-95">
                            {loading ? <ActivityIndicator color="white" size="small" /> : <><Text className="mr-2 font-black tracking-widest text-white uppercase">Simpan Data</Text><Check size={18} color="white" /></>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}