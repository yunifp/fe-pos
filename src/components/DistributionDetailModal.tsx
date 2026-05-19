import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { X, Truck, CheckCircle2 } from 'lucide-react-native';
import moment from 'moment';

export default function DistributionDetailModal({ visible, distribution, onClose, onReceive, currentUserRole, currentUserBranchId }: any) {
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    
    if (!distribution) return null;

    const isLarge = width >= 768;
    const containerStyle = isLarge ? { width: 500, alignSelf: 'center' as any, borderRadius: 24, marginTop: 40, maxHeight: '85%' } : { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '90%' } as any;

    const isPending = distribution.status === 'IN_TRANSIT';
    const isReceived = distribution.status === 'RECEIVED';
    
    // Logika otoritas: Hanya Cabang tujuan (atau OWNER) yang bisa menekan tombol Terima
    const canReceive = isPending && (currentUserRole === 'OWNER' || currentUserBranchId === distribution.destBranchId);

    const handleReceive = async () => {
        setLoading(true);
        await onReceive(distribution.id);
        setLoading(false);
    };

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View className="justify-end flex-1 bg-black/60">
                <View style={containerStyle} className="bg-slate-50 overflow-hidden">
                    <View className="flex-row items-center justify-between p-4 bg-white border-b border-slate-100">
                        <Text className="text-sm italic font-black uppercase text-slate-800">Surat Jalan #{distribution.id.substring(0,6)}</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-100"><X size={16} color="#64748B" /></TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                        <View className="items-center mb-6">
                            <View className={`items-center justify-center w-16 h-16 mb-3 border rounded-2xl ${isReceived ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                {isReceived ? <CheckCircle2 size={30} color="#10B981" /> : <Truck size={30} color="#F59E0B" />}
                            </View>
                            <Text className={`text-[11px] font-black tracking-widest uppercase px-3 py-1 rounded-full ${isReceived ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {isReceived ? 'TELAH DITERIMA CABANG' : 'SEDANG DIKIRIM (IN TRANSIT)'}
                            </Text>
                        </View>

                        <View className="p-4 mb-4 bg-white border shadow-sm rounded-2xl border-slate-100">
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-[10px] font-bold text-slate-400 uppercase">Dari Gudang</Text>
                                <Text className="text-xs font-black text-slate-800">{distribution.sourceWarehouse?.name}</Text>
                            </View>
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-[10px] font-bold text-slate-400 uppercase">Tujuan Cabang</Text>
                                <Text className="text-xs font-black text-slate-800">{distribution.destBranch?.name}</Text>
                            </View>
                            <View className="flex-row justify-between pt-2 border-t border-slate-100">
                                <Text className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Kirim</Text>
                                <Text className="text-xs font-black text-slate-800">{moment(distribution.dispatchedAt).format('DD MMM YYYY, HH:mm')}</Text>
                            </View>
                            {isReceived && (
                                <View className="flex-row justify-between pt-2 mt-2 border-t border-slate-100">
                                    <Text className="text-[10px] font-bold text-slate-400 uppercase">Diterima Pada</Text>
                                    <Text className="text-xs font-black text-emerald-600">{moment(distribution.receivedAt).format('DD MMM YYYY, HH:mm')}</Text>
                                </View>
                            )}
                        </View>

                        {distribution.notes && (
                            <View className="p-4 mb-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <Text className="text-[10px] font-bold text-amber-600 uppercase mb-1">Catatan</Text>
                                <Text className="text-xs text-amber-900">{distribution.notes}</Text>
                            </View>
                        )}

                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-2">Daftar Material Fisik</Text>
                        {distribution.items?.map((item: any, idx: number) => (
                            <View key={idx} className="flex-row items-center justify-between p-3 mb-2 bg-white border rounded-xl border-slate-100">
                                <Text className="text-xs font-bold text-slate-700">{item.material?.name}</Text>
                                <Text className="text-sm font-black text-indigo-600">{item.quantity} <Text className="text-[9px] text-slate-400">{item.material?.unit}</Text></Text>
                            </View>
                        ))}
                    </ScrollView>

                    {canReceive && (
                        <View className="p-4 bg-white border-t border-slate-100">
                            <TouchableOpacity onPress={handleReceive} disabled={loading} className="flex-row items-center justify-center h-12 shadow-lg bg-emerald-600 rounded-xl active:scale-95 shadow-emerald-200">
                                {loading ? <ActivityIndicator color="white" size="small" /> : <><CheckCircle2 size={18} color="white" /><Text className="text-white font-black uppercase ml-2 text-[11px] tracking-widest">TERIMA BARANG INI</Text></>}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}