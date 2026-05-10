import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { X, Tag } from 'lucide-react-native';

interface Props {
    visible: boolean;
    onClose: () => void;
    order: any;
}

function SummaryRow({ label, value, isDiscount }: any) {
    return (
        <View className="flex-row justify-between mb-2">
            <Text className="text-[11px] font-bold uppercase text-slate-400">{label}</Text>
            <Text className={`${isDiscount ? 'text-rose-400' : 'text-white'} font-bold text-sm`}>
                {isDiscount ? '- ' : ''}Rp {Number(value || 0).toLocaleString('id-ID')}
            </Text>
        </View>
    );
}

export default function SalesOrderDetailModal({ visible, onClose, order }: Props) {
    if (!order) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="items-center justify-center flex-1 p-4 bg-black/60">
                <View className="w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl">
                    <View className="flex-row items-center justify-between px-6 py-5 border-b bg-slate-50 border-slate-100">
                        <View>
                            <Text className="text-lg font-black tracking-tight text-slate-900 uppercase italic">Detail Transaksi</Text>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.invoiceNumber}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-white border rounded-full border-slate-200">
                            <X size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView className="max-h-[50vh] p-6" showsVerticalScrollIndicator={false}>
                        <Text className="mb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Daftar Item</Text>
                        
                        {order.items.map((item: any, idx: number) => {
                            const itemDiscount = Number(item.discount || 0);
                            return (
                                <View key={idx} className="pb-4 mb-4 border-b border-slate-50">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1 pr-4">
                                            <Text className="text-sm font-bold tracking-tight text-slate-800">{item.variant.product.name}</Text>
                                            <Text className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                                                {item.variant.name} • <Text className="font-black text-indigo-600">{item.quantity}x</Text>
                                            </Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-sm font-black text-slate-900">Rp {Number(item.subtotal).toLocaleString('id-ID')}</Text>
                                            {itemDiscount > 0 && <Text className="text-[9px] font-bold text-rose-500 italic mt-0.5">Hemat Rp {itemDiscount.toLocaleString('id-ID')}</Text>}
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                        
                        <View className="p-6 mt-2 mb-4 bg-slate-900 rounded-[24px]">
                            <SummaryRow 
                                label="Subtotal Harga Normal" 
                                value={Number(order.subtotal) + order.items.reduce((acc: any, i: any) => acc + Number(i.discount), 0)} 
                            />
                            
                            {order.appliedPromotions && order.appliedPromotions.length > 0 && (
                                <View className="mt-2 mb-2">
                                    <Text className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-tighter">Rincian Promo & Potongan:</Text>
                                    {order.appliedPromotions.map((p: any, pIdx: number) => (
                                        <View key={pIdx} className="flex-row justify-between mb-1.5">
                                            <View className="flex-row items-center flex-1 pr-2">
                                                <Tag size={10} color="#10B981" />
                                                <Text className="text-[11px] font-bold text-emerald-400 ml-1.5" numberOfLines={1}>
                                                    {p.promotion.name} <Text className="text-[9px] text-slate-500 italic lowercase">({p.promotion.type.replace('_', ' ')})</Text>
                                                </Text>
                                            </View>
                                            <Text className="text-[11px] font-bold text-emerald-400">- Rp {Number(p.discountAmount).toLocaleString('id-ID')}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                            
                            <View className="h-[1px] bg-slate-700 my-3 border-dashed" />
                            <View className="flex-row items-center justify-between">
                                <View>
                                    <Text className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Total Akhir</Text>
                                    <Text className="text-[9px] text-slate-500 italic font-medium">{order.paymentMethod} • {order.orderType}</Text>
                                </View>
                                <Text className="text-2xl font-black tracking-tighter text-white">Rp {Number(order.totalAmount).toLocaleString('id-ID')}</Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}