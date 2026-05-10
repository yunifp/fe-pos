import React from 'react';
import { View, Text } from 'react-native';

export default function Badge({ label, color, textColor }: any) {
    return (
        <View className={`${color} px-2.5 py-1 rounded-lg border border-slate-100/50`}>
            <Text className={`${textColor} text-[8px] font-black uppercase tracking-widest`}>{label}</Text>
        </View>
    );
}