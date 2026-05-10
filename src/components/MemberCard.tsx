import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { User, Phone, Edit3, Trash2 } from 'lucide-react-native';
import { useSettingStore } from '../stores/settingStore';

interface MemberCardProps {
    item: any;
    itemWidth: number;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
}

export default function MemberCard({ item, itemWidth, onEdit, onDelete }: MemberCardProps) {
    const { settings } = useSettingStore();
    const primaryColor = settings.themePrimaryColor || '#4F46E5';

    return (
        <View style={{ width: `${itemWidth}%`, padding: 6 }}>
            <View className="bg-white p-4 rounded-2xl flex-row shadow-sm border border-slate-100 items-center justify-between">
                
                {/* Bagian Kiri: Info Member */}
                <View className="flex-row items-center flex-1 mr-3">
                    <View className="items-center justify-center w-11 h-11 bg-indigo-50 rounded-xl border border-indigo-100">
                        <User size={20} color={primaryColor} />
                    </View>
                    <View className="flex-1 ml-3">
                        <Text className="text-sm font-black text-slate-800" numberOfLines={1}>
                            {item.name}
                        </Text>
                        <View className="flex-row items-center mt-0.5">
                            <Phone size={10} color="#94A3B8" />
                            <Text className="ml-1 text-[10px] font-bold text-slate-400">
                                {item.phone}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Bagian Kanan: Poin dan Aksi */}
                <View className="flex-row items-center gap-1.5">
                    <View className="items-end mr-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        <Text className="text-xs font-black text-indigo-600 leading-tight">
                            {item.points || 0}
                        </Text>
                        <Text className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">
                            Pts
                        </Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => onEdit(item)} 
                        className="p-2 bg-slate-50 border border-slate-100 rounded-lg active:bg-indigo-50"
                    >
                        <Edit3 size={14} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => onDelete(item.id)} 
                        className="p-2 bg-rose-50 border border-rose-100 rounded-lg active:bg-rose-100"
                    >
                        <Trash2 size={14} color="#EF4444" />
                    </TouchableOpacity>
                </View>

            </View>
        </View>
    );
}