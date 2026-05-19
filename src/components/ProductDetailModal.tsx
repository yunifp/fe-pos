import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, useWindowDimensions, Platform } from 'react-native';
import { X, Package, Edit, Trash2, Archive, ChevronRight } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';
import api from '../api/api';

export default function ProductDetailModal({ visible, product, onClose, onEdit, onDelete }: any) {
    const { settings } = useSettingStore();
    const { width, height } = useWindowDimensions();
    
    if (!visible || !product) return null;

    const isLarge = width >= 768;
    const formatMoney = (val: any) => `${settings.currencySymbol || 'Rp'} ${parseInt(val || 0).toLocaleString('id-ID')}`;
    const imageUrl = product.image ? `${api.defaults.baseURL?.replace('/api', '')}${product.image}` : null;

    const isSingle = product.hasVariant === false;
    const displayPrice = isSingle ? product.price : product.variants?.[0]?.price;
    const isOpenPrice = Number(displayPrice) === 0;

    const FinancialCard = ({ title, price }: any) => {
        const p = parseFloat(price || 0); 
        return (
            <View className="p-5 mb-4 bg-white border shadow-sm border-slate-200 rounded-2xl">
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</Text>
                    <View className="bg-emerald-50 px-2.5 py-1 rounded-md"><Text className="text-[10px] font-bold text-emerald-600 tracking-wider">Info Jual</Text></View>
                </View>
                <View className="flex-row justify-between">
                    {isOpenPrice ? (
                        <View><Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipe Harga</Text><Text className="text-lg font-black text-slate-800">Harga Bebas (Open Price)</Text></View>
                    ) : (
                        <View><Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Harga Reguler</Text><Text className="text-lg font-black text-slate-800">{formatMoney(p)}</Text></View>
                    )}
                </View>
            </View>
        );
    };

    const containerStyle: any = isLarge ? { width: 500, maxHeight: height * 0.85, alignSelf: 'center', borderRadius: 24, marginTop: '5%' } : { width: '100%', maxHeight: height * 0.9, borderTopLeftRadius: 40, borderTopRightRadius: 40, position: 'absolute', bottom: 0 };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View className="justify-end flex-1 bg-black/60">
                <View style={containerStyle} className="bg-slate-50 overflow-hidden shadow-2xl">
                    
                    <View className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white flex-row justify-between items-center z-10">
                        <View>
                            <Text className="text-xl font-extrabold text-slate-800">Detail Produk</Text>
                            <Text className="text-slate-400 text-xs font-medium">Informasi Harga & Stok</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-gray-100 rounded-full justify-center items-center">
                            <X size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
                        <View className="flex-row items-center p-5 mb-6 bg-white border shadow-sm rounded-2xl border-slate-200">
                            <View className="items-center justify-center w-20 h-20 overflow-hidden border bg-slate-50 rounded-xl border-slate-100">
                                {imageUrl ? <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" /> : <Package size={32} color="#CBD5E1" />}
                            </View>
                            <View className="flex-1 ml-5">
                                <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{product.category?.name || 'UMUM'}</Text>
                                <Text className="text-lg font-black text-slate-900 leading-tight" numberOfLines={2}>{product.name}</Text>
                            </View>
                        </View>

                        {isSingle ? (
                            <View>
                                <FinancialCard title="Ringkasan Biaya" price={product.price} />
                                
                                {product.trackStock && (
                                    <View className="flex-row items-center justify-between p-5 mb-4 bg-white border shadow-sm rounded-2xl border-slate-200">
                                        <View className="flex-row items-center"><Archive size={18} color="#64748B" /><Text className="ml-3 text-sm font-bold text-slate-700">Stok Fisik Tersedia</Text></View>
                                        <Text className="text-xl font-black text-slate-800">{product.stock || 0} <Text className="text-xs font-medium text-slate-400">Pcs</Text></Text>
                                    </View>
                                )}

                                <View className="mt-2">
                                    <Text className="text-xs font-bold text-slate-500 mb-3">Komposisi (Resep BOM)</Text>
                                    <View className="bg-white border border-slate-200 rounded-2xl p-5 mb-3 shadow-sm">
                                        {product.recipes && product.recipes.length > 0 ? (
                                            product.recipes.map((recipe: any, rIndex: number) => (
                                                <View key={rIndex} className={`flex-row items-center py-2 ${rIndex !== product.recipes.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                                    <ChevronRight size={14} color="#94A3B8" />
                                                    <Text className="text-xs font-bold text-slate-700 ml-2 flex-1">{recipe.material?.name || 'Material'}</Text>
                                                    <Text className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{recipe.quantityRequired} <Text className="text-[10px] text-indigo-400">{recipe.material?.unit || 'unit'}</Text></Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text className="text-xs italic text-slate-400">Tidak ada komponen bahan baku.</Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <Text className="text-xs font-bold text-slate-500 mb-3">Daftar Varian Produk</Text>
                                {(product.variants || []).map((v: any, i: number) => (
                                    <View key={i} className="p-5 mb-4 bg-white border shadow-sm rounded-2xl border-slate-200">
                                        <View className="flex-row justify-between mb-3 pb-3 border-b border-slate-100">
                                            <Text className="text-sm font-black text-slate-800">{v.name}</Text>
                                            <Text className="text-sm font-black text-emerald-600">{isOpenPrice ? 'Open Price' : formatMoney(v.price)}</Text>
                                        </View>
                                        
                                        {v.trackStock && (
                                            <View className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex-row justify-between mb-3">
                                                <Text className="text-[10px] font-bold text-slate-500 uppercase">Sisa Stok Fisik</Text>
                                                <Text className="text-[11px] font-black text-slate-800">{v.stock || 0} Pcs</Text>
                                            </View>
                                        )}

                                        <View className="mt-1">
                                            <Text className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Resep (BOM):</Text>
                                            {v.recipes && v.recipes.length > 0 ? (
                                                v.recipes.map((recipe: any, rIndex: number) => (
                                                    <View key={rIndex} className="flex-row items-center mb-2">
                                                        <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2" />
                                                        <Text className="text-[11px] font-medium text-slate-600 flex-1">{recipe.material?.name || 'Material'}</Text>
                                                        <Text className="text-[11px] font-bold text-slate-700">{recipe.quantityRequired} <Text className="text-slate-400 text-[9px]">{recipe.material?.unit || 'unit'}</Text></Text>
                                                    </View>
                                                ))
                                            ) : (
                                                <Text className="text-[10px] italic text-slate-400">Tanpa bahan baku.</Text>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                        <View className="h-6" />
                    </ScrollView>

                    <View className="p-5 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex-row space-x-3">
                        <TouchableOpacity onPress={() => { onClose(); onEdit(); }} className="flex-1 flex-row items-center justify-center h-14 bg-slate-800 rounded-2xl active:scale-95 transition-all">
                            <Edit size={18} color="white" />
                            <Text className="text-white font-bold text-sm ml-2">Edit Data</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => { onClose(); if (onDelete) onDelete(product.id); }} className="flex-1 flex-row items-center justify-center h-14 bg-rose-50 border border-rose-100 rounded-2xl active:bg-rose-100 transition-all">
                            <Trash2 size={18} color="#EF4444" />
                            <Text className="text-rose-600 font-bold text-sm ml-2">Hapus</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
}