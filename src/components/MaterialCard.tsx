import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Package } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';

export default function MaterialCard({ item, onPress, itemWidth }: any) {
    const { settings } = useSettingStore();
    return (
        <View style={{ width: `${itemWidth}%`, padding: 6 }}>
            <TouchableOpacity onPress={() => onPress(item)} className="flex-row items-center p-3 bg-white border shadow-sm rounded-2xl border-slate-100">
                <View className="items-center justify-center mr-3 border w-12 h-12 rounded-xl bg-slate-50 border-slate-100">
                    <Package color="#94A3B8" size={20} />
                </View>
                <View className="justify-center flex-1 pr-1">
                    <Text className="text-[13px] font-black text-slate-800 leading-tight mb-0.5" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-[10px] font-bold text-slate-400 mb-1 tracking-widest">{item.unit}</Text>
                    <Text className="text-[11px] font-black text-indigo-600">
                        {settings.currencySymbol || 'Rp'} {Number(item.costPerUnit).toLocaleString('id-ID')}
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}