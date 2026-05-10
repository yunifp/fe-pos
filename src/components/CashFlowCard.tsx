import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TrendingUp, TrendingDown, Receipt, Edit3, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';

export default function CashFlowCard({ item, isLast, isAdmin, onEdit, onDelete }: any) {
    return (
        <View className={`flex-row items-center justify-between px-5 py-3.5 ${!isLast ? 'border-b border-slate-50' : ''}`}>
            <View className="flex-row items-center flex-1 mr-4">
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${item.type === 'INCOME' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    {item.type === 'INCOME' ? <TrendingUp size={18} color="#10b981" /> : <TrendingDown size={18} color="#f43f5e" />}
                </View>
                <View className="flex-1 ml-3">
                    <View className="flex-row items-center">
                        <Text className="mr-2 text-xs font-bold text-slate-800" numberOfLines={1}>{item.category}</Text>
                        {item.receiptUrl && <Receipt size={10} color="#10b981" />}
                    </View>
                    <Text className="text-[9px] text-slate-400 font-bold uppercase">
                        {format(new Date(item.date || item.createdAt || new Date()), 'dd MMM yy')} • {item.recorder?.fullName?.split(' ')[0] || 'Sistem'}
                    </Text>
                </View>
            </View>
            <View className="items-end mr-4">
                <Text className={`font-black text-xs ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.type === 'INCOME' ? '+' : '-'} {new Intl.NumberFormat('id-ID').format(item.amount)}
                </Text>
                <Text className="text-[8px] text-slate-300 font-bold uppercase mt-0.5">{item.branch?.name || 'Pusat'}</Text>
            </View>
            {isAdmin && (
                <View className="flex-row gap-1">
                    <TouchableOpacity onPress={onEdit} className="p-2 border rounded-lg bg-slate-50 border-slate-100 active:bg-indigo-50">
                        <Edit3 size={12} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDelete} className="p-2 border rounded-lg bg-rose-50 border-rose-100 active:bg-rose-100">
                        <Trash2 size={12} color="#f43f5e" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}