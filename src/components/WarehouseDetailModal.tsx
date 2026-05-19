import React, { useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { X, Box, Edit, Trash2, PackagePlus } from 'lucide-react-native';
import { useWarehouseStore } from '../stores/warehouseStore';

export default function WarehouseDetailModal({ visible, warehouseId, onClose, onEdit, onDelete, onRestock }: any) {
    const { width } = useWindowDimensions();
    const { currentWarehouse, fetchWarehouseById, isLoading } = useWarehouseStore();

    useEffect(() => {
        if (visible && warehouseId) {
            fetchWarehouseById(warehouseId);
        }
    }, [visible, warehouseId]);

    const isLarge = width >= 768;
    const containerStyle = isLarge ? { width: 500, alignSelf: 'center' as any, borderRadius: 24, marginTop: 40, height: '85%' } : { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '90%' } as any;

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View className="justify-end flex-1 bg-black/60">
                <View style={containerStyle} className="bg-slate-50 overflow-hidden">
                    <View className="flex-row items-center justify-between p-4 bg-white border-b border-slate-100">
                        <Text className="text-sm italic font-black uppercase text-slate-800">Stok Gudang</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-100"><X size={16} color="#64748B" /></TouchableOpacity>
                    </View>

                    {isLoading || !currentWarehouse ? (
                        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#6366F1" /></View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                            <View className="items-center mb-6">
                                <View className="items-center justify-center w-16 h-16 mb-3 border bg-slate-100 rounded-2xl border-slate-200">
                                    <Box size={28} color="#6366F1" />
                                </View>
                                <Text className="text-xl font-black text-center text-slate-900">{currentWarehouse.name}</Text>
                                <Text className="text-xs font-bold text-slate-400 mt-1">{currentWarehouse.address || 'Tidak ada alamat'}</Text>
                            </View>

                            <View className="flex-row items-center justify-between mb-3">
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Material Fisik</Text>
                                <TouchableOpacity onPress={() => onRestock(currentWarehouse.id)} className="flex-row items-center bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                    <PackagePlus size={14} color="#10B981" />
                                    <Text className="ml-1 text-[9px] font-bold text-emerald-600 uppercase">Input Restock</Text>
                                </TouchableOpacity>
                            </View>

                            {currentWarehouse.stocks && currentWarehouse.stocks.length > 0 ? (
                                currentWarehouse.stocks.map((stock: any, index: number) => (
                                    <View key={index} className="p-4 mb-2 bg-white border shadow-sm rounded-2xl border-slate-100 flex-row justify-between items-center">
                                        <View>
                                            <Text className="text-sm font-black text-slate-800">{stock.material?.name}</Text>
                                        </View>
                                        <Text className="text-base font-black text-indigo-600">
                                            {stock.quantity} <Text className="text-[10px] text-slate-400">{stock.material?.unit}</Text>
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <View className="p-6 items-center border border-dashed border-slate-300 rounded-2xl mt-4">
                                    <Text className="text-sm font-bold text-slate-400">Gudang masih kosong</Text>
                                </View>
                            )}
                        </ScrollView>
                    )}

                    <View className="gap-3 p-4 bg-white border-t border-slate-100 flex-row">
                        <TouchableOpacity onPress={() => { onClose(); onEdit(currentWarehouse); }} className="flex-1 flex-row items-center justify-center h-12 shadow-lg bg-slate-900 rounded-xl active:scale-95">
                            <Edit size={16} color="white" />
                            <Text className="text-white font-black uppercase ml-2 text-[11px] tracking-widest">Edit Gudang</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => { onClose(); onDelete(currentWarehouse.id); }} className="flex-1 flex-row items-center justify-center h-12 shadow-lg bg-rose-600 rounded-xl active:scale-95">
                            <Trash2 size={16} color="white" />
                            <Text className="text-white font-black uppercase ml-2 text-[11px] tracking-widest">Hapus</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}