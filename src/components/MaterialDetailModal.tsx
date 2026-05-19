import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { X, Package, Edit, Trash2 } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';

export default function MaterialDetailModal({ visible, material, onClose, onEdit, onDelete }: any) {
    const { settings } = useSettingStore();
    const { width } = useWindowDimensions();
    if (!material) return null;

    const isLarge = width >= 768;
    const containerStyle = isLarge ? { width: 400, alignSelf: 'center' as any, borderRadius: 24, marginTop: 40 } : { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30 } as any;
    
    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
            <View className="justify-end flex-1 bg-black/60">
                <View style={containerStyle} className="bg-slate-50 overflow-hidden">
                    <View className="flex-row items-center justify-between p-4 bg-white border-b border-slate-100">
                        <Text className="text-sm italic font-black uppercase text-slate-800">Detail Material</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-100"><X size={16} color="#64748B" /></TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                        <View className="items-center mb-6">
                            <View className="items-center justify-center w-20 h-20 mb-3 border bg-slate-100 rounded-2xl border-slate-200">
                                <Package size={32} color="#94A3B8" />
                            </View>
                            <Text className="text-xl font-black text-center text-slate-900">{material.name}</Text>
                            <Text className="text-sm font-bold text-slate-400 mt-1">Satuan: {material.unit}</Text>
                        </View>

                        <View className="p-4 bg-white border shadow-sm rounded-2xl border-slate-100 flex-row justify-between items-center">
                            <Text className="text-xs font-bold text-slate-500 uppercase">Harga Modal</Text>
                            <Text className="text-lg font-black text-emerald-600">
                                {settings.currencySymbol || 'Rp'} {Number(material.costPerUnit).toLocaleString('id-ID')}
                            </Text>
                        </View>
                    </ScrollView>

                    <View className="gap-3 p-4 bg-white border-t border-slate-100 flex-row">
                        <TouchableOpacity onPress={() => { onClose(); onEdit(); }} className="flex-1 flex-row items-center justify-center h-12 shadow-lg bg-slate-900 rounded-xl active:scale-95">
                            <Edit size={16} color="white" />
                            <Text className="text-white font-black uppercase ml-2 text-[11px] tracking-widest">Edit</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => { onClose(); onDelete(material.id); }} className="flex-1 flex-row items-center justify-center h-12 shadow-lg bg-rose-600 rounded-xl active:scale-95">
                            <Trash2 size={16} color="white" />
                            <Text className="text-white font-black uppercase ml-2 text-[11px] tracking-widest">Hapus</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}