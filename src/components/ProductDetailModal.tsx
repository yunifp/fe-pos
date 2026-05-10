import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, useWindowDimensions, Platform } from 'react-native';
import { X, Package, TrendingUp, Layers, Archive, Infinity as InfinityIcon, Tag, Edit, Trash2, Trash } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';
import api from '../api/api';

// Menambahkan prop onDelete ke dalam parameter
export default function ProductDetailModal({ visible, product, onClose, onEdit, onDelete }: any) {
    const { settings } = useSettingStore();
    const { width } = useWindowDimensions();
    if (!product) return null;

    const isLarge = width >= 768;
    const formatMoney = (val: any) => `${settings.currencySymbol} ${parseInt(val || 0).toLocaleString('id-ID')}`;
    const imageUrl = product.image ? `${api.defaults.baseURL?.replace('/api', '')}${product.image}` : null;

    const FinancialCard = ({ title, price, hpp, openPrice }: any) => {
        const p = parseFloat(price || 0); const h = parseFloat(hpp || 0); const margin = p - h;
        const marginPercent = p > 0 ? ((margin / p) * 100).toFixed(1) : '0';
        return (
            <View className="p-4 mb-3 bg-white border shadow-sm border-slate-100 rounded-2xl">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</Text>
                    {openPrice ? (
                        <View className="bg-emerald-50 px-2 py-0.5 rounded-md"><Text className="text-[9px] font-bold text-emerald-600">-</Text></View>
                    ) : (
                        <View className="bg-emerald-50 px-2 py-0.5 rounded-md"><Text className="text-[9px] font-bold text-emerald-600">Margin {marginPercent}%</Text></View>
                    )}
                </View>
                <View className="flex-row justify-between">
                    {
                        openPrice ? (
                            <View><Text className="text-[8px] font-bold text-slate-300 uppercase">Jual</Text><Text className="text-md font-lack text-slate-800">Harga Bebas (Open Price)</Text></View>
                        ) : (
                            <View><Text className="text-[8px] font-bold text-slate-300 uppercase">Jual</Text><Text className="text-lg font-black text-slate-800">{formatMoney(p)}</Text></View>
                        )
                    }

                    {openPrice ? (
                        <View className="items-end"><Text className="text-[8px] font-bold text-slate-300 uppercase">Profit</Text><Text className="text-sm font-black text-emerald-600">Tidak dapat diprediksi</Text></View>
                    ) : (
                        <View className="items-end"><Text className="text-[8px] font-bold text-slate-300 uppercase">Profit</Text><Text className="text-lg font-black text-emerald-600">{formatMoney(margin)}</Text></View>
                    )}
                </View>
                <View className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden flex-row">
                    <View style={{ flex: h > 0 ? h : 1, backgroundColor: '#E2E8F0' }} />
                    <View style={{ flex: margin > 0 ? margin : 0, backgroundColor: '#10B981' }} />
                </View>
            </View>
        );
    };

    const containerStyle = isLarge ? { width: 500, alignSelf: 'center' as any, borderRadius: 24, marginTop: 40 } : { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30 } as any;

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View className="justify-end flex-1 bg-black/60">
                <View style={containerStyle} className="bg-slate-50 h-[85%] overflow-hidden">
                    <View className="flex-row items-center justify-between p-4 bg-white border-b border-slate-100">
                        <Text className="text-sm italic font-black uppercase text-slate-800">Informasi Produk</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-100"><X size={16} color="#64748B" /></TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ padding: 20 }}>
                        <View className="flex-row items-center p-4 mb-6 bg-white border shadow-sm rounded-2xl border-slate-100">
                            <View className="items-center justify-center w-20 h-20 overflow-hidden border bg-slate-50 rounded-xl border-slate-100">
                                {imageUrl ? <Image source={{ uri: imageUrl }} className="w-full h-full" /> : <Package size={32} color="#CBD5E1" />}
                            </View>
                            <View className="flex-1 ml-4">
                                <Text className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{product.category?.name || 'UMUM'}</Text>
                                <Text className="text-xl font-black text-slate-900" numberOfLines={2}>{product.name}</Text>
                                <Text className="text-[11px] text-slate-400 mt-1" numberOfLines={2}>{product.description || 'Tidak ada deskripsi.'}</Text>
                            </View>
                        </View>

                        {!product.hasVariants ? (
                            <View>
                                <FinancialCard title="Ringkasan Biaya" price={product.variants[0].price} hpp={product.variants[0].hpp} openPrice={product.openPrice} />
                                <View className="flex-row items-center justify-between p-4 bg-white border shadow-sm rounded-2xl border-slate-100">
                                    <View className="flex-row items-center"><Archive size={16} color="#64748B" /><Text className="ml-2 text-xs font-black uppercase text-slate-700">Stok Tersedia</Text></View>
                                    <Text className="text-xl font-black text-slate-800">{product.variants[0].stocks[0]?.quantity || 0} <Text className="text-[10px] font-normal text-slate-400">Pcs</Text></Text>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Varian Produk</Text>
                                {product.variants.map((v: any, i: number) => (
                                    <View key={i} className="p-4 mb-3 bg-white border shadow-sm rounded-2xl border-slate-100">
                                        <View className="flex-row justify-between mb-3"><Text className="text-sm font-black text-slate-800">{v.name}</Text><Text className="text-sm font-black text-indigo-600">{formatMoney(v.price)}</Text></View>
                                        <View className="flex-row items-center justify-between pt-3 border-t border-slate-50">
                                            <Text className="text-[9px] font-bold text-slate-400 uppercase">Stok: {v.stocks[0]?.quantity || 0} Pcs</Text>
                                            <Text className="text-[9px] font-bold text-emerald-600 uppercase italic">Profit: {formatMoney(v.price - v.hpp)}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    <View className="gap-3 p-4 bg-white border-t border-slate-100">
                        <TouchableOpacity onPress={() => { onClose(); onEdit(); }} className="flex-row items-center justify-center h-12 shadow-lg bg-slate-900 rounded-xl active:scale-95">
                            <Edit size={16} color="white" />
                            <Text className="text-white font-black uppercase ml-2 text-[11px] tracking-widest">Update Data</Text>
                        </TouchableOpacity>

                        {/* Menghubungkan tombol hapus ke fungsi onDelete */}
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                if (onDelete) onDelete(product.id);
                            }}
                            className="flex-row items-center justify-center h-12 shadow-lg bg-rose-600 rounded-xl active:scale-95"
                        >
                            <Trash2 size={16} color="white" />
                            <Text className="text-white font-black uppercase ml-2 text-[11px] tracking-widest">Hapus Produk</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}