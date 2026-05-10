import React from 'react';
import { View, Text } from 'react-native';

interface AttendanceLogCardProps {
    item: any;
    isLast: boolean;
}

export default function AttendanceLogCard({ item, isLast }: AttendanceLogCardProps) {
    return (
        <View className={`flex-row items-center justify-between px-4 py-3.5 ${!isLast ? 'border-b border-slate-50' : ''}`}>
            <View className="flex-row items-center flex-1 pr-4">
                <View className="items-center justify-center mr-3 bg-indigo-50 w-9 h-9 rounded-xl border border-indigo-100">
                    <Text className="text-xs font-black text-indigo-600 uppercase">
                        {item.user.fullName.charAt(0)}
                    </Text>
                </View>
                <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
                        {item.user.fullName}
                    </Text>
                    <Text className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter" numberOfLines={1}>
                        {item.user.branch.name} • {new Date(item.clockIn).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </Text>
                </View>
            </View>

            <View className="items-end min-w-[80px]">
                <Text className="text-sm font-black text-slate-800 tabular-nums">
                    {new Date(item.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <View className={`mt-0.5 px-2 py-0.5 rounded-md border ${item.status === 'LATE' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <Text className={`text-[8px] font-black uppercase ${item.status === 'LATE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {item.status === 'LATE' ? 'Late' : 'On-Time'}
                    </Text>
                </View>
            </View>
        </View>
    );
}