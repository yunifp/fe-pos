import React from 'react';
import { View, Text } from 'react-native';

interface EmptyStateProps {
    icon: React.ReactNode;
    message: string;
}

export default function EmptyState({ icon, message }: EmptyStateProps) {
    return (
        <View className="items-center justify-center mt-20 opacity-30">
            {icon}
            <Text className="mt-4 text-xs font-black uppercase text-slate-400">{message}</Text>
        </View>
    );
}