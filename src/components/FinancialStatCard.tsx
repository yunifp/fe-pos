import React from 'react';
import { View, Text } from 'react-native';
import { useSettingStore } from '../stores/settingStore';

interface FinancialStatCardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    colorClass: string;
    icon: React.ReactNode;
    isLarge?: boolean;
}

export default function FinancialStatCard({ title, value, subtitle, colorClass, icon, isLarge = false }: FinancialStatCardProps) {
    const { settings } = useSettingStore();
    
    return (
        <View className={`bg-white p-4 lg:p-5 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden ${isLarge ? 'border-l-8 border-l-amber-500' : ''}`} style={{ minHeight: 110 }}>
            {/* Ikon Background Transparan */}
            <View className="absolute scale-[2.5] -right-2 -top-2 opacity-5 rotate-12">
                {icon}
            </View>
            
            <View className="flex-row items-center justify-between mb-3 z-10">
                <View className={`p-2.5 rounded-xl ${colorClass}`}>
                    {icon}
                </View>
                <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</Text>
            </View>
            
            <View className="z-10 mt-auto">
                <Text 
                    className={`${isLarge ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'} font-black text-slate-800 tabular-nums tracking-tight`} 
                    adjustsFontSizeToFit 
                    numberOfLines={1}
                >
                    {settings.currencySymbol} {Number(value || 0).toLocaleString('id-ID')}
                </Text>
                {subtitle && (
                    <Text className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter" numberOfLines={1}>
                        {subtitle}
                    </Text>
                )}
            </View>
        </View>
    );
}