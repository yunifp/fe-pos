import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    title: string;
    value: string;
    subtitle?: string;
    icon?: React.ReactNode;
    colors?: [string, string];
}

const StatCard: React.FC<Props> = ({ title, value, subtitle, icon, colors = ['#4F46E5', '#4338ca'] }) => {
    return (
        <View className="w-full p-2 md:w-1/3">
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-3xl p-0 shadow-lg shadow-blue-900/20 min-h-[150px] overflow-hidden relative"
            >
                {/* Dekorasi Background Circle */}
                <View className="absolute w-24 h-24 rounded-full -right-6 -top-6 bg-white/10 blur-xl" />
                <View className="absolute w-20 h-20 rounded-full -left-6 -bottom-6 bg-black/5 blur-lg" />

                <View className="justify-between flex-1 p-5">
                    <View className="flex-row items-start justify-between">
                        <View>
                            <Text className="mb-1 text-xs font-semibold tracking-widest uppercase text-white/70">{title}</Text>
                            <Text className="text-3xl font-bold text-white shadow-sm">{value}</Text>
                        </View>
                        <View className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm border border-white/10 shadow-sm">
                            {icon}
                        </View>
                    </View>

                    {(subtitle) && (
                        <View className="flex-row items-center self-start mt-4 space-x-2">
                            {subtitle && (
                                <View className="px-2 py-1 rounded-lg bg-black/10">
                                    <Text className="text-xs font-medium text-white/90">{subtitle}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </LinearGradient>
        </View>
    );
};

export default StatCard;