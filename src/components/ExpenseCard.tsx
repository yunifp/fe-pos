import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Receipt, ChevronRight } from 'lucide-react-native';
import moment from 'moment';
// @ts-ignore
import 'moment/locale/id';

moment.locale('id');

interface ExpenseCardProps {
    item: any;
    itemWidth: number;
    onPress: (item: any) => void;
}

export default function ExpenseCard({ item, itemWidth, onPress }: ExpenseCardProps) {
    return (
        <View style={{ width: `${itemWidth}%`, padding: 6 }}>
            <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => onPress(item)} 
                className="flex-row items-center p-4 bg-white border shadow-sm border-slate-100 rounded-2xl active:bg-slate-50"
            >
                <View className={`w-11 h-11 rounded-xl items-center justify-center ${item.receiptUrl ? 'bg-emerald-50' : 'bg-slate-50 border border-slate-100'}`}>
                    <Receipt size={18} color={item.receiptUrl ? '#10B981' : '#94A3B8'} />
                </View>
                <View className="flex-1 ml-3">
                    <Text className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                        {moment(item.date).format('DD MMM YYYY')}
                    </Text>
                    <Text className="text-sm font-black tracking-tight text-slate-900">
                        Rp {Number(item.amount).toLocaleString('id-ID')}
                    </Text>
                    <Text className="text-[9px] text-slate-500 font-bold uppercase" numberOfLines={1}>
                        {item.description}
                    </Text>
                </View>
                <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>
        </View>
    );
}