import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, useWindowDimensions } from 'react-native';
import { X, Edit3, Trash2 } from 'lucide-react-native';
import moment from 'moment';
import api from '../api/api';
import { useSettingStore } from '../stores/settingStore'; // <--- IMPORT SETTING STORE

function DetailRow({ label, value, last }: any) {
    return (
        <View className={`py-3 ${!last ? 'border-b border-slate-50' : ''} flex-row justify-between items-start`}>
            <Text className="text-[8px] font-black text-slate-400 uppercase tracking-widest w-20">{label}</Text>
            <Text className="flex-1 ml-2 text-[10px] font-bold text-right uppercase text-slate-700">{value}</Text>
        </View>
    );
}

export default function ExpenseDetailModal({ visible, onClose, item, canModify, onEdit, onDelete }: any) {
    const { width } = useWindowDimensions();
    const { settings } = useSettingStore();
    const primaryColor = settings.themePrimaryColor || '#4F46E5';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="justify-end flex-1 p-4 bg-black/70 md:items-center md:justify-center">
                <TouchableOpacity onPress={onClose} className="absolute inset-0" />
                <View style={{ width: width >= 768 ? 450 : '100%' }} className="bg-white rounded-[32px] p-6 shadow-2xl overflow-hidden">
                    <ScrollView showsVerticalScrollIndicator={false} className="max-h-[85vh]">
                        <View className="flex-row items-center justify-between mb-6">
                            <Text className="text-lg italic font-black uppercase text-slate-900">Rincian Belanja</Text>
                            <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-50"><X size={18} color="#64748B" /></TouchableOpacity>
                        </View>
                        
                        <View className="items-center p-6 mb-6 border bg-slate-950 rounded-3xl border-slate-800">
                            <Text className="text-slate-500 font-black text-[8px] uppercase tracking-[3px] mb-1">Total Nominal</Text>
                            <Text className="text-3xl font-black text-white">Rp {Number(item?.amount).toLocaleString('id-ID')}</Text>
                        </View>
                        
                        <View className="p-4 mb-6 border bg-slate-50 rounded-2xl border-slate-100">
                            <DetailRow label="Tanggal" value={moment(item?.date).format('LL')} />
                            <DetailRow label="Keterangan" value={item?.description || '-'} />
                            <DetailRow label="Admin" value={item?.recorder?.fullName} last />
                        </View>

                        {item?.receiptUrl && (
                            <View className="mb-6">
                                <Text className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Bukti Lampiran</Text>
                                <Image source={{ uri: api.defaults.baseURL?.replace('/api', '') + item.receiptUrl }} className="w-full h-48 border rounded-2xl bg-slate-50 border-slate-100" resizeMode="cover" />
                            </View>
                        )}

                        {canModify && (
                            <View className="flex-row gap-2">
                                <TouchableOpacity 
                                    onPress={onEdit} 
                                    style={{ backgroundColor: primaryColor }} // <--- Terapkan Tema Warna di sini
                                    className="flex-row items-center justify-center flex-1 py-4 shadow-md rounded-2xl active:scale-95 shadow-slate-200"
                                >
                                    <Edit3 size={14} color="white" />
                                    <Text className="ml-2 text-[10px] font-black text-white uppercase tracking-widest">Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onDelete} className="items-center justify-center px-5 py-4 shadow-md bg-rose-500 rounded-2xl active:scale-95 shadow-rose-200">
                                    <Trash2 size={16} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}