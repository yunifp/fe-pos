import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Edit, Trash2, Ticket, Layers, Tag } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';

interface PromotionCardProps {
    item: any;
    itemWidth: number;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
}

export default function PromotionCard({ item, itemWidth, onEdit, onDelete }: PromotionCardProps) {
    const { settings } = useSettingStore();

    // Dinamis menentukan Ikon, Label, dan Warna berdasarkan tipe Promo
    const config = (() => {
        switch (item.type) {
            case 'TRANSACTION': return { label: 'BILL', color: '#F97316', bg: 'bg-orange-50', icon: Ticket };
            case 'BUNDLE': return { label: 'BUNDLE', color: '#10B981', bg: 'bg-emerald-50', icon: Layers };
            default: return { label: 'PRODUK', color: '#6366F1', bg: 'bg-indigo-50', icon: Tag };
        }
    })();

    return (
        <View style={{ width: `${itemWidth}%`, padding: 6 }}>
            <View className="flex-row overflow-hidden bg-white border border-slate-100 shadow-sm rounded-2xl h-24">
                
                {/* --- Sisi Kiri (Ikon & Label) --- */}
                <View className={`w-16 justify-center items-center ${config.bg}`}>
                    <config.icon size={20} color={config.color} />
                    <Text className="text-[7px] font-black mt-1" style={{ color: config.color }}>
                        {config.label}
                    </Text>
                </View>
                
                {/* --- Garis Putus-putus Pemisah --- */}
                <View className="w-[1px] bg-slate-100 my-2 border-l border-dashed border-slate-200" />
                
                {/* --- Sisi Kanan (Detail Promo) --- */}
                <View className="flex-1 p-3 justify-center">
                    <Text className="text-xs font-black text-slate-800" numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text className="text-[9px] font-bold text-slate-400 uppercase mb-1">
                        {item.code}
                    </Text>
                    
                    <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-black" style={{ color: config.color }}>
                            {item.discountPct 
                                ? `${item.discountPct}% OFF` 
                                : `${settings.currencySymbol}${item.discountAmt / 1000}K`}
                        </Text>
                        <View className="flex-row gap-1">
                            <TouchableOpacity 
                                onPress={() => onEdit(item)} 
                                className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 active:bg-indigo-50"
                            >
                                <Edit size={12} color="#64748B" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => onDelete(item.id)} 
                                className="p-1.5 bg-rose-50 rounded-lg border border-rose-100 active:bg-rose-100"
                            >
                                <Trash2 size={12} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

            </View>
        </View>
    );
}