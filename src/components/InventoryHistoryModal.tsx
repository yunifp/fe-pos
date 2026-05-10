import React from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, ActivityIndicator, useWindowDimensions } from 'react-native';
import { X, Plus, Minus, AlertCircle, User } from 'lucide-react-native';

interface Props {
    visible: boolean;
    onClose: () => void;
    selectedVariant: any;
    historyLogs: any[];
    loadingHistory: boolean;
    loadingMoreHistory: boolean;
    onLoadMore: () => void;
}

export default function InventoryHistoryModal({ visible, onClose, selectedVariant, historyLogs, loadingHistory, loadingMoreHistory, onLoadMore }: Props) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="justify-end flex-1 bg-black/60">
                <View style={{ height: isDesktop ? '90%' : '85%', maxWidth: isDesktop ? 600 : '100%', alignSelf: 'center', width: '100%' }} className="bg-white rounded-t-[30px] overflow-hidden shadow-2xl">
                    <View className="z-10 flex-row items-center justify-between p-5 border-b border-slate-50 bg-white">
                        <View>
                            <Text className="text-lg font-black text-slate-800 uppercase italic">Riwayat Stok</Text>
                            <Text className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter" numberOfLines={1}>{selectedVariant?.name}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-50"><X size={18} color="#64748B" /></TouchableOpacity>
                    </View>

                    {loadingHistory ? (
                        <View className="mt-10"><ActivityIndicator size="large" color="#4F46E5" /></View>
                    ) : (
                        <FlatList
                            data={historyLogs}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                            showsVerticalScrollIndicator={false}
                            onEndReached={onLoadMore}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={loadingMoreHistory ? <ActivityIndicator size="small" color="#4F46E5" className="py-4" /> : null}
                            renderItem={({ item, index }) => {
                                const isLast = index === historyLogs.length - 1;
                                const isPlus = item.changeQty > 0;
                                return (
                                    <View className="flex-row">
                                        <View className="items-center mr-4">
                                            <View className={`w-8 h-8 rounded-full items-center justify-center border-4 border-white shadow-sm ${item.type === 'STOCK_IN' ? 'bg-emerald-100' : item.type === 'STOCK_OUT' ? 'bg-rose-100' : 'bg-amber-100'}`}>
                                                {item.type === 'STOCK_IN' ? <Plus size={12} color="#10B981" /> : item.type === 'STOCK_OUT' ? <Minus size={12} color="#F43F5E" /> : <AlertCircle size={12} color="#D97706" />}
                                            </View>
                                            {!isLast && <View className="w-[1.5px] flex-1 bg-slate-50 -my-1" />}
                                        </View>
                                        <View className="flex-1 pb-6">
                                            <View className="flex-row items-start justify-between">
                                                <View className="flex-1 mr-2">
                                                    <Text className="text-xs font-black text-slate-800 uppercase">
                                                        {item.type === 'STOCK_IN' ? 'Barang Masuk' : item.type === 'STOCK_OUT' ? 'Barang Keluar' : item.type === 'TRANSACTION' ? 'Penjualan POS' : 'Opname Manual'}
                                                    </Text>
                                                    <Text className="text-[9px] text-slate-400 font-bold mt-0.5">{new Date(item.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                                                </View>
                                                <Text className={`font-black text-sm ${isPlus ? 'text-emerald-600' : 'text-rose-500'}`}>{isPlus ? '+' : ''}{item.changeQty}</Text>
                                            </View>
                                            <View className="bg-slate-50 p-2.5 rounded-xl mt-2 border border-slate-100">
                                                {item.reason && <Text className="mb-1.5 text-[10px] italic font-bold text-slate-500 leading-tight">"{item.reason}"</Text>}
                                                <View className="flex-row items-center justify-between">
                                                    <View className="flex-row items-center">
                                                        <User size={10} color="#94A3B8" className="mr-1" />
                                                        <Text className="text-[9px] text-slate-400 font-black uppercase">{item.performer?.fullName?.split(' ')[0] || 'System'}</Text>
                                                    </View>
                                                    <Text className="text-[9px] text-slate-400 font-bold">Saldo: <Text className="text-slate-700 font-black">{item.finalStock}</Text></Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}