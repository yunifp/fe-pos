import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { X, Save, Package } from 'lucide-react-native';
import InputField from './InputField';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (type: string, qty: string, reason: string) => Promise<void>;
    selectedVariant: any;
    submitting: boolean;
}

export default function InventoryAdjustModal({ visible, onClose, onSubmit, selectedVariant, submitting }: Props) {
    const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'>('STOCK_IN');
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustReason, setAdjustReason] = useState('');

    // Reset form setiap kali modal dibuka
    useEffect(() => {
        if (visible) {
            setAdjustType('STOCK_IN');
            setAdjustQty('');
            setAdjustReason('');
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View className="items-center justify-center flex-1 p-4 bg-black/60">
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="w-full max-w-md">
                        <TouchableWithoutFeedback>
                            <View className="bg-white rounded-[24px] p-5 shadow-2xl overflow-hidden">
                                <View className="flex-row items-center justify-between mb-5">
                                    <Text className="text-base font-black text-slate-800 uppercase italic">Update Stok</Text>
                                    <TouchableOpacity onPress={onClose} className="p-1.5 rounded-full bg-slate-100">
                                        <X size={16} color="#64748B" />
                                    </TouchableOpacity>
                                </View>

                                <View className="flex-row items-center p-3 mb-5 bg-slate-50 border border-slate-100 rounded-xl">
                                    <View className="items-center justify-center w-10 h-10 mr-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <Package size={18} color="#64748B" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[11px] font-black text-slate-800 uppercase" numberOfLines={1}>{selectedVariant?.name}</Text>
                                        <Text className="text-[9px] text-slate-500 font-bold uppercase">Tersedia: <Text className="text-indigo-600">{selectedVariant?.currentStock}</Text></Text>
                                    </View>
                                </View>

                                <View className="flex-row p-1 mb-5 bg-slate-100 rounded-xl">
                                    {['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'].map((type: any) => (
                                        <TouchableOpacity key={type} onPress={() => setAdjustType(type)} className={`flex-1 py-2.5 rounded-lg items-center ${adjustType === type ? 'bg-white shadow-sm' : ''}`}>
                                            <Text className={`text-[8px] font-black uppercase ${adjustType === type ? (type === 'STOCK_IN' ? 'text-emerald-600' : type === 'STOCK_OUT' ? 'text-rose-600' : 'text-amber-600') : 'text-slate-400'}`}>
                                                {type === 'STOCK_IN' ? 'MASUK' : type === 'STOCK_OUT' ? 'KELUAR' : 'OPNAME'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <InputField 
                                    label={adjustType === 'ADJUSTMENT' ? 'JUMLAH STOK FISIK ASLI' : 'JUMLAH PERUBAHAN'} 
                                    placeholder="0" 
                                    keyboardType="numeric" 
                                    value={adjustQty} 
                                    onChangeText={(v: string) => setAdjustQty(v.replace(/[^0-9]/g, ''))} 
                                />

                                <InputField 
                                    label="ALASAN / KETERANGAN (OPSIONAL)" 
                                    placeholder="..." 
                                    value={adjustReason} 
                                    onChangeText={setAdjustReason} 
                                />

                                <TouchableOpacity onPress={() => onSubmit(adjustType, adjustQty, adjustReason)} disabled={submitting} className="flex-row items-center justify-center bg-indigo-600 shadow-lg h-12 rounded-xl active:scale-95">
                                    {submitting ? <ActivityIndicator color="white" size="small" /> : (
                                        <><Save size={16} color="white" className="mr-2" /><Text className="text-[11px] font-black tracking-widest text-white uppercase">Simpan Perubahan</Text></>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}