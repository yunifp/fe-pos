import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Tag, Edit, Trash2 } from 'lucide-react-native';

interface CategoryCardProps {
    item: any;
    itemWidth: number;
    onEdit: (item: any) => void;
    onDelete: (id: number) => void;
}

export default function CategoryCard({ item, itemWidth, onEdit, onDelete }: CategoryCardProps) {
    return (
        <View style={{ width: `${itemWidth}%`, padding: 6 }}>
            <View className="bg-white p-3 rounded-2xl flex-row shadow-sm border border-slate-100 items-center">
                <View className="items-center justify-center w-11 h-11 mr-3 border border-orange-100 bg-orange-50 rounded-xl">
                    <Tag color="#F97316" size={18} />
                </View>

                <View className="justify-center flex-1 pr-2">
                    <Text className="text-sm font-black text-slate-800 leading-tight" numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-widest font-black">
                        Aktif
                    </Text>
                </View>

                <View className="flex-row gap-1.5">
                    <TouchableOpacity 
                        onPress={() => onEdit(item)} 
                        className="items-center justify-center border border-slate-200 w-8 h-8 bg-slate-50 rounded-lg active:bg-indigo-50"
                    >
                        <Edit size={14} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => onDelete(item.id)} 
                        className="items-center justify-center border border-red-100 w-8 h-8 bg-red-50 rounded-lg active:bg-red-100"
                    >
                        <Trash2 size={14} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}