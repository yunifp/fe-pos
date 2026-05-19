import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Switch, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { X, Check, Box, Plus, Trash2, Settings2, Archive } from 'lucide-react-native';
import InputField from './InputField';
import { useMaterialStore } from '../stores/materialStore';

interface Props {
    visible: boolean; onClose: () => void; onSubmit: (data: any) => Promise<void>; initialData?: any; categories: any[]; branches: any[]; userRole: string;
}

export default function ProductFormModal({ visible, onClose, onSubmit, initialData, categories }: Props) {
    // --- PERBAIKAN: Menambahkan 'height' ---
    const { width, height } = useWindowDimensions(); 
    
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const { materials, fetchMaterials } = useMaterialStore(); 

    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [hasVariants, setHasVariants] = useState(false);
    
    const [isOpenPrice, setIsOpenPrice] = useState(false);
    const [trackStock, setTrackStock] = useState(false); 
    const [useRecipe, setUseRecipe] = useState(false);   
    
    const [singlePrice, setSinglePrice] = useState('');
    const [singleStock, setSingleStock] = useState('');
    const [singleRecipes, setSingleRecipes] = useState<any[]>([]);
    const [variants, setVariants] = useState<any[]>([{ stableKey: '1', name: '', price: '', stock: '', recipes: [] }]);

    const isLarge = width >= 768;

    useEffect(() => {
        if (visible) {
            setErrors([]);
            fetchMaterials(); 
            if (initialData) {
                setName(initialData.name || '');
                setCategoryId(initialData.categoryId || null);
                
                const isMulti = initialData.hasVariant === true;
                setHasVariants(isMulti);

                if (isMulti) {
                    setVariants(initialData.variants.map((v: any, idx: number) => ({
                        stableKey: idx.toString(),
                        name: v.name,
                        price: v.price.toString(),
                        stock: v.stock?.toString() || '0',
                        recipes: v.recipes ? v.recipes.map((r: any) => ({ materialId: String(r.materialId), quantityRequired: r.quantityRequired.toString() })) : []
                    })));
                    
                    setIsOpenPrice(Number(initialData.variants?.[0]?.price) === 0);
                    setTrackStock(initialData.variants?.[0]?.trackStock || false);
                    setUseRecipe(initialData.variants?.some((v: any) => v.recipes && v.recipes.length > 0));
                } else {
                    setSinglePrice(initialData.price?.toString() || '0');
                    setSingleStock(initialData.stock?.toString() || '0');
                    setSingleRecipes(initialData.recipes ? initialData.recipes.map((r: any) => ({ materialId: String(r.materialId), quantityRequired: r.quantityRequired.toString() })) : []);
                    
                    setIsOpenPrice(Number(initialData.price) === 0);
                    setTrackStock(initialData.trackStock || false);
                    setUseRecipe(initialData.recipes && initialData.recipes.length > 0);
                }
            } else {
                setName(''); setCategoryId(null); setHasVariants(false);
                setIsOpenPrice(false); setTrackStock(false); setUseRecipe(false);
                setSinglePrice(''); setSingleStock(''); setSingleRecipes([]);
                setVariants([{ stableKey: Math.random().toString(), name: '', price: '', stock: '', recipes: [] }]);
            }
        }
    }, [visible, initialData]);

    const validate = () => {
        const errs: string[] = [];
        if (!name.trim()) errs.push('name');
        if (!categoryId) errs.push('category');
        if (!hasVariants && !isOpenPrice && (!singlePrice || Number(singlePrice) < 0)) errs.push('price');
        if (hasVariants) {
            variants.forEach((v, i) => { 
                if (!v.name.trim() || (!isOpenPrice && (!v.price || Number(v.price) < 0))) errs.push(`variant-${i}`); 
            });
        }
        setErrors(errs);
        return errs.length === 0;
    };

    const parseDecimal = (val: string) => {
        const clean = String(val).replace(',', '.');
        return isNaN(Number(clean)) ? 0 : Number(clean);
    };

    const handleSubmit = async () => {
        if (!validate()) return Alert.alert("Lengkapi Data", "Mohon isi field yang ditandai merah.");
        setLoading(true);
        try {
            const filterRecipes = (recipesArr: any[]) => {
                if (!useRecipe) return undefined;
                const filtered = recipesArr
                    .filter((r: any) => r.materialId && parseDecimal(r.quantityRequired) > 0)
                    .map((r: any) => ({
                        materialId: String(r.materialId), 
                        quantityRequired: parseDecimal(r.quantityRequired)
                    }));
                return filtered.length > 0 ? filtered : undefined;
            };

            const payload: any = {
                id: initialData?.id,
                categoryId: Number(categoryId),
                name: name.trim(),
                hasVariant: hasVariants,
            };

            if (hasVariants) {
                payload.variants = variants.map(v => ({
                    name: v.name.trim(),
                    price: isOpenPrice ? 0 : parseDecimal(v.price),
                    trackStock: trackStock,
                    stock: trackStock ? parseDecimal(v.stock) : 0,
                    recipes: filterRecipes(v.recipes)
                }));
            } else {
                payload.price = isOpenPrice ? 0 : parseDecimal(singlePrice);
                payload.trackStock = trackStock;
                payload.stock = trackStock ? parseDecimal(singleStock) : 0;
                payload.recipes = filterRecipes(singleRecipes);
            }

            await onSubmit(payload);
            onClose();
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const addRecipe = (isSingle: boolean, vIndex?: number) => {
        if (isSingle) {
            setSingleRecipes([...singleRecipes, { materialId: '', quantityRequired: '' }]);
        } else if (vIndex !== undefined) {
            const nv = [...variants];
            nv[vIndex].recipes.push({ materialId: '', quantityRequired: '' });
            setVariants(nv);
        }
    };

    const modalStyle: any = isLarge 
        ? { width: 600, maxHeight: height * 0.9, borderRadius: 24, alignSelf: 'center', marginTop: '5%' } 
        : { width: '100%', maxHeight: height * 0.92, borderTopLeftRadius: 40, borderTopRightRadius: 40, position: 'absolute', bottom: 0 };

    const renderRecipeSection = (recipes: any[], isSingle: boolean, vIndex?: number) => (
        <View className="p-4 mt-3 bg-white border border-dashed rounded-xl border-slate-300 shadow-sm">
            <Text className="text-[10px] font-bold text-slate-500 mb-3">PILIH BAHAN BAKU (BOM)</Text>
            {recipes.map((r, rIndex) => (
                <View key={rIndex} className="flex-row items-center mb-2 space-x-2">
                    <ScrollView horizontal className="flex-1 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        {materials.map(mat => (
                            <TouchableOpacity key={mat.id} 
                                onPress={() => {
                                    if (isSingle) { const nr = [...singleRecipes]; nr[rIndex].materialId = String(mat.id); setSingleRecipes(nr); }
                                    else { const nv = [...variants]; nv[vIndex!].recipes[rIndex].materialId = String(mat.id); setVariants(nv); }
                                }}
                                className={`mr-2 px-3 py-1.5 rounded-md ${String(r.materialId) === String(mat.id) ? 'bg-indigo-600 shadow-sm' : 'bg-white border border-slate-200'}`}
                            >
                                <Text className={`text-[10px] font-bold ${String(r.materialId) === String(mat.id) ? 'text-white' : 'text-slate-600'}`}>{mat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <InputField label="QTY" value={r.quantityRequired} keyboardType="numeric" onChangeText={(t: string) => {
                        if (isSingle) { const nr = [...singleRecipes]; nr[rIndex].quantityRequired = t; setSingleRecipes(nr); }
                        else { const nv = [...variants]; nv[vIndex!].recipes[rIndex].quantityRequired = t; setVariants(nv); }
                    }} />
                    <TouchableOpacity className="p-2.5 bg-rose-50 rounded-xl" onPress={() => {
                        if (isSingle) { const nr = [...singleRecipes]; nr.splice(rIndex, 1); setSingleRecipes(nr); }
                        else { const nv = [...variants]; nv[vIndex!].recipes.splice(rIndex, 1); setVariants(nv); }
                    }}><Trash2 size={16} color="#EF4444" /></TouchableOpacity>
                </View>
            ))}
            <TouchableOpacity onPress={() => addRecipe(isSingle, vIndex)} className="flex-row items-center justify-center p-3 mt-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <Plus size={14} color="#4F46E5" /><Text className="ml-1 text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Tambah Bahan</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View className="justify-end flex-1 bg-black/60">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
                    <View style={modalStyle} className="bg-gray-50 overflow-hidden shadow-2xl">
                        
                        <View className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white flex-row justify-between items-center z-10">
                            <View>
                                <Text className="text-xl font-extrabold text-slate-800">{initialData ? 'Edit Produk' : 'Produk Baru'}</Text>
                                <Text className="text-slate-400 text-xs font-medium">Kelola data katalog produk</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-gray-100 rounded-full justify-center items-center">
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            
                            <View className="p-5 mb-5 bg-white border rounded-2xl border-slate-200 shadow-sm">
                                <InputField label="NAMA PRODUK" isRequired={errors.includes('name')} value={name} onChangeText={setName} />
                            </View>

                            <View className="p-5 mb-5 bg-white border rounded-2xl border-slate-200 shadow-sm">
                                <Text className={`text-[9px] font-bold uppercase mb-3 ${errors.includes('category') ? 'text-rose-500' : 'text-slate-400'}`}>Pilih Kategori</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 5 }}>
                                    {categories.map(cat => (
                                        <TouchableOpacity key={cat.id} onPress={() => setCategoryId(cat.id)} className={`mr-2 px-4 py-2.5 rounded-xl border ${categoryId === cat.id ? 'bg-slate-800 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                            <Text className={`text-[11px] font-bold tracking-wider ${categoryId === cat.id ? 'text-white' : 'text-slate-600'}`}>{cat.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View className="p-5 mb-5 bg-white border rounded-2xl border-slate-200 shadow-sm gap-5">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center"><Settings2 size={18} color="#4F46E5" /><Text className="text-xs font-bold text-slate-700 ml-2">Harga Bebas (Open Price)</Text></View>
                                    <Switch value={isOpenPrice} onValueChange={setIsOpenPrice} trackColor={{true: '#4F46E5', false: '#CBD5E1'}} />
                                </View>
                                <View className="flex-row items-center justify-between border-t border-slate-100 pt-5">
                                    <View className="flex-row items-center"><Archive size={18} color="#F59E0B" /><Text className="text-xs font-bold text-slate-700 ml-2">Stok Fisik (Barang Jadi)</Text></View>
                                    <Switch value={trackStock} onValueChange={(val) => { setTrackStock(val); if(val) setUseRecipe(false); }} trackColor={{true: '#4F46E5', false: '#CBD5E1'}} />
                                </View>
                                <View className="flex-row items-center justify-between border-t border-slate-100 pt-5">
                                    <View className="flex-row items-center"><Box size={18} color="#10B981" /><Text className="text-xs font-bold text-slate-700 ml-2">Resep (Stok Bahan Baku)</Text></View>
                                    <Switch value={useRecipe} onValueChange={(val) => { setUseRecipe(val); if(val) setTrackStock(false); }} trackColor={{true: '#4F46E5', false: '#CBD5E1'}} />
                                </View>
                            </View>

                            <View className="p-5 mb-6 bg-white border rounded-2xl border-slate-200 shadow-sm">
                                <View className="flex-row items-center justify-between p-3 mb-4 bg-slate-900 rounded-xl">
                                    <Text className="text-xs font-bold text-white ml-2">Gunakan Multi Varian?</Text>
                                    <Switch value={hasVariants} onValueChange={setHasVariants} thumbColor="#fff" trackColor={{true: '#10B981', false: '#475569'}} />
                                </View>

                                {!hasVariants ? (
                                    <View>
                                        {!isOpenPrice && (
                                            <InputField label="HARGA JUAL REGULER" isRequired={errors.includes('price')} value={singlePrice} onChangeText={setSinglePrice} keyboardType="numeric" />
                                        )}
                                        {isOpenPrice && <Text className="text-[10px] italic text-slate-400 mb-2">Kasir akan mengetik harga saat transaksi.</Text>}
                                        
                                        {trackStock && <View className="mt-4"><InputField label="STOK AWAL (PCS)" value={singleStock} onChangeText={setSingleStock} keyboardType="numeric" /></View>}
                                        {useRecipe && renderRecipeSection(singleRecipes, true)}
                                    </View>
                                ) : (
                                    <View>
                                        {variants.map((v, i) => (
                                            <View key={v.stableKey} className="p-4 mb-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                                                <View className="flex-row items-center justify-between mb-4 border-b border-slate-200 pb-3">
                                                    <Text className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Varian #{i + 1}</Text>
                                                    {i > 0 && <TouchableOpacity onPress={() => setVariants(variants.filter((_, idx) => idx !== i))} className="bg-rose-100 p-1.5 rounded-lg"><Trash2 size={14} color="#EF4444" /></TouchableOpacity>}
                                                </View>
                                                <InputField label="NAMA VARIAN" isRequired={errors.includes(`variant-${i}`)} value={v.name} onChangeText={(t: any) => { const nv = [...variants]; nv[i].name = t; setVariants(nv); }} />
                                                
                                                <View className="flex-row mt-4 space-x-4">
                                                    {!isOpenPrice && (
                                                        <View className="flex-1"><InputField label="HARGA JUAL" value={v.price} onChangeText={(t: any) => { const nv = [...variants]; nv[i].price = t; setVariants(nv); }} keyboardType="numeric" /></View>
                                                    )}
                                                    {trackStock && (
                                                        <View className="flex-1"><InputField label="STOK AWAL" value={v.stock} onChangeText={(t: any) => { const nv = [...variants]; nv[i].stock = t; setVariants(nv); }} keyboardType="numeric" /></View>
                                                    )}
                                                </View>

                                                {useRecipe && renderRecipeSection(v.recipes, false, i)}
                                            </View>
                                        ))}
                                        <TouchableOpacity onPress={() => setVariants([...variants, { stableKey: Math.random().toString(), name: '', price: '', stock: '', recipes: [] }])} className="items-center justify-center p-4 mt-2 border-2 border-indigo-300 border-dashed rounded-xl bg-indigo-50/50"><Text className="text-xs font-bold text-indigo-700">+ TAMBAH VARIAN BARU</Text></TouchableOpacity>
                                    </View>
                                )}
                            </View>
                            <View className="h-10" />
                        </ScrollView>

                        <View className="p-5 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                            <TouchableOpacity
                                onPress={handleSubmit} disabled={loading}
                                className={`h-14 rounded-2xl flex-row justify-center items-center shadow-lg transition-all ${loading ? 'opacity-50' : 'active:scale-95 shadow-indigo-500/30'}`}
                                style={{ backgroundColor: '#4F46E5' }}
                            >
                                <Text className="text-white font-bold text-lg mr-2">
                                    {loading ? 'Menyimpan...' : 'Simpan Produk'}
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